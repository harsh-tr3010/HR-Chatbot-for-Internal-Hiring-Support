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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    session_id: str
    message: str
    user_role: Optional[str] = "Candidate"

class LoginRequest(BaseModel):
    email: str
    phone: str

@app.post("/candidate/login")
async def candidate_login(request: LoginRequest):
    email = request.email.strip()
    past_sessions = await chat_history_collection.find({
        "role": "user", 
        "message": email,
        "user_role": "Candidate"
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

# --- NEW: REAL-TIME NOTIFICATION ENDPOINT ---
@app.get("/notifications")
async def get_notifications(role: str, email: Optional[str] = None):
    notifications = []
    
    if role == "Candidate" and email:
        # STRICT ISOLATION: Only fetches the logged-in student's data!
        apps = await candidates_collection.find({"email": email}).to_list(100)
        for app in apps:
            role_name = app.get("preferred_role", "Unknown Role")
            status = app.get("screening_status", "Pending Review")
            
            # --- THE CANDIDATE EMAIL SUMMARY PATTERN ---
            email_summary = f"""
            **📧 EMAIL NOTIFICATION**
            ━━━━━━━━━━━━━━━━━━━━━━
            **To:** {app.get('full_name')} ({email})
            **From:** HR Team <hr-team@company.com>
            **Subject:** Update on your application for {role_name}
            
            Dear {app.get('full_name')},
            
            We are writing to inform you that your application status for the **{role_name}** position has been updated.
            
            **Current Status:** {status}
            
            **Application Summary:**
            • Location: {app.get('location', 'N/A')}
            • Experience: {app.get('total_experience', 'N/A')} years
            • Skills Matched: {app.get('skills', 'N/A')}
            
            Thank you for your interest in joining our team!
            
            Best Regards,
            **HR Admin Team**
            """
            
            notifications.append({
                "text": f"Status for {role_name}: {status}", 
                "details": email_summary.strip()
            })
            
    elif role == "HR Admin":
        # 1. Shortlisted Candidates Email Pattern
        shortlisted_cands = await candidates_collection.find({"screening_status": "Shortlisted for next step"}).to_list(100)
        if shortlisted_cands:
            details = "**📧 INTERNAL HR ALERTS**\n━━━━━━━━━━━━━━━━━━━━━━\n**To:** HR Admin Dashboard\n**Subject:** 🌟 Shortlisted Candidates Update\n\n"
            for c in shortlisted_cands:
                details += f"• **{c.get('full_name')}** applied for **{c.get('preferred_role')}** (Exp: {c.get('total_experience')} yrs)\n"
            notifications.append({"text": f"🎉 {len(shortlisted_cands)} candidate(s) Shortlisted!", "details": details.strip()})
            
        # 2. Pending Hiring Requests Email Pattern
        reqs = await hiring_requests_collection.find({}).to_list(100)
        if reqs:
            details = "**📧 INTERNAL HR ALERTS**\n━━━━━━━━━━━━━━━━━━━━━━\n**To:** HR Admin Dashboard\n**Subject:** 📝 Pending Manager Hiring Requests\n\n"
            for r in reqs:
                details += f"• **{r.get('department')} Dept** requested **{r.get('positions')} {r.get('role_required')}**(s) | Urgency: {r.get('urgency')}\n"
            notifications.append({"text": f"📝 {len(reqs)} new Hiring Request(s) pending.", "details": details.strip()})
            
        # 3. Hired/Filled Vacancies Email Pattern
        hired_cands = await candidates_collection.find({"screening_status": {"$regex": "Hired", "$options": "i"}}).to_list(100)
        if hired_cands:
            details = "**📧 INTERNAL HR ALERTS**\n━━━━━━━━━━━━━━━━━━━━━━\n**To:** HR Admin Dashboard\n**Subject:** ✅ Successfully Filled Vacancies\n\n"
            for c in hired_cands:
                details += f"• **{c.get('full_name')}** was Hired for **{c.get('preferred_role')}**\n"
            notifications.append({"text": f"✅ {len(hired_cands)} job vacancy filled!", "details": details.strip()})
            
    return {"notifications": notifications}
@app.get("/admin/dashboard")
async def get_admin_dashboard():
    # 1. Calculate Stats
    total_candidates = await candidates_collection.count_documents({})
    hired = await candidates_collection.count_documents({"screening_status": {"$regex": "Hired", "$options": "i"}})
    rejected = await candidates_collection.count_documents({"screening_status": {"$regex": "Reject|Not suitable|Missing", "$options": "i"}})
    pending = await candidates_collection.count_documents({"screening_status": {"$regex": "Pending|Awaiting", "$options": "i"}})
    
    # 2. Fetch Data Arrays
    jobs = await job_openings_collection.find({}).sort("_id", -1).to_list(100)
    candidates = await candidates_collection.find({}).sort("_id", -1).to_list(100)
    requests = await hiring_requests_collection.find({}).sort("_id", -1).to_list(100)
    
    # Helper to convert MongoDB ObjectId to string for JSON serialization
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
# --- NEW: DASHBOARD ACTION ENDPOINTS ---
@app.delete("/admin/jobs/{job_id}")
async def delete_job(job_id: str):
    await job_openings_collection.delete_one({"_id": ObjectId(job_id)})
    return {"success": True}

@app.post("/admin/requests/{req_id}/approve")
async def approve_request(req_id: str):
    # 1. Find the pending request
    req = await hiring_requests_collection.find_one({"_id": ObjectId(req_id)})
    if req:
        # 2. Format it into a Job Opening
        new_job = {
            "title": req.get("role_required"),
            "department": req.get("department"),
            "location": req.get("job_location", "Any"),
            "experience_required": req.get("required_experience", "0"),
            "skills_required": [s.strip() for s in str(req.get("required_skills", "")).split(",")],
            "budget": req.get("budget", "Not specified"),
            "description": req.get("reason", "New opening approved by HR.")
        }
        # 3. Insert into Jobs and Delete from Requests
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
    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"file_url": file_path}

@app.get("/export/candidates")
async def export_candidates():
    candidates = await candidates_collection.find({}).to_list(1000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Email", "Phone", "Role Applied", "Experience (Yrs)", "Skills", "Expected CTC", "Status"])
    for c in candidates:
        writer.writerow([
            c.get("full_name", ""), c.get("email", ""), c.get("phone", ""),
            c.get("preferred_role", ""), c.get("total_experience", ""),
            c.get("skills", ""), c.get("expected_ctc", ""), c.get("screening_status", "")
        ])
    output.seek(0)
    return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=candidates_export.csv"})