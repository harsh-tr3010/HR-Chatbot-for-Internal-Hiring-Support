function Sidebar({ setView }) {
  return (
    <div className="w-72 bg-gradient-to-b from-blue-800 to-blue-600 text-white p-6 min-h-screen shadow-xl">
      <h1 className="text-3xl font-bold mb-10 tracking-wide">
  HireFlow AI
</h1>

      <ul className="space-y-4">
        <li
          className="cursor-pointer"
          onClick={() => setView("jobs")}
        >
          View Jobs
        </li>
        <li
  className="cursor-pointer"
  onClick={() => setView("hiring")}
>
  Hiring Request
</li>


        <li
          className="cursor-pointer"
          onClick={() => setView("apply")}
        >
          Apply Job
        </li>
        <li
  className="cursor-pointer"
  onClick={() => setView("admin")}
>
  Admin Dashboard
</li>
      </ul>
    </div>
  );
}

export default Sidebar;