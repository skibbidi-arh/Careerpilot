import express from 'express'
import jobsRouter from './routes/jobs.js'
import trackerRouter from './routes/tracker.js'
import userRouter from './routes/user.js'

const app = express()
app.use(express.json())
app.use('/jobs', jobsRouter)
app.use('/tracker', trackerRouter)
app.use('/user', userRouter)

const port = process.env.PORT || 4000
app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`)
})
