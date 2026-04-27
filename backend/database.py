import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")
client = AsyncIOMotorClient(MONGO_URI)
db = client.hr_chatbot_db


job_openings_collection = db.get_collection("job_openings")
candidates_collection = db.get_collection("candidates")
hiring_requests_collection = db.get_collection("hiring_requests")
chat_history_collection = db.get_collection("chat_history")


async def seed_data():
    count = await job_openings_collection.count_documents({})
    if count == 0:
        await job_openings_collection.insert_many([
            {"title": "AI/ML Engineer", "department": "AI Dev", "location": "Remote", "experience_required": 2.0, "skills_required": ["Python", "Machine Learning", "OpenAI API", "SQL"]},
            {"title": "Python Developer", "department": "Engineering", "location": "Noida", "experience_required": 1.0, "skills_required": ["Python", "Django", "FastAPI"]}
        ])