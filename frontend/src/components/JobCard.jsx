// frontend/src/components/JobCard.jsx
import React from 'react';

const JobCard = ({ job }) => {
    return (
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-900">{job.title}</h3>
                    <p className="text-md text-blue-600 font-semibold">{job.company}</p>
                </div>
                <span className="bg-gray-100 text-gray-800 text-xs px-3 py-1 rounded-full font-medium">
                    📍 {job.location}
                </span>
            </div>
            
            <p className="text-gray-600 text-sm mb-4">{job.summary}</p>
            
            <div className="mb-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Key Requirements</h4>
                <div className="flex flex-wrap gap-2">
                    {job.key_requirements.map((req, index) => (
                        <span key={index} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded">
                            {req}
                        </span>
                    ))}
                </div>
            </div>
            
            <a 
                href={job.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-full text-center bg-black text-white font-medium py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
                View Application
            </a>
        </div>
    );
};

export default JobCard;