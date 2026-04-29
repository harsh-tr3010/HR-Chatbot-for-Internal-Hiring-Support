import os
import io
import csv
import datetime
import shutil
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId
from bot_logic import process_message
from database import candidates_collection, chat_history_collection, hiring_requests_collection, job_openings_collection

app = FastAPI()

origins = [
    "http://localhost:5173",
    "https://hr-chatbot-for-internal-hiring-support-frontend-jn9dlvr4q.vercel.app/",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # Using the specific list instead of "*"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "HR Chatbot API is running", "version": "1.0.0"}

class ChatRequest(BaseModel):
    session_id: str
    message: str
    user_role: Optional[str] = "Candidate"

class LoginRequest(BaseModel):
    email: str
    phone: str
    role: str

# --- UNIVERSAL ROLE LOGIN ---
@app.post("/login")
async def universal_login(request: LoginRequest):
    email = request.email.strip()
    
    past_sessions = await chat_history_collection.find({
        "role": "user", 
        "message": email,
        "user_role": request.role
    }).to_list(length=20)
    
    history = []
    last_session_id = None
    
    if past_sessions:
        past_sessions.sort(key=lambda x: x["timestamp"], reverse=True)
        last_session_id = past_sessions[0]["session_id"]
        
        chats = await chat_history_collection.find({"session_id": last_session_id}).sort("timestamp", 1).to_list(length=100)
        for c in chats:
            history.append({"role": c["role"], "text": c["message"]})
            
    return {"success": True, "session_id": last_session_id, "history": history}

# --- REAL-TIME NOTIFICATION ENDPOINT ---
@app.get("/notifications")
async def get_notifications(role: str, email: Optional[str] = None):
    notifications = []
    
    if role == "Candidate" and email:
        apps = await candidates_collection.find({"email": email}).to_list(100)
        for app_data in apps:
            role_name = app_data.get("preferred_role", "Unknown Role")
            status = app_data.get("screening_status", "Pending Review")
            
            email_summary = f"""
**📧 EMAIL NOTIFICATION**
━━━━━━━━━━━━━━━━━━━━━━
**To:** {app_data.get('full_name')} ({email})
**From:** HR Team <hr-team@company.com>
**Subject:** Update on your application for {role_name}

Dear {app_data.get('full_name')},

We are writing to inform you that your application status for the **{role_name}** position has been updated.

**Current Status:** {status}

**Application Summary:**
• Location: {app_data.get('location', 'N/A')}
• Experience: {app_data.get('total_experience', 'N/A')} years
• Skills Matched: {app_data.get('skills', 'N/A')}

Thank you for your interest in joining our team!

Best Regards,
**HR Admin Team**
            """
            
            notifications.append({
                "text": f"Status for {role_name}: {status}", 
                "details": email_summary.strip()
            })
            
    elif role == "HR Admin":
        shortlisted_cands = await candidates_collection.find({"screening_status": "Shortlisted for next step"}).to_list(100)
        if shortlisted_cands:
            details = "**📧 INTERNAL HR ALERTS**\n━━━━━━━━━━━━━━━━━━━━━━\n**To:** HR Admin Dashboard\n**Subject:** 🌟 Shortlisted Candidates Update\n\n"
            for c in shortlisted_cands:
                details += f"• **{c.get('full_name')}** applied for **{c.get('preferred_role')}** (Exp: {c.get('total_experience')} yrs)\n"
            notifications.append({"text": f"🎉 {len(shortlisted_cands)} candidate(s) Shortlisted!", "details": details.strip()})
            
        reqs = await hiring_requests_collection.find({}).to_list(100)
        if reqs:
            details = "**📧 INTERNAL HR ALERTS**\n━━━━━━━━━━━━━━━━━━━━━━\n**To:** HR Admin Dashboard\n**Subject:** 📝 Pending Manager Hiring Requests\n\n"
            for r in reqs:
                details += f"• **{r.get('department')} Dept** requested **{r.get('positions')} {r.get('role_required')}**(s) | Urgency: {r.get('urgency')}\n"
            notifications.append({"text": f"📝 {len(reqs)} new Hiring Request(s) pending.", "details": details.strip()})
            
        hired_cands = await candidates_collection.find({"screening_status": {"$regex": "Hired", "$options": "i"}}).to_list(100)
        if hired_cands:
            details = "**📧 INTERNAL HR ALERTS**\n━━━━━━━━━━━━━━━━━━━━━━\n**To:** HR Admin Dashboard\n**Subject:** ✅ Successfully Filled Vacancies\n\n"
            for c in hired_cands:
                details += f"• **{c.get('full_name')}** was Hired for **{c.get('preferred_role')}**\n"
            notifications.append({"text": f"✅ {len(hired_cands)} job vacancy filled!", "details": details.strip()})
            
    return {"notifications": notifications}

@app.get("/admin/dashboard")
async def get_admin_dashboard():
    total_candidates = await candidates_collection.count_documents({})
    hired = await candidates_collection.count_documents({"screening_status": {"$regex": "Hired", "$options": "i"}})
    rejected = await candidates_collection.count_documents({"screening_status": {"$regex": "Reject|Not suitable|Missing", "$options": "i"}})
    pending = await candidates_collection.count_documents({"screening_status": {"$regex": "Pending|Awaiting", "$options": "i"}})
    
    jobs = await job_openings_collection.find({}).sort("_id", -1).to_list(100)
    candidates = await candidates_collection.find({}).sort("_id", -1).to_list(100)
    requests = await hiring_requests_collection.find({}).sort("_id", -1).to_list(100)
    
    def serialize(docs):
        for doc in docs:
            doc["_id"] = str(doc["_id"])
        return docs

    return {
        "stats": {
            "total": total_candidates, 
            "hired": hired, 
            "rejected": rejected, 
            "pending": pending
        },
        "jobs": serialize(jobs),
        "candidates": serialize(candidates),
        "hiring_requests": serialize(requests)
    }

@app.delete("/admin/jobs/{job_id}")
async def delete_job(job_id: str):
    await job_openings_collection.delete_one({"_id": ObjectId(job_id)})
    return {"success": True}

@app.post("/admin/requests/{req_id}/approve")
async def approve_request(req_id: str):
    req = await hiring_requests_collection.find_one({"_id": ObjectId(req_id)})
    if req:
        new_job = {
            "title": req.get("role_required"),
            "department": req.get("department"),
            "location": req.get("job_location", "Any"),
            "experience_required": req.get("required_experience", "0"),
            "skills_required": [s.strip() for s in str(req.get("required_skills", "")).split(",")],
            "budget": req.get("budget", "Not specified"),
            "description": req.get("reason", "New opening approved by HR.")
        }
        await job_openings_collection.insert_one(new_job)
        await hiring_requests_collection.delete_one({"_id": ObjectId(req_id)})
        return {"success": True}
    return {"success": False, "error": "Request not found"}

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    await chat_history_collection.insert_one({
        "session_id": request.session_id,
        "role": "user",
        "user_role": request.user_role,
        "message": request.message,
        "timestamp": datetime.datetime.utcnow()
    })
    
    bot_reply = await process_message(request.session_id, request.message, request.user_role)
    
    await chat_history_collection.insert_one({
        "session_id": request.session_id,
        "role": "bot",
        "user_role": request.user_role,
        "message": bot_reply,
        "timestamp": datetime.datetime.utcnow()
    })
    
    return {"response": bot_reply}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # Note: On Vercel, this is temporary and will be cleared
    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"file_url": file_path}

@app.get("/export")
async def export_data(type: str = "all_candidates"):
    output = io.StringIO()
    writer = csv.writer(output)
    
    if type == "hiring_requests":
        reqs = await hiring_requests_collection.find({}).to_list(1000)
        writer.writerow(["Department", "Role Required", "Positions", "Experience", "Skills", "Location", "Budget", "Urgency", "Manager"])
        for r in reqs:
            writer.writerow([r.get("department",""), r.get("role_required",""), r.get("positions",""), r.get("required_experience",""), r.get("required_skills",""), r.get("job_location",""), r.get("budget",""), r.get("urgency",""), r.get("reporting_manager","")])
    else:
        query = {}
        if type == "hired": query = {"screening_status": {"$regex": "Hired", "$options": "i"}}
        elif type == "rejected": query = {"screening_status": {"$regex": "Reject|Not suitable|Missing", "$options": "i"}}
        elif type == "shortlisted": query = {"screening_status": {"$regex": "Shortlisted", "$options": "i"}}
        elif type == "interview_done": query = {"screening_status": {"$regex": "Interview Done", "$options": "i"}}
        elif type == "pending": query = {"screening_status": {"$regex": "Pending|Awaiting", "$options": "i"}}
        
        candidates = await candidates_collection.find(query).to_list(1000)
        writer.writerow(["Name", "Email", "Phone", "Role Applied", "Experience (Yrs)", "Skills", "Expected CTC", "Status"])
        for c in candidates:
            writer.writerow([c.get("full_name", ""), c.get("email", ""), c.get("phone", ""), c.get("preferred_role", ""), c.get("total_experience", ""), c.get("skills", ""), c.get("expected_ctc", ""), c.get("screening_status", "")])
    
    output.seek(0)
    return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=export_{type}.csv"})

@app.get("/export/candidates")
async def export_candidates_fallback():
    return await export_data(type="all_candidates")

@app.put("/admin/candidates/{cand_id}/status")
async def update_candidate_status(cand_id: str, status: str):
    await candidates_collection.update_one({"_id": ObjectId(cand_id)}, {"$set": {"screening_status": status}})
    return {"success": True}