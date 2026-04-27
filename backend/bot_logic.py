import os
from groq import Groq
from database import job_openings_collection, candidates_collection, hiring_requests_collection
from dotenv import load_dotenv

load_dotenv()
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))


sessions = {}

def get_intent(user_message: str) -> str:import os
import re
from groq import Groq
from database import job_openings_collection, candidates_collection, hiring_requests_collection
from dotenv import load_dotenv

load_dotenv()
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

sessions = {}

def get_intent(user_message: str) -> str:
    prompt = f"""
    Classify the following user message into EXACTLY ONE of these intents:
    - apply_job (User wants to apply for a job)
    - view_jobs (User wants to see open positions)
    - raise_hiring_request (Hiring manager requesting new hire)
    - hr_admin_action (HR asking to show shortlisted/rejected candidates, or pending requests)
    - general_faq (Asking about hiring process, documents required, response time, application status)
    
    Message: "{user_message}"
    Output ONLY the intent name.
    """
    completion = groq_client.chat.completions.create(
        model="llama3-8b-8192",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )
    return completion.choices[0].message.content.strip().lower()

# --- VALIDATION HELPERS ---
def is_valid_email(email):
    return re.match(r"[^@]+@[^@]+\.[^@]+", email)

def is_valid_phone(phone):
    # Strip spaces/dashes and check length
    clean = re.sub(r'\D', '', phone)
    return len(clean) >= 10

def is_numeric(val):
    try:
        float(val)
        return True
    except ValueError:
        return False

# --- SCREENING LOGIC ---
async def evaluate_candidate(data: dict):
    # Fetch job safely
    job = await job_openings_collection.find_one({"title": {"$regex": data['preferred_role'], "$options": "i"}})
    if not job:
        return "Role not found in active database, but profile saved.", "Pending Review"

    req_exp = float(job["experience_required"])
    cand_exp = float(data["total_experience"])
    req_skills = [s.lower() for s in job["skills_required"]]
    cand_skills = [s.strip().lower() for s in data["skills"].split(",")]

    # Skill match percentage
    matched_skills = [s for s in cand_skills if any(req in s or s in req for req in req_skills)]
    skill_match_percent = len(matched_skills) / len(req_skills) if req_skills else 1.0

    # Logic from requirements
    if cand_exp >= req_exp and skill_match_percent >= 0.6:
        status = "Shortlisted for next step" # Or "Eligible for HR review"
    elif cand_exp < req_exp:
        status = "Not suitable based on required experience"
    else:
        status = "Missing required skills"

    summary = f"""
    **Candidate Summary**
    • Name: {data['full_name']}
    • Role Applied: {data['preferred_role']}
    • Experience: {data['total_experience']} years
    • Skills: {data['skills']}
    • Expected CTC: {data['expected_ctc']}
    • Notice Period: {data['notice_period']}
    • Screening Status: **{status}**
    """
    return summary, status

async def process_message(session_id: str, message: str) -> str:
    if session_id not in sessions:
        sessions[session_id] = {"intent": None, "step": None, "data": {}}
    
    session = sessions[session_id]

    # --- 1. DETERMINE INTENT ---
    if not session["intent"]:
        intent = get_intent(message)
        
        if intent == "view_jobs":
            jobs_cursor = job_openings_collection.find({})
            jobs = await jobs_cursor.to_list(length=20)
            if not jobs: return "There are currently no job openings."
            res = "Here are the current job openings:\n"
            for j in jobs:
                res += f"• **{j['title']}** ({j['department']}) | {j['location']} | Exp: {j['experience_required']} yrs | Skills: {', '.join(j['skills_required'])}\n"
            return res

        elif intent == "apply_job":
            session["intent"] = "apply_job"
            session["step"] = "ask_role"
            return "Sure. Which role are you interested in?"
            
        elif intent == "raise_hiring_request":
            session["intent"] = "raise_hiring_request"
            session["step"] = "ask_dept"
            return "I can help with that. Please enter the department name."

        elif intent == "hr_admin_action":
            msg_lower = message.lower()
            if "shortlisted" in msg_lower:
                cands = await candidates_collection.find({"screening_status": "Shortlisted for next step"}).to_list(10)
                if not cands: return "No shortlisted candidates found."
                return "Shortlisted Candidates:\n" + "\n".join([f"• {c['full_name']} - {c['preferred_role']}" for c in cands])
            elif "rejected" in msg_lower or "not suitable" in msg_lower:
                cands = await candidates_collection.find({"screening_status": {"$regex": "Not suitable|Missing"}}).to_list(10)
                if not cands: return "No rejected candidates found."
                return "Rejected Candidates:\n" + "\n".join([f"• {c['full_name']} - {c['preferred_role']}" for c in cands])
            elif "pending" in msg_lower or "request" in msg_lower:
                reqs = await hiring_requests_collection.find({}).to_list(10)
                if not reqs: return "No pending hiring requests."
                return "Pending Requests:\n" + "\n".join([f"• {r['role_required']} ({r['department']}) - {r['positions']} positions" for r in reqs])
            else:
                return "I am your HR Admin Assistant. You can ask me to show shortlisted candidates, rejected candidates, or pending hiring requests."

        else: # general_faq
            sys_prompt = "You are an internal HR Assistant. Answer questions about the hiring process, documents required (ID, Resume, Certificates), or expected response time (usually 3-5 business days). Keep it brief and professional."
            comp = groq_client.chat.completions.create(
                model="llama3-8b-8192",
                messages=[{"role": "system", "content": sys_prompt}, {"role": "user", "content": message}]
            )
            return comp.choices[0].message.content

    # --- 2. CANDIDATE FLOW (Step-by-step) ---
    if session["intent"] == "apply_job":
        step = session["step"]
        if step == "ask_role":
            session["data"]["preferred_role"] = message
            session["step"] = "ask_name"
            return "Great. Please share your full name."
        elif step == "ask_name":
            session["data"]["full_name"] = message
            session["step"] = "ask_email"
            return f"Thanks {message}. Please share your email ID."
        elif step == "ask_email":
            if not is_valid_email(message): return "Please provide a valid email format (e.g., name@domain.com)."
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
            if not is_numeric(message): return "Experience must be a numeric value. Please try again."
            session["data"]["total_experience"] = message
            session["step"] = "ask_relevant_exp"
            return "How many years of relevant experience do you have for this role?"
        elif step == "ask_relevant_exp":
            if not is_numeric(message): return "Must be a numeric value. Please try again."
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
            session["step"] = "ask_resume"
            return "Finally, please provide a link to your resume."
        elif step == "ask_resume":
            session["data"]["resume_link"] = message
            
            # Execute Screening
            summary, status = await evaluate_candidate(session["data"])
            session["data"]["screening_status"] = status
            
            # Save to DB
            await candidates_collection.insert_one(session["data"])
            
            sessions[session_id] = {"intent": None, "step": None, "data": {}}
            return f"Thank you. Based on your profile, you are **{status}**. Your application has been submitted successfully.\n\n{summary}"

    # --- 3. HIRING MANAGER FLOW (Step-by-step) ---
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
            
            # Save to DB
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

    return "I didn't quite understand. You can ask to view jobs, apply for a job, raise a hiring request, or check shortlisted candidates."
    prompt = f"""
    Classify the following user message into EXACTLY ONE of these intents:
    - apply_job
    - view_jobs
    - raise_hiring_request
    - general_faq
    
    Message: "{user_message}"
    Output ONLY the intent name. Do not add any other text.
    """
    completion = groq_client.chat.completions.create(
        model="llama3-8b-8192",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )
    return completion.choices[0].message.content.strip().lower()

async def evaluate_candidate(candidate_data: dict):
    job = await job_openings_collection.find_one({"title": {"$regex": candidate_data['role'], "$options": "i"}})
    if not job:
        return "Role not found, but we saved your profile.", "Pending"

    req_exp = float(job["experience_required"])
    cand_exp = float(candidate_data["experience"])
    req_skills = [s.lower() for s in job["skills_required"]]
    cand_skills = [s.strip().lower() for s in candidate_data["skills"].split(",")]

    matched_skills = [s for s in cand_skills if any(req in s or s in req for req in req_skills)]
    skill_match_percent = len(matched_skills) / len(req_skills) if req_skills else 1.0

    if cand_exp >= req_exp and skill_match_percent >= 0.6:
        status = "Eligible for HR review"
    elif cand_exp < req_exp:
        status = "Not suitable based on required experience"
    else:
        status = "Missing required skills"

    summary = f"""
    **Candidate Summary**
    • Name: {candidate_data['name']}
    • Role Applied: {candidate_data['role']}
    • Experience: {candidate_data['experience']} years
    • Skills: {candidate_data['skills']}
    • Screening Status: {status}
    """
    return summary, status

async def process_message(session_id: str, message: str) -> str:
    if session_id not in sessions:
        sessions[session_id] = {"intent": None, "step": None, "data": {}}
    
    session = sessions[session_id]

    
    if not session["intent"]:
        intent = get_intent(message)
        
        if intent == "view_jobs":
            jobs_cursor = job_openings_collection.find({})
            jobs = await jobs_cursor.to_list(length=10)
            if not jobs: return "There are currently no job openings."
            response = "Here are the open roles:\n"
            for j in jobs:
                response += f"• **{j['title']}** | Exp: {j['experience_required']} yrs | Skills: {', '.join(j['skills_required'])}\n"
            return response

        elif intent == "apply_job":
            session["intent"] = "apply_job"
            session["step"] = "ask_role"
            return "Sure. Which role are you interested in?"
            
        elif intent == "raise_hiring_request":
            session["intent"] = "raise_hiring_request"
            session["step"] = "ask_dept"
            return "Please enter the department name for the new hire."

        else:
            comp = groq_client.chat.completions.create(
                model="llama3-8b-8192",
                messages=[{"role": "system", "content": "You are an HR assistant. Answer briefly."}, {"role": "user", "content": message}]
            )
            return comp.choices[0].message.content

    
    if session["intent"] == "apply_job":
        if session["step"] == "ask_role":
            session["data"]["role"] = message
            session["step"] = "ask_name"
            return "Great. Please share your full name."
        elif session["step"] == "ask_name":
            session["data"]["name"] = message
            session["step"] = "ask_email"
            return "Thanks. Please share your email ID."
        elif session["step"] == "ask_email":
            if "@" not in message or "." not in message:
                return "Please provide a valid email format."
            session["data"]["email"] = message
            session["step"] = "ask_experience"
            return "How many years of experience do you have? (Enter a number)"
        elif session["step"] == "ask_experience":
            if not message.replace('.','',1).isdigit():
                return "Experience must be a numeric value. Try again."
            session["data"]["experience"] = message
            session["step"] = "ask_skills"
            return "Please list your key skills separated by commas."
        elif session["step"] == "ask_skills":
            session["data"]["skills"] = message
            
            summary, status = await evaluate_candidate(session["data"])
            session["data"]["status"] = status
            
            await candidates_collection.insert_one(session["data"])
            
            sessions[session_id] = {"intent": None, "step": None, "data": {}}
            return f"Thank you. Based on your profile, your status is: **{status}**.\n\n{summary}"

    
    if session["intent"] == "raise_hiring_request":
        if session["step"] == "ask_dept":
            session["data"]["department"] = message
            session["step"] = "ask_role"
            return "What role do you want to hire for?"
        elif session["step"] == "ask_role":
            session["data"]["role_required"] = message
            session["step"] = "ask_positions"
            return "How many positions are required?"
        elif session["step"] == "ask_positions":
            if not message.isdigit(): return "Please enter a valid number."
            session["data"]["positions"] = int(message)
            session["step"] = "ask_urgency"
            return "What is the urgency level? (Low, Medium, High)"
        elif session["step"] == "ask_urgency":
            session["data"]["urgency"] = message
            
            await hiring_requests_collection.insert_one(session["data"])
            
            summary = f"""
            **Hiring Request Summary**
            • Department: {session['data']['department']}
            • Role: {session['data']['role_required']}
            • Openings: {session['data']['positions']}
            • Urgency: {session['data']['urgency']}
            """
            sessions[session_id] = {"intent": None, "step": None, "data": {}}
            return f"Your hiring request has been created successfully.\n\n{summary}"

    return "I didn't quite catch that. Try asking to apply for a job, view jobs, or raise a hiring request."