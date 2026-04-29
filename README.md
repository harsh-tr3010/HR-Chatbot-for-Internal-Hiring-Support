# 🚀 AI-Powered HR Chatbot & ATS Dashboard

A sophisticated, full-stack Applicant Tracking System (ATS) designed to automate the recruitment lifecycle. This project leverages **Llama 3.1** for resume parsing and job matching, providing a seamless experience for Candidates, Hiring Managers, and HR Admins.

---

## 🌟 Key Features

### 👤 Candidate Experience
- **AI Resume Parsing:** Instant data extraction from PDF resumes to autofill applications.
- **Smart Job Search:** Natural language search (e.g., "show me jobs in Noida").
- **Identity Verification:** Securely check application status via Email and Phone.

### 🟣 Hiring Manager Tools
- **Automated Requisitions:** Raise hiring requests using plain text.
- **Experience Normalizer:** AI automatically converts text into standardized `X-Y yrs` ranges.
- **Budget Tracking:** Enforced "per annum" budget tracking for financial clarity.

### 🟢 HR Admin Control (Dashboard)
- **Interactive Stat Cards:** Clickable dashboard cards to filter candidates by status.
- **Dynamic Pipeline:** Move candidates from **Shortlisted** ➔ **Interview Done** ➔ **Hired**.
- **Management:** Approve hiring requests or delete expired job postings.
- **Category Export:** Surgical CSV export for specific categories (Hired, Rejected, etc.).

---

## 🛠️ Technical Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React.js, Tailwind CSS, Lucide Icons, Axios |
| **Backend** | FastAPI (Python), Motor (Async MongoDB), PyPDF2 |
| **AI Engine** | Llama 3.1 (via Groq Cloud API) |
| **Database** | MongoDB |
| **DevOps** | Docker, Docker Compose, Nginx |

---

## 🚀 Getting Started

### 1. Prerequisites
- [Docker Desktop] installed (or pre-installed in Codespaces).
- [Groq API Key] for AI features.

### 2. Launch with Docker
Run this command from the project root:
```bash
docker-compose up --build
```

---

## 🧪 Testing Credentials

| Role | Email | Phone |
| :--- | :--- | :--- |
| **HR Admin** | `hradmin@abc.com` | `0000000000` |
| **Hiring Manager** | `hrm@abc.com` | `1111111111` |
