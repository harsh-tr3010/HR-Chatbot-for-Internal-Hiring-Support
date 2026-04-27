import { useState } from "react";
import axios from "axios";

function Chatbot() {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello! I am your HR Hiring Assistant. How can I help you today?"
    }
  ]);
  const [resumeFile, setResumeFile] = useState(null);
const [resumeLink, setResumeLink] = useState("");

  const [input, setInput] = useState("");
  const handleResumeUpload = (e) => {
  setResumeFile(e.target.files[0]);
};
const formData = new FormData();

Object.keys(updated).forEach((key) => {
  formData.append(key, updated[key]);
});

formData.append("resumeLink", resumeLink);

if (resumeFile) {
  formData.append("resume", resumeFile);
}

try {
  const res = await axios.post(
    "http://127.0.0.1:8000/apply",
    formData
  );

  newMsgs.push({
    sender: "bot",
    text: `✅ ${res.data.screening_result}`
  });

} catch (error) {
  newMsgs.push({
    sender: "bot",
    text: "⚠ Failed to submit application."
  });
}
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = {
      sender: "user",
      text: input
    };

    let botReply =
      "I can help with jobs, applications, hiring requests, and HR support.";

    const msg = input.toLowerCase();

    if (msg.includes("job")) {
      botReply = "Use View Jobs to see all openings.";
    }

    if (msg.includes("apply")) {
      botReply = "Please open Apply Job to submit your profile.";
    }

    if (msg.includes("hiring")) {
      botReply = "Please open Hiring Request to raise a request.";
    }

    if (msg.includes("shortlisted")) {
      botReply = "Open HR Support to view shortlisted candidates.";
    }

    setMessages([
      ...messages,
      userMsg,
      { sender: "bot", text: botReply }
    ]);

    setInput("");
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl h-[85vh] flex flex-col">

      {/* Header */}
      <div className="p-5 border-b font-bold text-xl">
        HR Hiring Assistant
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-[70%] px-4 py-3 rounded-2xl ${
              msg.sender === "user"
                ? "ml-auto bg-blue-600 text-white"
                : "bg-gray-100"
            }`}
          >
            {msg.text}
          </div>
        ))}

      </div>

      {/* Quick Replies */}
      <div className="px-4 pb-3 flex flex-wrap gap-2">
        <button
          onClick={() => setInput("Show jobs")}
          className="bg-gray-200 px-3 py-1 rounded-full"
        >
          Show Jobs
        </button>

        <button
          onClick={() => setInput("Apply for job")}
          className="bg-gray-200 px-3 py-1 rounded-full"
        >
          Apply
        </button>

        <button
          onClick={() => setInput("Hiring request")}
          className="bg-gray-200 px-3 py-1 rounded-full"
        >
          Hiring Request
        </button>
      </div>

      {/* Input */}
      <div className="p-4 border-t flex gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 border rounded-xl px-4 py-3"
        />
        {step === 12 && (
  <div className="bg-gray-50 border rounded-2xl p-4 space-y-3">

    <p className="font-medium">
      Upload Resume or Add Resume Link
    </p>

    <input
      type="file"
      accept=".pdf,.doc,.docx"
      onChange={handleResumeUpload}
      className="w-full"
    />

    {resumeFile && (
      <p className="text-green-600 text-sm">
        Selected: {resumeFile.name}
      </p>
    )}

    <input
      placeholder="Resume Link (Drive URL)"
      value={resumeLink}
      onChange={(e) => setResumeLink(e.target.value)}
      className="w-full border rounded-xl px-4 py-2"
    />
  </div>
)}

        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-6 rounded-xl"
        >
          Send
        </button>
      </div>

    </div>
  );
}

export default Chatbot;