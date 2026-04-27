from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models import ChatRequest, ChatResponse
from bot_logic import process_message
from database import seed_data, chat_history_collection
import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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