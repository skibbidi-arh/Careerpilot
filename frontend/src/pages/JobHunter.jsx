// frontend/src/pages/JobHunter.jsx
import React, { useState } from 'react';
import { searchJobs } from '../services/api';
import JobCard from '../components/JobCard';

const JobHunter = () => {
    const [query, setQuery] = useState('');
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        // Calls the Node.js API, which triggers the Python script
        const results = await searchJobs(query);
        setJobs(results);
        setLoading(false);
    };

    return (
        <div className="max-w-6xl mx-auto p-8">
            <div className="mb-10 text-center">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Job Hunter Agent</h1>
                <p className="text-lg text-gray-600">Describe your ideal role, and AI will scour the web to find live matches.</p>
            </div>

            <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-12 flex gap-3">
                <input 
                    type="text" 
                    className="flex-1 p-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. Find me ML internships in Dhaka open this month"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={loading}
                />
                <button 
                    type="submit" 
                    className="bg-blue-600 text-white px-8 py-4 rounded-lg font-bold hover:bg-blue-700 transition disabled:bg-blue-300"
                    disabled={loading}
                >
                    {loading ? 'Hunting...' : 'Search'}
                </button>
            </form>

            {loading && (
                <div className="text-center text-gray-500 animate-pulse">
                    <p>Agent is scraping the web and analyzing contexts... this may take 15-20 seconds.</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs.map((job, index) => (
                    <JobCard key={index} job={job} />
                ))}
            </div>
            
            {!loading && jobs.length === 0 && query && (
                <div className="text-center text-gray-500">
                    No jobs found. Try adjusting your search criteria.
                </div>
            )}
        </div>
    );
};

export default JobHunter;