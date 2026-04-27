import { useState } from "react";
import axios from "axios";

function CandidateForm() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    preferredRole: ""
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
        "http://127.0.0.1:5000/api/candidates/apply",
        form
      );

      alert("Application Submitted");
    } catch (error) {
      console.log(error);
      alert("Error submitting");
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <h2 className="text-xl font-bold mb-4">Apply Job</h2>

      <input
        name="fullName"
        placeholder="Full Name"
        className="border p-2 w-full mb-3"
        onChange={handleChange}
      />

      <input
        name="email"
        placeholder="Email"
        className="border p-2 w-full mb-3"
        onChange={handleChange}
      />

      <input
        name="phone"
        placeholder="Phone"
        className="border p-2 w-full mb-3"
        onChange={handleChange}
      />

      <input
        name="preferredRole"
        placeholder="Preferred Role"
        className="border p-2 w-full mb-3"
        onChange={handleChange}
      />

      <button
        onClick={submitForm}
        className="bg-green-600 text-white px-5 py-2 rounded"
      >
        Submit
      </button>
    </div>
  );
}

export default CandidateForm;