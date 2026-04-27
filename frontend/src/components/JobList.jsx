function JobList({ jobs }) {
  return (
    <div className="grid grid-cols-2 gap-6">
      {jobs.map((job) => (
        <div
          key={job._id}
          className="bg-white p-5 rounded-xl shadow"
        >
          <h3 className="text-xl font-bold">{job.title}</h3>
          <p>{job.department}</p>
          <p>{job.location}</p>
          <p>{job.experience} Years</p>
        </div>
      ))}
    </div>
  );
}

export default JobList;