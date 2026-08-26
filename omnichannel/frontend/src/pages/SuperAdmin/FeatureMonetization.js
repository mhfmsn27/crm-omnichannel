import React, { useState } from 'react';
import AddonList from './AddonList';
import FeatureManager from './FeatureManager';
import { Puzzle, ToggleRight } from 'lucide-react';

export default function FeatureMonetization() {
    const [activeTab, setActiveTab] = useState('addons');

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight uppercase">Features & Monetization</h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[600px] flex flex-col">
                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button 
                        onClick={() => setActiveTab('addons')}
                        className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'addons' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    >
                        <Puzzle className="w-4 h-4" /> Add-ons Market
                    </button>
                    <button 
                        onClick={() => setActiveTab('flags')}
                        className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'flags' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    >
                        <ToggleRight className="w-4 h-4" /> Feature Manager (System Flags)
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1">
                    {activeTab === 'addons' && <AddonList />}
                    {activeTab === 'flags' && <FeatureManager />}
                </div>
            </div>
        </div>
    );
}