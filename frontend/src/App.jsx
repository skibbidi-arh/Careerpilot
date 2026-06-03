import React from 'react';
import JobHunter from './pages/JobHunter';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Navbar Placeholder */}
      <nav className="bg-white border-b border-gray-200 p-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <span className="text-xl font-black tracking-tight text-blue-600">🚀 CareerPilot</span>
          <span className="text-sm font-medium text-gray-500">Hackathon Build v1.0</span>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="py-6">
        <JobHunter />
      </main>
    </div>
  );
}

export default App;