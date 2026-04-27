import React, { useState } from "react";
import axios from "axios";

function App() {
  const [jobs, setJobs] = useState([]);

  const fetchJobs = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:5000/api/jobs");
      setJobs(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">

      {/* Sidebar */}
      <div className="w-64 bg-blue-700 text-white p-5">
        <h1 className="text-2xl font-bold mb-8">HireFlow AI</h1>

        <ul className="space-y-4">
          <li className="cursor-pointer">Dashboard</li>
          <li
            className="cursor-pointer hover:text-yellow-300"
            onClick={fetchJobs}
          >
            Jobs
          </li>
        </ul>
      </div>

      {/* Main */}
      <div className="flex-1 p-8">
        <h2 className="text-3xl font-bold mb-6">
          HR Hiring Assistant
        </h2>

        <button
          onClick={fetchJobs}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg mb-6"
        >
          View Jobs
        </button>

        <div className="grid grid-cols-2 gap-6">
          {jobs.map((job) => (
            <div
              key={job._id}
              className="bg-white p-5 rounded-xl shadow"
            >
              <h3 className="text-xl font-bold">{job.title}</h3>
              <p>{job.department}</p>
              <p>{job.location}</p>
              <p>{job.experience} Years Exp</p>
              <p className="text-sm text-gray-500">
                {job.skills.join(", ")}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export default App;