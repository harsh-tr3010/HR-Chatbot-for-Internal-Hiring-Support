function Sidebar({ setView }) {
  return (
    <div className="w-64 bg-blue-700 text-white p-5 min-h-screen">
      <h1 className="text-2xl font-bold mb-8">HireFlow AI</h1>

      <ul className="space-y-4">
        <li
          className="cursor-pointer"
          onClick={() => setView("jobs")}
        >
          View Jobs
        </li>

        <li
          className="cursor-pointer"
          onClick={() => setView("apply")}
        >
          Apply Job
        </li>
      </ul>
    </div>
  );
}

export default Sidebar;