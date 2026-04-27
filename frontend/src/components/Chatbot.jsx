import { useState } from "react";
import axios from "axios";

function Chatbot() {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello! I am your HR Hiring Assistant. How can I help you today?"
    }
  ]);

  const [input, setInput] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeLink, setResumeLink] = useState("");

  const handleResumeUpload = (e) => {
    setResumeFile(e.target.files[0]);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = {
      sender: "user",
      text: input
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    const msg = input.toLowerCase();

    try {
      // Candidate Apply Flow
      if (msg.includes("apply")) {
        const formData = new FormData();

        formData.append("fullName", "Harsh");
        formData.append("email", "harsh@gmail.com");
        formData.append("phone", "9876543210");
        formData.append("location", "Gurgaon");
        formData.append("qualification", "B.Tech");
        formData.append("totalExperience", "2");
        formData.append("relevantExperience", "2");
        formData.append("skills", "Python,React,AI");
        formData.append("currentCTC", "4");
        formData.append("expectedCTC", "6");
        formData.append("noticePeriod", "30 Days");
        formData.append("preferredRole", "AI Engineer");
        formData.append("resumeLink", resumeLink);

        if (resumeFile) {
          formData.append("resume", resumeFile);
        }

        const res = await axios.post(
          "http://127.0.0.1:8000/apply",
          formData
        );

        setMessages([
          ...newMessages,
          {
            sender: "bot",
            text: `✅ ${res.data.screening_result}`
          }
        ]);
      }

      // Groq Chat API
      else {
        const res = await axios.post(
          "http://127.0.0.1:8000/chat",
          { message: input }
        );

        setMessages([
          ...newMessages,
          {
            sender: "bot",
            text: res.data.reply
          }
        ]);
      }
    } catch (error) {
      setMessages([
        ...newMessages,
        {
          sender: "bot",
          text: "⚠ Something went wrong."
        }
      ]);
    }

    setInput("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex justify-center items-center p-4">

      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-blue-600 text-white p-5 text-xl font-bold rounded-t-3xl">
          HireFlow AI - HR Hiring Assistant
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                msg.sender === "user"
                  ? "ml-auto bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {msg.text}
            </div>
          ))}

        </div>

        {/* Resume Upload */}
        <div className="px-4 pb-3 space-y-3">

          <div className="bg-gray-50 border rounded-2xl p-4">

            <p className="font-medium mb-2">
              Upload Resume or Add Resume Link
            </p>

            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleResumeUpload}
              className="w-full mb-2"
            />

            {resumeFile && (
              <p className="text-green-600 text-sm mb-2">
                Selected: {resumeFile.name}
              </p>
            )}

            <input
              placeholder="Resume Link (Drive URL)"
              value={resumeLink}
              onChange={(e) =>
                setResumeLink(e.target.value)
              }
              className="w-full border rounded-xl px-4 py-2"
            />

          </div>

        </div>

        {/* Quick Buttons */}
        <div className="px-4 pb-3 flex flex-wrap gap-2">

          <button
            onClick={() => setInput("Show jobs")}
            className="bg-gray-200 px-4 py-2 rounded-full"
          >
            Show Jobs
          </button>

          <button
            onClick={() => setInput("Apply for job")}
            className="bg-gray-200 px-4 py-2 rounded-full"
          >
            Apply
          </button>

          <button
            onClick={() => setInput("Hiring request")}
            className="bg-gray-200 px-4 py-2 rounded-full"
          >
            Hiring Request
          </button>

        </div>

        {/* Input */}
        <div className="border-t p-4 flex gap-3">

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 border rounded-xl px-4 py-3"
          />

          <button
            onClick={sendMessage}
            className="bg-blue-600 text-white px-6 rounded-xl"
          >
            Send
          </button>

        </div>

      </div>

    </div>
  );
}

export default Chatbot;