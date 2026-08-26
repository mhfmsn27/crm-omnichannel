
import React from 'react';
import { Zap } from 'lucide-react';

export default function QuotaWidget({ quota }) {
  if (!quota) return null;
  
  const percentage = Math.min(100, Math.round((quota.broadcast_used / quota.broadcast_limit) * 100));
  const isLow = percentage > 80;

  return (
    <div className="bg-indigo-800 p-6 rounded-xl shadow-lg text-white h-full flex flex-col justify-between relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-4 opacity-10">
         <Zap className="w-24 h-24" />
      </div>

      <div>
        <h3 className="font-bold text-lg mb-1">Broadcast Quota</h3>
        <p className="text-indigo-200 text-sm">Monthly Usage Limit</p>
      </div>

      <div className="mt-6">
         <div className="flex justify-between text-sm font-medium mb-2">
            <span>{quota.broadcast_used.toLocaleString()} Sent</span>
            <span className="opacity-70">Limit: {quota.broadcast_limit.toLocaleString()}</span>
         </div>
         <div className="w-full bg-white/10 rounded-full h-3">
            <div 
                className={`h-3 rounded-full transition-all duration-1000 ${isLow ? 'bg-red-500' : 'bg-indigo-400'}`} 
                style={{ width: `${percentage}%` }}
            ></div>
         </div>
         {isLow && (
             <p className="text-xs text-red-300 mt-2 font-bold flex items-center gap-1">
                 ⚠️ Quota running low! Upgrade plan.
             </p>
         )}
      </div>

      <button className="mt-6 w-full py-2 bg-white text-indigo-900 font-bold rounded-lg text-sm hover:bg-indigo-50 transition-colors">
          Upgrade Plan
      </button>
    </div>
  );
}
