import { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import JobList from "../components/JobList";
import CandidateForm from "../components/CandidateForm";

function Dashboard() {
  const [view, setView] = useState("jobs");
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    const res = await axios.get(
      "http://127.0.0.1:5000/api/jobs"
    );
    setJobs(res.data);
  };

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar setView={setView} />

      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-6">
          HR Hiring Assistant
        </h1>

        {view === "jobs" && <JobList jobs={jobs} />}
        {view === "apply" && <CandidateForm />}
      </div>
    </div>
  );
}

export default Dashboard;