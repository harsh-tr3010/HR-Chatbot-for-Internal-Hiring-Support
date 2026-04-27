import { useEffect, useState } from "react";
import axios from "axios";

function AdminDashboard() {
  const [candidates, setCandidates] = useState([]);
  const [requests, setRequests] = useState([]);
  const [jobs, setJobs] = useState([]);

  const API = "http://127.0.0.1:5000";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const c = await axios.get(`${API}/api/candidates`);
    const r = await axios.get(`${API}/api/hiring`);
    const j = await axios.get(`${API}/api/jobs`);

    setCandidates(c.data);
    setRequests(r.data);
    setJobs(j.data);
  };

  const card =
    "bg-white rounded-2xl shadow-lg p-6";

  return (
    <div>

      <h1 className="text-3xl font-bold mb-6">
        HR Admin Dashboard
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">

        <div className={card}>
          <p className="text-gray-500">Candidates</p>
          <h2 className="text-3xl font-bold">
            {candidates.length}
          </h2>
        </div>

        <div className={card}>
          <p className="text-gray-500">Jobs</p>
          <h2 className="text-3xl font-bold">
            {jobs.length}
          </h2>
        </div>

        <div className={card}>
          <p className="text-gray-500">Requests</p>
          <h2 className="text-3xl font-bold">
            {requests.length}
          </h2>
        </div>

        <div className={card}>
          <p className="text-gray-500">Pending</p>
          <h2 className="text-3xl font-bold">
            {candidates.filter(
              (x) => x.status === "Pending"
            ).length}
          </h2>
        </div>

      </div>

      {/* Candidates */}
      <div className="bg-white rounded-2xl shadow p-6 mb-8 overflow-x-auto">
        <h2 className="text-xl font-bold mb-4">
          Candidates
        </h2>

        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {candidates.map((item) => (
              <tr key={item._id} className="border-b">
                <td className="py-3">{item.fullName}</td>
                <td>{item.email}</td>
                <td>{item.preferredRole}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Requests */}
      <div className="bg-white rounded-2xl shadow p-6 overflow-x-auto">
        <h2 className="text-xl font-bold mb-4">
          Hiring Requests
        </h2>

        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th>Department</th>
              <th>Role</th>
              <th>Positions</th>
              <th>Urgency</th>
            </tr>
          </thead>

          <tbody>
            {requests.map((item) => (
              <tr key={item._id} className="border-b">
                <td className="py-3">{item.department}</td>
                <td>{item.jobTitle}</td>
                <td>{item.positions}</td>
                <td>{item.urgency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}

export default AdminDashboard;