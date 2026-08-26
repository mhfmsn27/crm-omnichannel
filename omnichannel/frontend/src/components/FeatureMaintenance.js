import React from 'react';
import { Construction, Info } from 'lucide-react';

const FeatureMaintenance = ({ message = "Fitur ini sedang dalam pemeliharaan sistem." }) => {
    return (
        <div className="border-2 border-dashed border-yellow-200 bg-yellow-50/50 rounded-xl p-8 flex flex-col items-center justify-center text-center min-h-[300px] animate-in fade-in duration-300">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
                <Construction className="w-8 h-8 text-yellow-600" />
            </div>
            <span className="font-bold text-xl text-gray-800 mb-2">System Maintenance</span>
            <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                {message}
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs text-yellow-700 bg-yellow-100 px-3 py-1.5 rounded-full font-medium">
                <Info className="w-3 h-3" />
                <span>Mohon cek kembali nanti</span>
            </div>
        </div>
    );
};

export default FeatureMaintenance;
