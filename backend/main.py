from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
from dotenv import load_dotenv
from groq import Groq
import os

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB
client = MongoClient(os.getenv("MONGO_URI"))
db = client[os.getenv("DB_NAME", "hrchatbot")]

# Groq
groq_client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

# ---------------- MODELS ----------------

class ChatRequest(BaseModel):
    message: str

class Candidate(BaseModel):
    fullName: str
    email: str
    phone: str
    location: str
    qualification: str
    totalExperience: str
    relevantExperience: str
    skills: str
    currentCTC: str
    expectedCTC: str
    noticePeriod: str
    preferredRole: str
    resumeLink: str = ""

class HiringRequest(BaseModel):
    department: str
    jobTitle: str
    positions: str
    experience: str
    skills: str
    location: str
    budget: str
    manager: str
    urgency: str
    reason: str
    type: str

# ---------------- HOME ----------------

@app.get("/")
def home():
    return {"message": "HR Hiring Chatbot Backend Running"}

# ---------------- JOBS ----------------

@app.get("/jobs")
def get_jobs():
    jobs = list(db.job_openings.find({}, {"_id": 0}))
    return jobs

# ---------------- CHAT ----------------

@app.post("/chat")
def chat(data: ChatRequest):
    prompt = f"""
You are an HR Hiring Assistant chatbot.

Help with:
- Job openings
- Hiring process
- Apply process
- Documents required
- Interview rounds
- Hiring requests
- HR admin support

User: {data.message}
"""

    response = groq_client.chat.completions.create(
        model="llama3-70b-8192",
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    reply = response.choices[0].message.content

    return {"reply": reply}

# ---------------- APPLY ----------------

@app.post("/apply")
def apply(candidate: Candidate):
    data = candidate.dict()

    exp = float(data["totalExperience"])

    if exp >= 3:
        status = "Shortlisted for next step"
    elif exp >= 1:
        status = "Eligible for HR review"
    else:
        status = "Not suitable based on required experience"

    data["status"] = status

    db.candidates.insert_one(data)

    return {
        "message": "Application submitted",
        "screening_result": status
    }

# ---------------- HIRING REQUEST ----------------

@app.post("/hiring-request")
def hiring_request(req: HiringRequest):
    data = req.dict()

    db.hiring_requests.insert_one(data)

    return {
        "message": "Hiring request created",
        "summary": data
    }

# ---------------- HR ADMIN ----------------

@app.post("/hr-admin")
def hr_admin(data: ChatRequest):
    msg = data.message.lower()

    if "shortlisted" in msg:
        result = list(
            db.candidates.find(
                {"status": "Shortlisted for next step"},
                {"_id": 0}
            )
        )
        return result

    if "rejected" in msg:
        result = list(
            db.candidates.find(
                {"status": "Not suitable based on required experience"},
                {"_id": 0}
            )
        )
        return result

    if "pending" in msg:
        result = list(
            db.hiring_requests.find({}, {"_id": 0})
        )
        return result

    return {"message": "No matching query"}

# ---------------- STATUS ----------------

@app.get("/status/{email}")
def check_status(email: str):
    user = db.candidates.find_one(
        {"email": email},
        {"_id": 0}
    )

    if user:
        return user

    return {"message": "Application not found"}