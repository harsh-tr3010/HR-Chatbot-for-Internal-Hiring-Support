import { useState } from "react";
import axios from "axios";

function CandidateForm() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    qualification: "",
    totalExperience: "",
    relevantExperience: "",
    skills: "",
    currentCTC: "",
    expectedCTC: "",
    noticePeriod: "",
    preferredRole: "",
    resumeLink: ""
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const submitForm = async () => {
    try {
      setLoading(true);

      await axios.post(
        "http://127.0.0.1:5000/api/candidates/apply",
        {
          ...form,
          skills: form.skills.split(",")
        }
      );

      alert("Application Submitted Successfully");

      setForm({
        fullName: "",
        email: "",
        phone: "",
        location: "",
        qualification: "",
        totalExperience: "",
        relevantExperience: "",
        skills: "",
        currentCTC: "",
        expectedCTC: "",
        noticePeriod: "",
        preferredRole: "",
        resumeLink: ""
      });

    } catch (error) {
      alert("Submission Failed");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle =
    "w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="max-w-6xl mx-auto bg-white shadow-2xl rounded-3xl p-8 md:p-10">

      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800">
          Candidate Application Form
        </h2>
        <p className="text-gray-500 mt-2">
          Fill in your professional details to apply for available opportunities.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="Full Name" className={inputStyle} />

        <input name="email" value={form.email} onChange={handleChange} placeholder="Email ID" className={inputStyle} />

        <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone Number" className={inputStyle} />

        <input name="location" value={form.location} onChange={handleChange} placeholder="Current Location" className={inputStyle} />

        <input name="qualification" value={form.qualification} onChange={handleChange} placeholder="Highest Qualification" className={inputStyle} />

        <input name="totalExperience" value={form.totalExperience} onChange={handleChange} placeholder="Total Experience (Years)" className={inputStyle} />

        <input name="relevantExperience" value={form.relevantExperience} onChange={handleChange} placeholder="Relevant Experience" className={inputStyle} />

        <input name="skills" value={form.skills} onChange={handleChange} placeholder="Skills (Python, React, SQL)" className={inputStyle} />

        <input name="currentCTC" value={form.currentCTC} onChange={handleChange} placeholder="Current CTC" className={inputStyle} />

        <input name="expectedCTC" value={form.expectedCTC} onChange={handleChange} placeholder="Expected CTC" className={inputStyle} />

        <input name="noticePeriod" value={form.noticePeriod} onChange={handleChange} placeholder="Notice Period" className={inputStyle} />

        <input name="preferredRole" value={form.preferredRole} onChange={handleChange} placeholder="Preferred Role" className={inputStyle} />

        <div className="md:col-span-2">
          <input
            name="resumeLink"
            value={form.resumeLink}
            onChange={handleChange}
            placeholder="Resume Link / Drive URL"
            className={inputStyle}
          />
        </div>

      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={submitForm}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition duration-300"
        >
          {loading ? "Submitting..." : "Submit Application"}
        </button>
      </div>

    </div>
  );
}

export default CandidateForm;