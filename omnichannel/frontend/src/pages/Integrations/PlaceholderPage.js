import React from 'react';
import { Hammer } from 'lucide-react';

export default function PlaceholderPage({ title, desc }) {
  return (
    <div className="p-8 h-full flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <Hammer className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{title} Integration</h2>
        <p className="text-gray-500 max-w-md mb-6">{desc}</p>
        <span className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full text-sm font-bold uppercase tracking-wide">
            Coming Soon
        </span>
        <p className="text-xs text-gray-400 mt-8">This feature is currently under development.</p>
    </div>
  );
}