export function getJobs(req, res) {
  res.json({ jobs: [], query: req.query.search || '' })
}
