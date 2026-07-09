// frontend/src/App.jsx
import React, { useState } from 'react';
import JobHunter from './pages/JobHunter';
import ResumeUpload from './pages/ResumeUpload';

const NAV_TABS = [
  { id: 'resume',  icon: '🧠', label: 'My Profile' },
  { id: 'jobs',    icon: '🔍', label: 'Job Hunter' },
];

function App() {
  const [activeTab, setActiveTab] = useState('resume');

  return (
    <div style={{ minHeight: '100vh', background: '#f8faff', fontFamily: "'Inter', sans-serif" }}>

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav style={{
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          maxWidth: '860px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '60px',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem',
            }}>🚀</div>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Career<span style={{ color: '#6366f1' }}>Pilot</span>
            </span>
          </div>

          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            borderRadius: '10px',
            padding: '3px',
            gap: '2px',
          }}>
            {NAV_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === tab.id
                    ? '#fff'
                    : 'transparent',
                  boxShadow: activeTab === tab.id
                    ? '0 1px 3px rgba(0,0,0,0.1)'
                    : 'none',
                  color: activeTab === tab.id ? '#6366f1' : '#64748b',
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Hackathon tag */}
          <span style={{
            fontSize: '0.72rem',
            color: '#94a3b8',
            fontWeight: 500,
            background: '#f1f5f9',
            padding: '0.3rem 0.7rem',
            borderRadius: '99px',
          }}>
            Hackathon Build v1.0
          </span>
        </div>
      </nav>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main style={{ paddingTop: '1.5rem', paddingBottom: '3rem' }}>
        {activeTab === 'resume' && <ResumeUpload />}
        {activeTab === 'jobs'   && <JobHunter />}
      </main>
    </div>
  );
}

export default App;