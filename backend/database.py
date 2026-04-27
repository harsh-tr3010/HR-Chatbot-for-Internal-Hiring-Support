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
            {
                "title": "Python Developer", "department": "Engineering", "location": "Noida", 
                "experience_required": 2.0, "skills_required": ["Python", "Django", "FastAPI", "SQL"],
                "employment_type": "Full-time", "description": "Backend development using Python."
            },
            {
                "title": "AI/ML Engineer", "department": "AI Development Team", "location": "Remote", 
                "experience_required": 2.0, "skills_required": ["Python", "Machine Learning", "OpenAI API", "SQL", "LLM", "LangChain"],
                "employment_type": "Full-time", "description": "Build and deploy AI models."
            },
            {
                "title": "HR Executive", "department": "Human Resources", "location": "Gurugram", 
                "experience_required": 1.0, "skills_required": ["Communication", "Screening", "Sourcing"],
                "employment_type": "Full-time", "description": "Manage internal recruitment."
            }
        ])