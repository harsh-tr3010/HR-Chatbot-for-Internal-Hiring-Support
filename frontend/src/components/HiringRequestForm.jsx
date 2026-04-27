import { useState } from "react";
import axios from "axios";

function HiringRequestForm({ setView }) {
  const [form, setForm] = useState({
    department: "",
    jobTitle: "",
    positions: "",
    experience: "",
    skills: "",
    location: "",
    budget: "",
    manager: "",
    urgency: "",
    reason: "",
    type: "New Position"
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const submitForm = async () => {
    try {
      await axios.post(
        "http://127.0.0.1:5000/api/hiring/add",
        {
          ...form,
          skills: form.skills.split(",")
        }
      );

      alert("Hiring Request Submitted");
      setView("jobs");

    } catch (error) {
      alert("Submission Failed");
    }
  };

  const input =
    "w-full border border-gray-300 rounded-xl px-4 py-3";

  return (
    <div className="max-w-6xl mx-auto bg-white shadow-2xl rounded-3xl p-8">

      <h2 className="text-3xl font-bold mb-2">
        Hiring Request Form
      </h2>

      <p className="text-gray-500 mb-6">
        Raise a new hiring request for your department.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        <input name="department" placeholder="Department" className={input} onChange={handleChange} />
        <input name="jobTitle" placeholder="Job Title" className={input} onChange={handleChange} />
        <input name="positions" placeholder="No. of Positions" className={input} onChange={handleChange} />
        <input name="experience" placeholder="Required Experience" className={input} onChange={handleChange} />
        <input name="skills" placeholder="Required Skills" className={input} onChange={handleChange} />
        <input name="location" placeholder="Job Location" className={input} onChange={handleChange} />
        <input name="budget" placeholder="Budget Range" className={input} onChange={handleChange} />
        <input name="manager" placeholder="Reporting Manager" className={input} onChange={handleChange} />

        <select
          name="urgency"
          className={input}
          onChange={handleChange}
        >
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>

        <select
          name="type"
          className={input}
          onChange={handleChange}
        >
          <option>New Position</option>
          <option>Replacement</option>
        </select>

        <div className="md:col-span-2">
          <textarea
            name="reason"
            placeholder="Reason for Hiring"
            rows="4"
            className={input}
            onChange={handleChange}
          />
        </div>

      </div>

      <div className="mt-8 text-right">
        <button
          onClick={submitForm}
          className="bg-blue-600 text-white px-8 py-3 rounded-xl"
        >
          Submit Request
        </button>
      </div>

    </div>
  );
}

export default HiringRequestForm;