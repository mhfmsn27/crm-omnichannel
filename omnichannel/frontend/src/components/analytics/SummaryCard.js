
import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export default function SummaryCard({ title, value, trend }) {
    const isPositive = trend > 0;
    const isNeutral = trend === 0;
    const isNegative = trend < 0;

    return (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
            
            <div className="flex items-center gap-1 mt-2">
                {isNeutral ? (
                    <span className="bg-gray-100 text-gray-500 text-xs px-1.5 py-0.5 rounded flex items-center">
                        <Minus className="w-3 h-3 mr-1" /> 0%
                    </span>
                ) : (
                    <span className={`text-xs px-1.5 py-0.5 rounded flex items-center ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                        {Math.abs(trend)}%
                    </span>
                )}
                <span className="text-xs text-gray-400">vs prev period</span>
            </div>
        </div>
    );
}
