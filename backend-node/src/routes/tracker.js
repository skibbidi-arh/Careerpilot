import express from 'express'
import { getTracker } from '../controllers/trackerController.js'

const router = express.Router()
router.get('/', getTracker)
export default router
