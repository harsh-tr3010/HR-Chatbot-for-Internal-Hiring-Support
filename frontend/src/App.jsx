import React from "react";

function App() {
  return (
    <div className="flex h-screen bg-gray-100">
      
      {/* Sidebar */}
      <div className="w-64 bg-blue-700 text-white p-5">
        <h1 className="text-2xl font-bold mb-8">HireFlow AI</h1>

        <ul className="space-y-4">
          <li className="hover:text-yellow-300 cursor-pointer">Dashboard</li>
          <li className="hover:text-yellow-300 cursor-pointer">Jobs</li>
          <li className="hover:text-yellow-300 cursor-pointer">Candidates</li>
          <li className="hover:text-yellow-300 cursor-pointer">Hiring Requests</li>
        </ul>
      </div>

      {/* Main Area */}
      <div className="flex-1 p-8">
        <h2 className="text-3xl font-bold mb-4">
          HR Hiring Assistant Chatbot
        </h2>

        <p className="text-gray-600 mb-8">
          Automate hiring queries, job applications and internal recruitment workflows.
        </p>

        {/* Cards */}
        <div className="grid grid-cols-2 gap-6">

          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-semibold mb-2">View Jobs</h3>
            <p>See current openings available.</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-semibold mb-2">Apply for Job</h3>
            <p>Submit candidate details quickly.</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-semibold mb-2">Hiring Request</h3>
            <p>Create internal hiring requests.</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-semibold mb-2">HR Support</h3>
            <p>Track candidates and requests.</p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;