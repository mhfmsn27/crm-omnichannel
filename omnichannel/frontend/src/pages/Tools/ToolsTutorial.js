import React from 'react';
import { HelpCircle } from 'lucide-react';

export default function ToolsTutorial() {
  return (
    <div className="p-8 h-full flex flex-col items-center justify-center text-gray-400">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <HelpCircle className="w-10 h-10 text-gray-300" />
        </div>
        <h2 className="text-xl font-bold text-gray-600 mb-2">Tools Tutorials</h2>
        <p className="max-w-md text-center mb-6">Panduan lengkap cara menggunakan Warmer, Extractor, dan Scraper.</p>
        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase">Coming Soon</span>
    </div>
  );
}