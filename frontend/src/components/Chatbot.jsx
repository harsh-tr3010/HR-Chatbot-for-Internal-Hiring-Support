import { useState } from "react";

function Chatbot() {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello! I am your HR Hiring Assistant. How can I help you today?"
    }
  ]);

  const [input, setInput] = useState("");

  const sendMessage = () => {
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