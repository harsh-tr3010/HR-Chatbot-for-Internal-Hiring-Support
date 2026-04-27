import React, { useState } from "react";
import axios from "axios";

function App() {
  const [jobs, setJobs] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    qualification: "",
    totalExperience: "",
    skills: "",
    preferredRole: ""
  });

  const API = "http://127.0.0.1:5000";

  const fetchJobs = async () => {
    const res = await axios.get(`${API}/api/jobs`);
    setJobs(res.data);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const submitForm = async () => {
    await axios.post(`${API}/api/candidates/apply`, {
      ...formData,
      skills: formData.skills.split(",")
    });

    alert("Application Submitted Successfully");
    setShowForm(false);
  };

  return (
    <div className="flex h-screen bg-gray-100">

      {/* Sidebar */}
      <div className="w-64 bg-blue-700 text-white p-5">
        <h1 className="text-2xl font-bold mb-8">HireFlow AI</h1>

        <ul className="space-y-4">
          <li onClick={fetchJobs} className="cursor-pointer">Jobs</li>
          <li
            onClick={() => setShowForm(true)}
            className="cursor-pointer"
          >
            Apply Job
          </li>
        </ul>
      </div>

      {/* Main */}
      <div className="flex-1 p-8">

        <h2 className="text-3xl font-bold mb-6">
          HR Hiring Assistant
        </h2>

        {/* Candidate Form */}
        {showForm && (
          <div className="bg-white p-6 rounded-xl shadow mb-6">
            <h3 className="text-xl font-bold mb-4">
              Apply for Job
            </h3>

            <div className="grid grid-cols-2 gap-4">

              <input name="fullName" placeholder="Full Name"
                className="border p-2"
                onChange={handleChange} />

              <input name="email" placeholder="Email"
                className="border p-2"
                onChange={handleChange} />

              <input name="phone" placeholder="Phone"
                className="border p-2"
                onChange={handleChange} />

              <input name="location" placeholder="Location"
                className="border p-2"
                onChange={handleChange} />

              <input name="qualification" placeholder="Qualification"
                className="border p-2"
                onChange={handleChange} />

              <input name="totalExperience" placeholder="Experience"
                className="border p-2"
                onChange={handleChange} />

              <input name="skills" placeholder="Skills comma separated"
                className="border p-2"
                onChange={handleChange} />

              <input name="preferredRole" placeholder="Preferred Role"
                className="border p-2"
                onChange={handleChange} />

            </div>

            <button
              onClick={submitForm}
              className="bg-green-600 text-white px-5 py-2 mt-4 rounded"
            >
              Submit Application
            </button>
          </div>
        )}

        {/* Jobs */}
        <div className="grid grid-cols-2 gap-6">
          {jobs.map((job) => (
            <div key={job._id}
              className="bg-white p-5 rounded-xl shadow">
              <h3 className="text-xl font-bold">{job.title}</h3>
              <p>{job.department}</p>
              <p>{job.location}</p>
              <p>{job.experience} Years</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default App;