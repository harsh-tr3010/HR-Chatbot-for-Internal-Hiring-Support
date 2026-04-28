import os
import re
import random
import json
import PyPDF2
import asyncio
import datetime
from groq import Groq
from database import job_openings_collection, candidates_collection, hiring_requests_collection, chat_history_collection
from dotenv import load_dotenv

load_dotenv()
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

sessions = {}

# --- GLOBALLY DEFINED BACKGROUND EMAIL FUNCTION ---
async def send_hr_email_notification(candidate_name, role, current_status):
    await asyncio.sleep(1)
    print("\n" + "="*50)
    print(f"📧 EMAIL SENT TO: hr-team@company.com")
    print(f"Subject: New Application - {candidate_name} for {role}")
    print(f"Body: A new candidate has applied. Screening status: {current_status}. Please check the admin dashboard.")
    print("="*50 + "\n")

def get_intent(user_message: str) -> str:
    prompt = f"""
    Classify the following user message into EXACTLY ONE of these intents:
    - apply_job (User wants to apply for a job)
    - view_jobs (User wants to see open positions)
    - raise_hiring_request (Hiring manager requesting new hire)
    - check_status (User wants to check their job application status)
    - hr_admin_queries (HR asking to show shortlisted, rejected, awaiting interview, or pending requests)
    - hr_find_candidate (HR asking to show candidate details or summary by email/phone)
    - hr_update_status (HR asking to change, update, or manage a candidate's status)
    - hr_generate_jd (HR asking to generate a job description)
    - general_faq (Asking about hiring process, documents required, response time)
    
    Message: "{user_message}"
    Output ONLY the intent name.
    """
    completion = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )
    return completion.choices[0].message.content.strip().lower()

def is_valid_email(email):
    return re.match(r"[^@]+@[^@]+\.[^@]+", email)

def is_valid_phone(phone):
    clean = re.sub(r'\D', '', phone)
    return len(clean) >= 10

def is_numeric(val):
    try:
        float(val)
        return True
    except ValueError:
        return False

async def evaluate_candidate(data: dict):
    job = await job_openings_collection.find_one({"title": {"$regex": data['preferred_role'], "$options": "i"}})
    if not job:
        return "Role not found in active database, but profile saved.", "Pending Review"

    # 1. EXPERIENCE CHECK 
    job_exp_str = str(job.get("experience_required", "0"))
    nums = re.findall(r'\d+\.?\d*', job_exp_str)
    req_exp_min = float(nums[0]) if nums else 0.0
    req_exp_max = float(nums[1]) if len(nums) > 1 else 99.0
    
    cand_exp_str = str(data.get("total_experience", "0"))
    cand_nums = re.findall(r'\d+\.?\d*', cand_exp_str)
    cand_exp = float(cand_nums[0]) if cand_nums else 0.0

    exp_match = (req_exp_min <= cand_exp <= req_exp_max) or (len(nums) == 1 and cand_exp >= req_exp_min)

    # 2. SKILL CHECK (Requires at least 2 matching skills)
    req_skills = [s.lower() for s in job.get("skills_required", [])]
    cand_skills = [s.strip().lower() for s in data.get("skills", "").split(",")]
    matched_skills = [s for s in cand_skills if any(req in s or s in req for req in req_skills)]
    skill_match = len(matched_skills) >= 2

    # 3. LOCATION CHECK
    job_loc = job.get("location", "").lower()
    cand_loc = data.get("location", "").lower()
    loc_match = (job_loc in cand_loc) or (cand_loc in job_loc) or ('remote' in job_loc) or ('any' in job_loc)

    # --- FINAL DECISION MATRIX ---
    if exp_match and skill_match and loc_match:
        status = "Shortlisted for next step"
    elif not exp_match:
        status = "Not suitable based on required experience"
    elif not skill_match:
        status = "Missing required skills (minimum 2 needed)"
    else:
        status = "Not suitable based on location"

    summary = f"""
    **Candidate Summary**
    • Name: {data.get('full_name', 'N/A')}
    • Role Applied: {data.get('preferred_role', 'N/A')}
    • Experience: {cand_exp} years
    • Skills Matched: {len(matched_skills)}
    • Location Match: {'Yes' if loc_match else 'No'}
    • Screening Status: **{status}**
    """
    return summary, status

async def process_message(session_id: str, message: str, user_role: str = "Candidate") -> str:
    if session_id not in sessions:
        sessions[session_id] = {"intent": None, "step": None, "data": {}}
    
    session = sessions[session_id]
    
    # --- 1. DETERMINE INTENT ---
    if not session["intent"]:
        intent = get_intent(message)
        
        if intent == "view_jobs":
            jobs_cursor = job_openings_collection.find({})
            all_jobs = await jobs_cursor.to_list(length=50)
            if not all_jobs: return "There are currently no job openings."
            
            # HR ADMIN VIEW
            if user_role == "HR Admin":
                res = "🗂️ **Active Job Requisitions (Internal DB)**\n\n"
                for j in all_jobs:
                    res += f"🔹 **{j['title']}** ({j['department']})\n"
                    res += f"   📍 Loc: {j['location']} | 🎓 Exp: {j['experience_required']}+ yrs\n"
                    res += f"   🛠️ Skills Req: {', '.join(j['skills_required'])}\n"
                    res += "   ━━━━━━━━━━━━━━━━━━━━\n"
                res += "\n💡 *Tip: You can ask me to generate a new job description for any of these roles.*"
                return res
            # CANDIDATE VIEW
            else:
                display_jobs = random.sample(all_jobs, min(5, len(all_jobs)))
                res = "Here are some of our **Top Open Roles** right now! 🌟\n\n"
                for j in display_jobs:
                    res += f"💼 **{j['title']}**\n"
                    res += f"🏢 *{j['department']}* | 📍 {j['location']}\n"
                    res += f"🎓 **Exp:** {j['experience_required']}+ years | ⏳ **Type:** {j.get('employment_type', 'Full-time')}\n"
                    res += f"🛠️ **Skills:** {', '.join(j['skills_required'])}\n"
                    res += f"📝 *{j.get('description', 'Join our amazing team!')}*\n"
                    res += "━━━━━━━━━━━━━━━━━━━━━━\n\n"
                res += "Ready? Reply with **'I want to apply for a job'** to start your application! 🚀"
                return res

        elif intent == "apply_job":
            session["intent"] = "apply_job"
            session["step"] = "ask_role"
            return "Sure. Which role are you interested in?"
            
        elif intent == "raise_hiring_request":
            session["intent"] = "raise_hiring_request"
            session["step"] = "ask_dept"
            return "I can help with that. Please enter the department name."
            
        elif intent == "check_status":
            session["intent"] = "check_status"
            session["step"] = "ask_email"
            return "I can help you check your application status! 📋 Please enter your registered **Email ID**."

        elif intent == "hr_admin_queries":
            msg_lower = message.lower()
            if "shortlisted" in msg_lower:
                cands = await candidates_collection.find({"screening_status": "Shortlisted for next step"}).to_list(10)
                if not cands: return "No shortlisted candidates found."
                return "✅ **Shortlisted Candidates:**\n" + "\n".join([f"• {c['full_name']} - {c['preferred_role']} ({c['email']})" for c in cands])
            elif "rejected" in msg_lower or "not suitable" in msg_lower:
                cands = await candidates_collection.find({"screening_status": {"$regex": "Not suitable|Missing"}}).to_list(10)
                if not cands: return "No rejected candidates found."
                return "❌ **Rejected Candidates:**\n" + "\n".join([f"• {c['full_name']} - {c['preferred_role']} ({c['email']})" for c in cands])
            elif "awaiting" in msg_lower or "interview" in msg_lower:
                cands = await candidates_collection.find({"screening_status": {"$regex": "interview|Awaiting", "$options": "i"}}).to_list(10)
                if not cands: return "No candidates currently awaiting an interview."
                return "⏳ **Awaiting Interview:**\n" + "\n".join([f"• {c['full_name']} - {c['preferred_role']} ({c['email']})" for c in cands])
            elif "pending" in msg_lower or "request" in msg_lower:
                reqs = await hiring_requests_collection.find({}).to_list(10)
                if not reqs: return "No pending hiring requests."
                return "📝 **Pending Hiring Requests:**\n" + "\n".join([f"• **{r['role_required']}** ({r['department']}) - {r['positions']} positions" for r in reqs])
            else:
                return "Please specify what you'd like to see: Shortlisted, Rejected, Awaiting Interview, or Pending Requests."

        elif intent == "hr_find_candidate":
            session["intent"] = "hr_find_candidate"
            session["step"] = "ask_identifier"
            return "Please provide the candidate's **Email ID** or **Phone Number**."

        elif intent == "hr_update_status":
            session["intent"] = "hr_update_status"
            session["step"] = "ask_identifier"
            return "I can help update a candidate's status. Please provide the candidate's **Email ID** or **Phone Number**."
            
        elif intent == "hr_generate_jd":
            session["intent"] = "hr_generate_jd"
            session["step"] = "ask_role"
            return "I can help you generate a Job Description. What is the **Job Title**?"

        else: 
            sys_prompt = "You are an internal HR Assistant. Answer questions about the hiring process, documents required (ID, Resume, Certificates), or expected response time (usually 3-5 business days). Keep it brief and professional."
            comp = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "system", "content": sys_prompt}, {"role": "user", "content": message}]
            )
            return comp.choices[0].message.content

    # --- 2. CANDIDATE FLOW (WITH AI RESUME PARSING) ---
    if session["intent"] == "apply_job":
        step = session["step"]
        if step == "ask_role":
            session["data"]["preferred_role"] = message
            session["step"] = "ask_autofill"
            return "Great choice! 📄 **Would you like to autofill your application using your resume?**\n\nClick the 📎 icon below to upload a PDF, or type **'No'** to fill out the form manually."
            
        elif step == "ask_autofill":
            if "uploads/" in message and message.endswith(".pdf"):
                try:
                    with open(message, 'rb') as f:
                        reader = PyPDF2.PdfReader(f)
                        text = "".join([page.extract_text() for page in reader.pages if page.extract_text()])
                    
                    sys_prompt = """You are an expert HR resume parser. Extract the following details from the text and return ONLY a valid JSON object.
                    Required keys: 
                    - 'full_name' (string)
                    - 'email' (string)
                    - 'phone' (string)
                    - 'location' (string)
                    - 'skills' (comma separated string)
                    - 'experiences' (list of objects with 'start' and 'end' keys strictly in 'YYYY-MM' format. If currently working there, set 'end' to 'Present')."""
                    
                    comp = groq_client.chat.completions.create(
                        model="llama-3.1-8b-instant",
                        messages=[
                            {"role": "system", "content": sys_prompt}, 
                            {"role": "user", "content": f"Resume Text:\n{text[:3500]}"}
                        ],
                        response_format={"type": "json_object"}
                    )
                    
                    parsed_data = json.loads(comp.choices[0].message.content)
                    
                    # PRECISE PYTHON EXPERIENCE CALCULATION
                    total_months = 0
                    current_date = datetime.datetime.now()
                    
                    for exp in parsed_data.get("experiences", []):
                        try:
                            start_str = exp.get("start", "")
                            end_str = exp.get("end", "")
                            
                            start_date = datetime.datetime.strptime(start_str, "%Y-%m")
                            
                            if end_str.lower() == "present":
                                end_date = current_date
                            else:
                                end_date = datetime.datetime.strptime(end_str, "%Y-%m")
                                
                            months = (end_date.year - start_date.year) * 12 + (end_date.month - start_date.month)
                            if months > 0:
                                total_months += months
                        except Exception as e:
                            print(f"Date parsing skipped for: {exp} - Error: {e}")
                            continue
                            
                    calculated_years = round(total_months / 12.0, 1)
                    
                    session["data"].update(parsed_data)
                    session["data"]["total_experience"] = str(calculated_years)
                    session["data"]["resume_link"] = message
                    session["step"] = "ask_current_ctc"
                    
                    return f"✅ **Resume Parsed Successfully!**\n\n👤 Name: {session['data'].get('full_name')}\n📧 Email: {session['data'].get('email')}\n📍 Location: {session['data'].get('location')}\n🎓 Exp: **{calculated_years} yrs** ({total_months} months accurately computed!)\n🛠️ Skills: {session['data'].get('skills')}\n\nJust two more questions! What is your **Current CTC**? (Enter a number)"
                    
                except Exception as e:
                    print("Parse error:", e)
                    session["step"] = "ask_name"
                    return "Sorry, I couldn't read that PDF. Let's do it manually. Please share your **Full Name**."
            else:
                session["step"] = "ask_name"
                return "No problem! Let's do it manually. Please share your **Full Name**."

        # MANUAL FALLBACK FLOW
        elif step == "ask_name":
            session["data"]["full_name"] = message
            session["step"] = "ask_email"
            return f"Thanks {message}. Please share your email ID."
        elif step == "ask_email":
            if not is_valid_email(message): return "Please provide a valid email format."
            session["data"]["email"] = message
            session["step"] = "ask_phone"
            return "Please share your phone number."
        elif step == "ask_phone":
            if not is_valid_phone(message): return "Please provide a valid phone number (at least 10 digits)."
            session["data"]["phone"] = message
            session["step"] = "ask_location"
            return "What is your current location?"
        elif step == "ask_location":
            session["data"]["location"] = message
            session["step"] = "ask_qualification"
            return "What is your highest qualification?"
        elif step == "ask_qualification":
            session["data"]["highest_qualification"] = message
            session["step"] = "ask_total_exp"
            return "How many years of total experience do you have? (Enter a number)"
        elif step == "ask_total_exp":
            if not is_numeric(message): return "Experience must be a numeric value."
            session["data"]["total_experience"] = message
            session["step"] = "ask_relevant_exp"
            return "How many years of relevant experience do you have for this role?"
        elif step == "ask_relevant_exp":
            if not is_numeric(message): return "Must be a numeric value."
            session["data"]["relevant_experience"] = message
            session["step"] = "ask_skills"
            return "Please list your key skills (separated by commas)."
        elif step == "ask_skills":
            session["data"]["skills"] = message
            session["step"] = "ask_current_ctc"
            return "What is your current CTC? (Enter a number)"
        
        elif step == "ask_current_ctc":
            if not is_numeric(message.replace(',','')): return "CTC must be numeric."
            session["data"]["current_ctc"] = message
            session["step"] = "ask_expected_ctc"
            return "What is your expected CTC?"
        elif step == "ask_expected_ctc":
            if not is_numeric(message.replace(',','')): return "CTC must be numeric."
            session["data"]["expected_ctc"] = message
            session["step"] = "ask_notice_period"
            return "What is your notice period (in days)?"
        elif step == "ask_notice_period":
            session["data"]["notice_period"] = message
            
            # Check if resume was autofilled
            if "resume_link" in session["data"]:
                summary, status = await evaluate_candidate(session["data"])
                session["data"]["screening_status"] = status
                await candidates_collection.insert_one(session["data"])
                
                asyncio.create_task(send_hr_email_notification(session["data"].get("full_name"), session["data"].get("preferred_role"), status))
                sessions[session_id] = {"intent": None, "step": None, "data": {}}
                
                return f"Thank you. Based on your profile, you are **{status}**. Your application has been successfully saved.\n\n{summary}"
            else:
                session["step"] = "ask_resume"
                return "Finally, please provide a link to your resume, or click the attachment (📎) icon below to upload a PDF."
                
        elif step == "ask_resume":
            session["data"]["resume_link"] = message
            summary, status = await evaluate_candidate(session["data"])
            session["data"]["screening_status"] = status
            
            await candidates_collection.insert_one(session["data"])
            asyncio.create_task(send_hr_email_notification(session["data"].get("full_name"), session["data"].get("preferred_role"), status))
            sessions[session_id] = {"intent": None, "step": None, "data": {}}
            
            return f"Thank you. Based on your profile, you are **{status}**. Your application has been successfully saved.\n\n{summary}"

    # --- 3. HIRING MANAGER FLOW ---
    if session["intent"] == "raise_hiring_request":
        step = session["step"]
        if step == "ask_dept":
            session["data"]["department"] = message
            session["step"] = "ask_role"
            return "What role do you want to hire for?"
        elif step == "ask_role":
            session["data"]["role_required"] = message
            session["step"] = "ask_positions"
            return "How many positions are required?"
        elif step == "ask_positions":
            if not is_numeric(message): return "Please enter a valid number."
            session["data"]["positions"] = int(message)
            session["step"] = "ask_exp"
            return "What is the required experience (in years)?"
        elif step == "ask_exp":
            session["data"]["required_experience"] = message
            session["step"] = "ask_skills"
            return "What skills are required? (Comma separated)"
        elif step == "ask_skills":
            session["data"]["required_skills"] = message
            session["step"] = "ask_location"
            return "What is the job location?"
        elif step == "ask_location":
            session["data"]["job_location"] = message
            session["step"] = "ask_budget"
            return "What is the budget range for this role?"
        elif step == "ask_budget":
            session["data"]["budget"] = message
            session["step"] = "ask_manager"
            return "Who is the reporting manager?"
        elif step == "ask_manager":
            session["data"]["reporting_manager"] = message
            session["step"] = "ask_urgency"
            return "What is the urgency level? (e.g., High, Medium, Low)"
        elif step == "ask_urgency":
            session["data"]["urgency"] = message
            session["step"] = "ask_reason"
            return "What is the reason for hiring?"
        elif step == "ask_reason":
            session["data"]["reason"] = message
            session["step"] = "ask_replacement"
            return "Is this a replacement or a new position?"
        elif step == "ask_replacement":
            session["data"]["position_type"] = message
            
            await hiring_requests_collection.insert_one(session["data"])
            
            summary = f"""
            **Hiring Request Summary**
            • Department: {session['data']['department']}
            • Role Required: {session['data']['role_required']}
            • Number of Openings: {session['data']['positions']}
            • Required Skills: {session['data']['required_skills']}
            • Budget: {session['data']['budget']}
            • Urgency: {session['data']['urgency']}
            • Submitted By: {session['data']['reporting_manager']}
            """
            sessions[session_id] = {"intent": None, "step": None, "data": {}}
            return f"Your hiring request has been created successfully.\n\n{summary}"

    # --- 4. CHECK STATUS FLOW ---
    if session["intent"] == "check_status":
        step = session["step"]
        if step == "ask_email":
            if not is_valid_email(message): return "Please provide a valid email format."
            session["data"]["email"] = message
            session["step"] = "ask_phone"
            return "Got it. Now, please enter your registered **Phone Number** to verify your identity."
            
        elif step == "ask_phone":
            if not is_valid_phone(message): return "Please provide a valid phone number."
            session["data"]["phone"] = message
            
            profile_query = {"email": session["data"]["email"], "phone": session["data"]["phone"]}
            applications = await candidates_collection.find(profile_query).to_list(length=10)
            
            past_sessions = await chat_history_collection.find({
                "message": session["data"]["email"],
                "user_role": "Candidate"
            }).to_list(length=50)
            
            past_session_ids = list(set([s["session_id"] for s in past_sessions]))
            past_session_ids.append(session_id)
            
            recent_chats = await chat_history_collection.find(
                {"session_id": {"$in": past_session_ids}}
            ).sort("timestamp", -1).to_list(length=8)
            recent_chats.reverse()
            
            sessions[session_id] = {"intent": None, "step": None, "data": {}}
            
            if applications:
                name = applications[0].get("full_name", "Candidate")
                res = f"**Identity Verified! Welcome back, {name}** 🎉\n\n"
                
                res += "📋 **YOUR APPLICATIONS:**\n"
                for idx, app in enumerate(applications, 1):
                    role = app.get("preferred_role", "Unknown Role")
                    status = app.get("screening_status", "Pending HR Review")
                    res += f"**{idx}. 💼 Role:** {role} | 📊 **Status:** {status}\n"
                
                res += "\n━━━━━━━━━━━━━━━━━━━━\n"
                res += "📜 **YOUR RECENT CHAT HISTORY:**\n"
                if recent_chats:
                    for chat in recent_chats:
                        role_icon = "👤" if chat['role'] == 'user' else "🤖"
                        msg_text = chat['message'].replace('\n', ' ') 
                        short_msg = msg_text[:65] + "..." if len(msg_text) > 65 else msg_text
                        res += f"{role_icon} *{short_msg}*\n"
                else:
                    res += "*No previous chat history found.*\n"
                    
                res += "\nOur team will contact you soon regarding the next steps!"
                return res
            else:
                return "❌ **Verification Failed.** I couldn't find any applications matching that Email and Phone Number."

    # --- 5. HR FIND CANDIDATE / SUMMARY FLOW ---
    if session["intent"] == "hr_find_candidate":
        step = session["step"]
        if step == "ask_identifier":
            session["data"]["identifier"] = message
            cand = await candidates_collection.find_one({
                "$or": [{"email": message}, {"phone": message}]
            })
            sessions[session_id] = {"intent": None, "step": None, "data": {}}
            if cand:
                return f"**Candidate Details & Summary** 📄\n\n👤 **Name:** {cand.get('full_name')}\n📧 **Email:** {cand.get('email')}\n📞 **Phone:** {cand.get('phone')}\n📍 **Location:** {cand.get('location')}\n💼 **Role Applied:** {cand.get('preferred_role')}\n🎓 **Exp:** {cand.get('total_experience')} yrs\n🛠️ **Skills:** {cand.get('skills')}\n💰 **Expected CTC:** {cand.get('expected_ctc')}\n📊 **Screening Status:** **{cand.get('screening_status')}**\n🔗 **Resume:** {cand.get('resume_link')}"
            else:
                return "❌ No candidate found with that email or phone number."

    # --- 6. HR GENERATE JOB DESCRIPTION FLOW ---
    if session["intent"] == "hr_generate_jd":
        step = session["step"]
        if step == "ask_role":
            session["data"]["jd_role"] = message
            session["step"] = "ask_skills"
            return "What are the key skills required for this role?"
        elif step == "ask_skills":
            session["data"]["jd_skills"] = message
            session["step"] = "ask_exp"
            return "What is the required experience level (in years)?"
        elif step == "ask_exp":
            prompt = f"Generate a highly professional, engaging, and concise Job Description for a '{session['data']['jd_role']}'. Required Skills: {session['data']['jd_skills']}. Required Experience: {message} years. Include brief sections for Responsibilities and Requirements. Do not make it overly long."
            comp = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "system", "content": "You are an expert HR copywriter."}, {"role": "user", "content": prompt}]
            )
            sessions[session_id] = {"intent": None, "step": None, "data": {}}
            return f"**Here is your AI-Generated Job Description:** ✨\n\n{comp.choices[0].message.content}"

    # --- 7. HR UPDATE CANDIDATE STATUS FLOW ---
    if session["intent"] == "hr_update_status":
        step = session["step"]
        if step == "ask_identifier":
            cand = await candidates_collection.find_one({
                "$or": [{"email": message}, {"phone": message}]
            })
            if cand:
                session["data"]["target_email"] = cand["email"]
                session["step"] = "ask_new_status"
                return f"✅ Candidate found: **{cand['full_name']}**\n📊 Current Status: *{cand.get('screening_status', 'Pending')}*\n\nWhat should their **New Status** be? (e.g., 'Awaiting Interview', 'Hired', 'Rejected')"
            else:
                sessions[session_id] = {"intent": None, "step": None, "data": {}}
                return "❌ No candidate found with that email or phone number. Please try again."
                
        elif step == "ask_new_status":
            new_status = message
            target_email = session["data"]["target_email"]
            await candidates_collection.update_many(
                {"email": target_email},
                {"$set": {"screening_status": new_status}}
            )
            sessions[session_id] = {"intent": None, "step": None, "data": {}}
            return f"🔄 Success! The status for **{target_email}** has been updated to **{new_status}**."

    return "I didn't quite understand. You can ask to view jobs, apply for a job, raise a hiring request, or check shortlisted candidates."