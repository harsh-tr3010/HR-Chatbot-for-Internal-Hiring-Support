from fastapi import FastAPI, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from models import ChatRequest, ChatResponse
from bot_logic import process_message
import io
import csv
from fastapi.responses import StreamingResponse
from database import candidates_collection
from database import seed_data, chat_history_collection
import datetime
import os
import shutil
from pydantic import BaseModel

app = FastAPI(title="HR Chatbot API", version="1.0.0")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

class LoginRequest(BaseModel):
    email: str
    phone: str
os.makedirs("uploads", exist_ok=True)

@app.post("/candidate/login")
async def candidate_login(request: LoginRequest):
    email = request.email.strip()
    
    # Search for past sessions where this email was provided
    past_sessions = await chat_history_collection.find({"role": "user", "message": email}).to_list(length=20)
    
    history = []
    last_session_id = None
    
    if past_sessions:
        # Get the most recent session ID
        past_sessions.sort(key=lambda x: x["timestamp"], reverse=True)
        last_session_id = past_sessions[0]["session_id"]
        
        # Fetch all messages from that specific session
        chats = await chat_history_collection.find({"session_id": last_session_id}).sort("timestamp", 1).to_list(length=100)
        
        for c in chats:
            history.append({"role": c["role"], "text": c["message"]})
            
    return {
        "success": True,
        "session_id": last_session_id,
        "history": history
    }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"Error occurred: {exc}") 
    return JSONResponse(
        status_code=500,
        content={"message": "An unexpected error occurred. Please try again later."},
    )

@app.on_event("startup")
async def startup_event():
    await seed_data()

# --- NEW ENDPOINT FOR FILE UPLOADS ---
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # Save the file securely in the uploads directory
    file_path = f"uploads/{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Return the simulated link/path
    return {"file_url": file_path, "filename": file.filename}

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    await chat_history_collection.insert_one({
        "session_id": request.session_id,
        "role": "user",
        "message": request.message,
        "timestamp": datetime.datetime.utcnow()
    })

    bot_reply = await process_message(request.session_id, request.message)

    await chat_history_collection.insert_one({
        "session_id": request.session_id,
        "role": "bot",
        "message": bot_reply,
        "timestamp": datetime.datetime.utcnow()
    })

    return ChatResponse(response=bot_reply)

@app.get("/export/candidates")
async def export_candidates():
    candidates = await candidates_collection.find({}).to_list(1000)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    
    writer.writerow(["Name", "Email", "Phone", "Role Applied", "Experience (Yrs)", "Skills", "Expected CTC", "Status"])
    
    
    for c in candidates:
        writer.writerow([
            c.get("full_name", ""), 
            c.get("email", ""), 
            c.get("phone", ""),
            c.get("preferred_role", ""), 
            c.get("total_experience", ""),
            c.get("skills", ""), 
            c.get("expected_ctc", ""),
            c.get("screening_status", "")
        ])
        
    output.seek(0)
    
    return StreamingResponse(
        output, 
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=candidates_export.csv"}
    )