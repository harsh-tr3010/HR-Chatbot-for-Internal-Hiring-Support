from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from dotenv import load_dotenv
import shutil
import os
from groq import Groq

load_dotenv()
groq_client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = MongoClient(os.getenv("MONGO_URI"))
db = client[os.getenv("DB_NAME")]

@app.get("/")
def home():
    return {"message": "HireFlow AI Backend Running"}
@app.post("/chat")
async def chat(data: dict):
    user_message = data.get("message")

    prompt = f"""
You are an HR Hiring Assistant chatbot.

Help users with:
- Job openings
- Hiring process
- Applying for jobs
- Required documents
- Candidate queries
- Hiring requests
- HR support

User message:
{user_message}
"""

    response = groq_client.chat.completions.create(
        model="llama3-70b-8192",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    reply = response.choices[0].message.content

    return {"reply": reply}

@app.post("/apply")
async def apply(
    fullName: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    location: str = Form(...),
    qualification: str = Form(...),
    totalExperience: str = Form(...),
    relevantExperience: str = Form(...),
    skills: str = Form(...),
    currentCTC: str = Form(...),
    expectedCTC: str = Form(...),
    noticePeriod: str = Form(...),
    preferredRole: str = Form(...),
    resumeLink: str = Form(""),
    resume: UploadFile = File(None)
):

    file_name = ""

    if resume:
        file_name = resume.filename
        file_path = f"uploads/{file_name}"

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(resume.file, buffer)

    data = {
        "fullName": fullName,
        "email": email,
        "phone": phone,
        "location": location,
        "qualification": qualification,
        "totalExperience": totalExperience,
        "relevantExperience": relevantExperience,
        "skills": skills,
        "currentCTC": currentCTC,
        "expectedCTC": expectedCTC,
        "noticePeriod": noticePeriod,
        "preferredRole": preferredRole,
        "resumeLink": resumeLink,
        "resumeFile": file_name
    }

    db.candidates.insert_one(data)

    exp = float(totalExperience)

    if exp >= 3:
        result = "Shortlisted for next step"
    elif exp >= 1:
        result = "Eligible for HR review"
    else:
        result = "Not suitable based on required experience"

    return {
        "message": "Application submitted successfully",
        "screening_result": result
    }
    