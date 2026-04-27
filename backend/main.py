from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from models import ChatRequest, ChatResponse
from bot_logic import process_message
from database import seed_data, chat_history_collection
import datetime
import os

app = FastAPI(title="HR Chatbot API", version="1.0.0")

# PRODUCTION SECURITY: Restrict this to your actual frontend domain(s)
# e.g., ["https://my-hr-chatbot.vercel.app", "http://localhost:5173"]
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Global Exception Handler to prevent server crashes on bad inputs
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"Error occurred: {exc}") # In production, use proper logging
    return JSONResponse(
        status_code=500,
        content={"message": "An unexpected error occurred. Please try again later."},
    )

@app.on_event("startup")
async def startup_event():
    await seed_data()

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