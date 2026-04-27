import os
from groq import Groq
from database import job_openings_collection, candidates_collection, hiring_requests_collection
from dotenv import load_dotenv

load_dotenv()
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))


sessions = {}

def get_intent(user_message: str) -> str:
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