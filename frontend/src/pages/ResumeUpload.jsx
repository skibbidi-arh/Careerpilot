// frontend/src/pages/ResumeUpload.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { uploadResume, getResumeStatus, queryResume } from '../services/api';

// ── Section metadata for display ─────────────────────────────────────────────
const SECTION_META = {
  summary:        { icon: '👤', label: 'Summary',        color: '#6366f1' },
  experience:     { icon: '💼', label: 'Experience',     color: '#0ea5e9' },
  education:      { icon: '🎓', label: 'Education',      color: '#10b981' },
  skills:         { icon: '⚡', label: 'Skills',         color: '#f59e0b' },
  projects:       { icon: '🚀', label: 'Projects',       color: '#8b5cf6' },
  certifications: { icon: '🏅', label: 'Certifications', color: '#ec4899' },
  awards:         { icon: '🏆', label: 'Awards',         color: '#f97316' },
  publications:   { icon: '📄', label: 'Publications',   color: '#14b8a6' },
  other:          { icon: '📌', label: 'Other',          color: '#94a3b8' },
};

const USER_ID = 'local_user';

export default function ResumeUpload() {
  const [isDragging, setIsDragging]     = useState(false);
  const [file, setFile]                 = useState(null);
  const [status, setStatus]             = useState('idle'); // idle | uploading | success | error
  const [uploadResult, setUploadResult] = useState(null);
  const [profileStatus, setProfileStatus] = useState(null); // existing profile
  const [errorMsg, setErrorMsg]         = useState('');
  const [progress, setProgress]         = useState(0);
  const [queryText, setQueryText]       = useState('');
  const [queryResults, setQueryResults] = useState([]);
  const [querying, setQuerying]         = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const fileInputRef = useRef(null);
  const progressIntervalRef = useRef(null);

  // Check for existing indexed profile on mount
  useEffect(() => {
    getResumeStatus(USER_ID)
      .then(setProfileStatus)
      .catch(() => {}); // Silently fail if Python service not running
  }, []);

  // ── Drag & Drop handlers ────────────────────────────────────────────────────
  const handleDragOver  = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop      = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSetFile(dropped);
  }, []);

  const validateAndSetFile = (f) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (!allowed.includes(f.type)) {
      setErrorMsg('Only PDF and DOCX files are supported.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setErrorMsg('File must be under 10 MB.');
      return;
    }
    setErrorMsg('');
    setFile(f);
    setStatus('idle');
    setUploadResult(null);
  };

  // ── Upload handler ─────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    setProgress(0);
    setErrorMsg('');
    setUploadResult(null);

    // Fake progress animation while the AI pipeline runs
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => prev < 85 ? prev + Math.random() * 8 : prev);
    }, 600);

    try {
      const result = await uploadResume(file, USER_ID);
      clearInterval(progressIntervalRef.current);
      setProgress(100);
      setUploadResult(result);
      setStatus('success');
      // Refresh profile status
      const newStatus = await getResumeStatus(USER_ID);
      setProfileStatus(newStatus);
    } catch (err) {
      clearInterval(progressIntervalRef.current);
      setStatus('error');
      setErrorMsg(err.message || 'Upload failed. Make sure the Python service is running.');
    }
  };

  // ── RAG Query handler ──────────────────────────────────────────────────────
  const handleQuery = async (e) => {
    e.preventDefault();
    if (!queryText.trim()) return;
    setQuerying(true);
    setQueryResults([]);
    try {
      const results = await queryResume(queryText, USER_ID);
      setQueryResults(results);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setQuerying(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const fileExt = file ? file.name.split('.').pop().toUpperCase() : null;

  return (
    <div style={{
      maxWidth: '860px',
      margin: '0 auto',
      padding: '2.5rem 1.5rem',
      fontFamily: "'Inter', sans-serif",
    }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
          }}>🧠</div>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Resume Intelligence
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Pillar 2 — Your CV is the foundation of every AI feature</p>
          </div>
        </div>
      </div>

      {/* ── Existing Profile Status Banner ─────────────────────────────────── */}
      {profileStatus?.indexed && (
        <div style={{
          background: 'linear-gradient(135deg, #ecfdf5, #f0fdf4)',
          border: '1px solid #86efac',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <div style={{
            width: '10px', height: '10px', borderRadius: '50%',
            background: '#22c55e', boxShadow: '0 0 8px #22c55e', flexShrink: 0,
          }} />
          <div>
            <p style={{ margin: 0, fontWeight: 600, color: '#166534', fontSize: '0.9rem' }}>
              Profile Indexed — {profileStatus.chunk_count} chunks stored
            </p>
            <p style={{ margin: 0, color: '#4ade80', fontSize: '0.78rem', marginTop: '2px' }}>
              Sections: {profileStatus.sections.join(', ')}
            </p>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#16a34a', fontWeight: 500 }}>
            Re-upload below to update ↓
          </span>
        </div>
      )}

      {/* ── Drop Zone ──────────────────────────────────────────────────────── */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !file && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? '#6366f1' : file ? '#22c55e' : '#e2e8f0'}`,
          borderRadius: '16px',
          padding: '3rem 2rem',
          textAlign: 'center',
          cursor: file ? 'default' : 'pointer',
          background: isDragging
            ? 'linear-gradient(135deg, #eef2ff, #f5f3ff)'
            : file
            ? 'linear-gradient(135deg, #f0fdf4, #ecfdf5)'
            : '#fafbff',
          transition: 'all 0.25s ease',
          marginBottom: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Animated background glow when dragging */}
        {isDragging && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.08) 0%, transparent 70%)',
          }} />
        )}

        {!file ? (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
              {isDragging ? '📂' : '📎'}
            </div>
            <p style={{ fontWeight: 700, color: '#1e293b', fontSize: '1.05rem', margin: '0 0 0.35rem' }}>
              {isDragging ? 'Drop it here!' : 'Drag & drop your resume'}
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 1rem' }}>
              PDF or DOCX · Max 10 MB
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', border: 'none', borderRadius: '8px',
                padding: '0.55rem 1.4rem', fontWeight: 600, cursor: 'pointer',
                fontSize: '0.875rem', boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                transition: 'transform 0.15s ease',
              }}
            >
              Browse Files
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '12px',
              background: file.type === 'application/pdf'
                ? 'linear-gradient(135deg, #ef4444, #f97316)'
                : 'linear-gradient(135deg, #2563eb, #0ea5e9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.4rem', color: '#fff', fontWeight: 800, flexShrink: 0,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}>
              {fileExt}
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{file.name}</p>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>{formatBytes(file.size)}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); setStatus('idle'); setUploadResult(null); }}
              style={{
                marginLeft: 'auto', background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: '8px', padding: '0.4rem 0.75rem', cursor: 'pointer',
                color: '#ef4444', fontWeight: 600, fontSize: '0.8rem',
              }}
            >
              Remove
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files[0] && validateAndSetFile(e.target.files[0])}
        />
      </div>

      {/* ── Error Message ─────────────────────────────────────────────────── */}
      {errorMsg && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
          padding: '0.85rem 1rem', marginBottom: '1rem',
          display: 'flex', gap: '0.5rem', alignItems: 'center',
        }}>
          <span style={{ fontSize: '1.1rem' }}>⚠️</span>
          <p style={{ margin: 0, color: '#dc2626', fontSize: '0.875rem', fontWeight: 500 }}>{errorMsg}</p>
        </div>
      )}

      {/* ── Upload Button & Progress ───────────────────────────────────────── */}
      {file && status !== 'success' && (
        <button
          onClick={handleUpload}
          disabled={status === 'uploading'}
          style={{
            width: '100%',
            padding: '0.9rem',
            borderRadius: '12px',
            border: 'none',
            background: status === 'uploading'
              ? 'linear-gradient(135deg, #a5b4fc, #c4b5fd)'
              : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: status === 'uploading' ? 'not-allowed' : 'pointer',
            boxShadow: status === 'uploading' ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
            transition: 'all 0.2s ease',
            marginBottom: '1.25rem',
          }}
        >
          {status === 'uploading' ? '🧠 Processing with AI...' : '🚀 Index My Resume'}
        </button>
      )}

      {/* Progress Bar */}
      {status === 'uploading' && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
              {progress < 30 ? 'Parsing document...'
                : progress < 60 ? 'Classifying sections with Gemini...'
                : progress < 90 ? 'Generating embeddings...'
                : 'Storing in vector database...'}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#6366f1', fontWeight: 700 }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899)',
              borderRadius: '99px',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      )}

      {/* ── Success: Section Breakdown ──────────────────────────────────────── */}
      {status === 'success' && uploadResult && (
        <div style={{
          background: 'linear-gradient(135deg, #f8faff, #fafbff)',
          border: '1px solid #e0e7ff',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', boxShadow: '0 4px 10px rgba(34,197,94,0.3)',
            }}>✓</div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Resume Indexed Successfully</p>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>
                {uploadResult.chunk_count} chunks stored across {Object.keys(uploadResult.sections || {}).length} section types
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                marginLeft: 'auto', background: '#eef2ff', border: '1px solid #c7d2fe',
                borderRadius: '8px', padding: '0.45rem 0.9rem', cursor: 'pointer',
                color: '#4f46e5', fontWeight: 600, fontSize: '0.78rem',
              }}
            >
              Update CV
            </button>
          </div>

          {/* Section chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {Object.entries(uploadResult.sections || {}).map(([section, count]) => {
              const meta = SECTION_META[section] || SECTION_META.other;
              return (
                <button
                  key={section}
                  onClick={() => setExpandedSection(expandedSection === section ? null : section)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    background: `${meta.color}15`,
                    border: `1px solid ${meta.color}40`,
                    borderRadius: '99px',
                    padding: '0.35rem 0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    color: meta.color,
                  }}
                >
                  {meta.icon} {meta.label}
                  <span style={{
                    background: meta.color, color: '#fff',
                    borderRadius: '99px', padding: '0.1rem 0.45rem',
                    fontSize: '0.7rem', fontWeight: 700,
                  }}>{count}</span>
                </button>
              );
            })}
          </div>

          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.78rem' }}>
            ✅ All downstream features (job matching, cover letters, gap analysis) will now use your profile.
          </p>
        </div>
      )}

      {/* ── RAG Query Tester ─────────────────────────────────────────────────── */}
      {(profileStatus?.indexed || status === 'success') && (
        <div style={{
          background: '#0f172a',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.1rem' }}>🔍</span>
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem' }}>
                Query Your Profile
              </p>
              <p style={{ margin: 0, color: '#475569', fontSize: '0.75rem' }}>
                Test the RAG retrieval — ask anything about your experience
              </p>
            </div>
          </div>

          <form onSubmit={handleQuery} style={{ display: 'flex', gap: '0.6rem' }}>
            <input
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="e.g. What Python experience do I have? / Show my education"
              disabled={querying}
              style={{
                flex: 1,
                padding: '0.7rem 1rem',
                borderRadius: '10px',
                border: '1px solid #1e293b',
                background: '#1e293b',
                color: '#f1f5f9',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={querying || !queryText.trim()}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', border: 'none', borderRadius: '10px',
                padding: '0.7rem 1.25rem', fontWeight: 700, cursor: 'pointer',
                fontSize: '0.875rem', whiteSpace: 'nowrap',
                opacity: querying || !queryText.trim() ? 0.5 : 1,
              }}
            >
              {querying ? '...' : 'Search'}
            </button>
          </form>

          {queryResults.length > 0 && (
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {queryResults.map((chunk, i) => {
                const meta = SECTION_META[chunk.section] || SECTION_META.other;
                return (
                  <div key={i} style={{
                    background: '#1e293b',
                    borderRadius: '10px',
                    padding: '0.85rem 1rem',
                    borderLeft: `3px solid ${meta.color}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: meta.color }}>
                        {meta.icon} {meta.label}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 600 }}>
                        {(chunk.score * 100).toFixed(0)}% match
                      </span>
                    </div>
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem', lineHeight: 1.6 }}>
                      {chunk.text.length > 300 ? chunk.text.slice(0, 300) + '…' : chunk.text}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── How It Works ─────────────────────────────────────────────────────── */}
      <div style={{
        background: '#fafbff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '1.25rem 1.5rem',
      }}>
        <p style={{ margin: '0 0 0.75rem', fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>
          How it works
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[
            ['📄', 'Parse', 'Text extracted from PDF/DOCX with layout awareness'],
            ['🧠', 'Classify', 'Gemini Flash identifies and separates resume sections'],
            ['🔢', 'Embed', 'Each section embedded with Gemini text-embedding-004'],
            ['🗄️', 'Store', 'Vectors stored in ChromaDB — locally on your machine'],
            ['🔍', 'Retrieve', 'Every AI feature semantically queries your profile'],
          ].map(([icon, step, desc]) => (
            <div key={step} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>{icon}</span>
              <div>
                <span style={{ fontWeight: 700, color: '#374151', fontSize: '0.825rem' }}>{step} — </span>
                <span style={{ color: '#6b7280', fontSize: '0.825rem' }}>{desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
