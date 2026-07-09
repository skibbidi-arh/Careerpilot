/**
 * resume.js (route)
 * ─────────────────
 * Express router for resume intelligence endpoints (Pillar 2).
 *
 * Routes:
 *   POST   /resume/upload           → Upload & index a PDF/DOCX CV
 *   GET    /resume/status/:userId   → Check if a user has an indexed profile
 *   POST   /resume/query            → Semantic query over stored profile (used by other pillars)
 *
 * File uploads are handled by multer (memory storage — no disk writes on Node side;
 * the file buffer is forwarded directly to the Python service).
 */

import express from 'express'
import multer from 'multer'
import { uploadResume, getResumeStatus, queryResume } from '../controllers/resumeController.js'

const router = express.Router()

// Multer: store in memory, limit to 10 MB, restrict to PDF/DOCX MIME types
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (_req, file, cb) => {
        const allowed = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
        ]
        if (allowed.includes(file.mimetype)) {
            cb(null, true)
        } else {
            cb(new Error('Only PDF and DOCX files are allowed.'), false)
        }
    },
})

// Upload & index a resume
router.post('/upload', upload.single('file'), uploadResume)

// Check if a user's profile is indexed
router.get('/status/:userId', getResumeStatus)

// Semantic query over a user's stored profile
router.post('/query', queryResume)

// Handle multer errors gracefully
router.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError || err.message.includes('Only PDF')) {
        return res.status(400).json({ error: err.message })
    }
    res.status(500).json({ error: 'Unexpected error during file upload.' })
})

export default router
