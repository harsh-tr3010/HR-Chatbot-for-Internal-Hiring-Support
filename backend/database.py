import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_DETAILS = os.getenv("MONGO_DETAILS", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URI)
db = client.hr_chatbot_db

job_openings_collection = db.get_collection("job_openings")
candidates_collection = db.get_collection("candidates")
hiring_requests_collection = db.get_collection("hiring_requests")
chat_history_collection = db.get_collection("chat_history")

async def seed_data():
    # If we have less than 50 jobs, reset the collection and seed the full 50
    count = await job_openings_collection.count_documents({})
    if count < 50:
        await job_openings_collection.delete_many({}) # Clear old seed data
        
        jobs = [
            # ---------------- TECH DEPARTMENT (20 Roles) ----------------
            {
                "title": "Junior Python Developer", "department": "Tech", "location": "Noida", 
                "experience_required": 0.0, "skills_required": ["Python", "SQL", "Git"],
                "employment_type": "Full-time", "description": "Entry-level backend development."
            },
            {
                "title": "Frontend Intern", "department": "Tech", "location": "Remote", 
                "experience_required": 0.0, "skills_required": ["HTML", "CSS", "React"],
                "employment_type": "Internship", "description": "Assist in UI/UX development."
            },
            {
                "title": "QA Tester L1", "department": "Tech", "location": "Gurugram", 
                "experience_required": 1.0, "skills_required": ["Manual Testing", "Jira", "Selenium"],
                "employment_type": "Full-time", "description": "Perform manual and automated testing."
            },
            {
                "title": "Data Analyst", "department": "Tech", "location": "Bengaluru", 
                "experience_required": 1.5, "skills_required": ["Excel", "SQL", "Tableau"],
                "employment_type": "Full-time", "description": "Analyze business data and create dashboards."
            },
            {
                "title": "Backend Developer", "department": "Tech", "location": "Noida", 
                "experience_required": 2.0, "skills_required": ["Python", "Django", "FastAPI"],
                "employment_type": "Full-time", "description": "Develop and maintain robust APIs."
            },
            {
                "title": "AI/ML Engineer", "department": "Tech", "location": "Remote", 
                "experience_required": 2.5, "skills_required": ["Python", "Machine Learning", "LLM", "LangChain"],
                "employment_type": "Full-time", "description": "Build intelligent AI features and agents."
            },
            {
                "title": "DevOps Engineer", "department": "Tech", "location": "Pune", 
                "experience_required": 3.0, "skills_required": ["AWS", "Docker", "Kubernetes", "CI/CD"],
                "employment_type": "Full-time", "description": "Manage cloud infrastructure and pipelines."
            },
            {
                "title": "Full Stack Developer", "department": "Tech", "location": "Bengaluru", 
                "experience_required": 3.5, "skills_required": ["React", "Node.js", "MongoDB", "Express"],
                "employment_type": "Full-time", "description": "End-to-end web application development."
            },
            {
                "title": "Mobile App Developer", "department": "Tech", "location": "Noida", 
                "experience_required": 4.0, "skills_required": ["Flutter", "Dart", "Firebase"],
                "employment_type": "Full-time", "description": "Build cross-platform mobile applications."
            },
            {
                "title": "Cloud Security Specialist", "department": "Tech", "location": "Remote", 
                "experience_required": 4.5, "skills_required": ["Cybersecurity", "AWS", "Network Security"],
                "employment_type": "Full-time", "description": "Ensure secure cloud infrastructure and compliance."
            },
            {
                "title": "Senior Data Scientist", "department": "Tech", "location": "Gurugram", 
                "experience_required": 5.0, "skills_required": ["Python", "Deep Learning", "TensorFlow", "PyTorch"],
                "employment_type": "Full-time", "description": "Research and deploy complex predictive models."
            },
            {
                "title": "Senior Backend Engineer", "department": "Tech", "location": "Bengaluru", 
                "experience_required": 5.5, "skills_required": ["Java", "Spring Boot", "Microservices"],
                "employment_type": "Full-time", "description": "Design highly scalable backend architectures."
            },
            {
                "title": "Lead Frontend Developer", "department": "Tech", "location": "Remote", 
                "experience_required": 6.0, "skills_required": ["React", "Next.js", "TypeScript", "Redux"],
                "employment_type": "Full-time", "description": "Lead UI development and mentor junior devs."
            },
            {
                "title": "Data Engineering Lead", "department": "Tech", "location": "Pune", 
                "experience_required": 6.5, "skills_required": ["Spark", "Hadoop", "Python", "Snowflake"],
                "employment_type": "Full-time", "description": "Lead the design of big data pipelines."
            },
            {
                "title": "Tech Lead - AI", "department": "Tech", "location": "Noida", 
                "experience_required": 7.0, "skills_required": ["Python", "System Design", "Generative AI"],
                "employment_type": "Full-time", "description": "Drive AI initiatives and technical strategy."
            },
            {
                "title": "Principal Software Engineer", "department": "Tech", "location": "Bengaluru", 
                "experience_required": 8.0, "skills_required": ["System Architecture", "Go", "Distributed Systems"],
                "employment_type": "Full-time", "description": "High-level architecture and cross-team leadership."
            },
            {
                "title": "VP of Engineering", "department": "Tech", "location": "Gurugram", 
                "experience_required": 10.0, "skills_required": ["Leadership", "Agile", "System Architecture", "Scaling"],
                "employment_type": "Full-time", "description": "Executive leadership for the entire engineering department."
            },

            # ---------------- BPO / CUSTOMER SUCCESS (16 Roles) ----------------
            {
                "title": "Customer Support Executive", "department": "BPO", "location": "Noida", 
                "experience_required": 0.0, "skills_required": ["Communication", "English", "Typing"],
                "employment_type": "Full-time", "description": "Handle inbound customer queries via phone."
            },
            {
                "title": "Chat Support Agent", "department": "BPO", "location": "Remote", 
                "experience_required": 0.0, "skills_required": ["Typing", "Customer Service", "Multitasking"],
                "employment_type": "Full-time", "description": "Resolve customer issues via live chat."
            },
            {
                "title": "Technical Support L1", "department": "BPO", "location": "Pune", 
                "experience_required": 1.0, "skills_required": ["Troubleshooting", "Windows", "Ticketing System"],
                "employment_type": "Full-time", "description": "Basic IT and product troubleshooting for clients."
            },
            {
                "title": "Quality Analyst - Voice", "department": "BPO", "location": "Noida", 
                "experience_required": 2.0, "skills_required": ["Quality Assurance", "Feedback", "Auditing"],
                "employment_type": "Full-time", "description": "Monitor calls and ensure quality metrics are met."
            },
            {
                "title": "Technical Support L2", "department": "BPO", "location": "Bengaluru", 
                "experience_required": 3.0, "skills_required": ["Advanced Troubleshooting", "Networking", "Linux"],
                "employment_type": "Full-time", "description": "Escalation desk for complex technical issues."
            },
            {
                "title": "Subject Matter Expert (SME)", "department": "BPO", "location": "Gurugram", 
                "experience_required": 4.0, "skills_required": ["Process Knowledge", "Mentoring", "Escalation Handling"],
                "employment_type": "Full-time", "description": "Act as the primary knowledge source for the floor."
            },
            {
                "title": "BPO Team Leader", "department": "BPO", "location": "Noida", 
                "experience_required": 5.0, "skills_required": ["Team Management", "KPI Tracking", "Attrition Control"],
                "employment_type": "Full-time", "description": "Manage a team of 15-20 agents and drive performance."
            },
            {
                "title": "Process Trainer", "department": "BPO", "location": "Pune", 
                "experience_required": 5.5, "skills_required": ["Training Delivery", "Content Creation", "Communication"],
                "employment_type": "Full-time", "description": "Train new batches of agents on process and product."
            },
            {
                "title": "WFM Analyst", "department": "BPO", "location": "Bengaluru", 
                "experience_required": 6.0, "skills_required": ["Workforce Management", "Scheduling", "Forecasting"],
                "employment_type": "Full-time", "description": "Manage staffing, scheduling, and queue monitoring."
            },
            {
                "title": "Quality Manager", "department": "BPO", "location": "Noida", 
                "experience_required": 7.0, "skills_required": ["Six Sigma", "Process Improvement", "Team Leadership"],
                "employment_type": "Full-time", "description": "Oversee the entire quality department and drive CSAT."
            },
            {
                "title": "Operations Manager", "department": "BPO", "location": "Gurugram", 
                "experience_required": 8.0, "skills_required": ["P&L Management", "Client Interaction", "Operations Strategy"],
                "employment_type": "Full-time", "description": "Manage multi-process operations and client delivery."
            },
            {
                "title": "Director of Customer Success", "department": "BPO", "location": "Remote", 
                "experience_required": 10.0, "skills_required": ["Strategic Planning", "Client Retention", "Executive Leadership"],
                "employment_type": "Full-time", "description": "Head the global customer success and BPO operations."
            },

            # ---------------- HUMAN RESOURCES (14 Roles) ----------------
            {
                "title": "HR Intern", "department": "HR", "location": "Remote", 
                "experience_required": 0.0, "skills_required": ["Communication", "MS Office", "Organization"],
                "employment_type": "Internship", "description": "Assist the HR team with documentation and sourcing."
            },
            {
                "title": "Recruitment Coordinator", "department": "HR", "location": "Noida", 
                "experience_required": 1.0, "skills_required": ["Scheduling", "Email Etiquette", "ATS Management"],
                "employment_type": "Full-time", "description": "Schedule interviews and manage candidate pipelines."
            },
            {
                "title": "HR Executive", "department": "HR", "location": "Pune", 
                "experience_required": 2.0, "skills_required": ["Onboarding", "Employee Engagement", "Grievance Handling"],
                "employment_type": "Full-time", "description": "Handle day-to-day HR operations and employee queries."
            },
            {
                "title": "IT Recruiter", "department": "HR", "location": "Bengaluru", 
                "experience_required": 2.5, "skills_required": ["Tech Sourcing", "Naukri", "LinkedIn Recruiter", "Screening"],
                "employment_type": "Full-time", "description": "Source and hire for technical/engineering roles."
            },
            {
                "title": "Payroll Specialist", "department": "HR", "location": "Noida", 
                "experience_required": 3.0, "skills_required": ["Payroll Processing", "Taxation", "Excel", "Compliance"],
                "employment_type": "Full-time", "description": "Ensure accurate and timely salary disbursements."
            },
            {
                "title": "HR Generalist", "department": "HR", "location": "Gurugram", 
                "experience_required": 4.0, "skills_required": ["Performance Management", "Policy Implementation", "Exit Management"],
                "employment_type": "Full-time", "description": "End-to-end HR management for a specific business unit."
            },
            {
                "title": "Talent Acquisition Lead", "department": "HR", "location": "Remote", 
                "experience_required": 5.0, "skills_required": ["Team Management", "Stakeholder Management", "Recruitment Strategy"],
                "employment_type": "Full-time", "description": "Lead a team of recruiters to meet hiring targets."
            },
            {
                "title": "Employee Relations Manager", "department": "HR", "location": "Noida", 
                "experience_required": 6.0, "skills_required": ["Conflict Resolution", "Labor Laws", "Engagement Strategies"],
                "employment_type": "Full-time", "description": "Maintain a positive work environment and handle disputes."
            },
            {
                "title": "Compensation & Benefits Manager", "department": "HR", "location": "Bengaluru", 
                "experience_required": 7.0, "skills_required": ["Market Benchmarking", "Data Analysis", "Reward Strategy"],
                "employment_type": "Full-time", "description": "Design competitive salary and benefits structures."
            },
            {
                "title": "HR Business Partner (HRBP)", "department": "HR", "location": "Pune", 
                "experience_required": 8.0, "skills_required": ["Strategic HR", "Coaching", "Organizational Design"],
                "employment_type": "Full-time", "description": "Align HR strategies with business goals for specific departments."
            },
            {
                "title": "Diversity and Inclusion Lead", "department": "HR", "location": "Remote", 
                "experience_required": 8.5, "skills_required": ["D&I Strategy", "Cultural Change", "Training"],
                "employment_type": "Full-time", "description": "Drive inclusive hiring and workplace culture initiatives."
            },
            {
                "title": "Director of Talent Acquisition", "department": "HR", "location": "Gurugram", 
                "experience_required": 10.0, "skills_required": ["Global Hiring Strategy", "Employer Branding", "Leadership"],
                "employment_type": "Full-time", "description": "Head the global recruitment strategy and employer brand."
            },
            {
                "title": "Chief Human Resources Officer", "department": "HR", "location": "Noida", 
                "experience_required": 10.0, "skills_required": ["Executive Leadership", "Board Interaction", "Global HR Strategy"],
                "employment_type": "Full-time", "description": "Top executive overseeing all HR functions and people strategy."
            }
        ]
        
        await job_openings_collection.insert_many(jobs)
        print("Successfully seeded 50 unique jobs into the database!")