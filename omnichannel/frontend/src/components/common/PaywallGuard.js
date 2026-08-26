import React from 'react';
import { Lock, Crown, ArrowRight } from 'lucide-react';
import { useConfig } from '../../context/ConfigContext';

export default function PaywallGuard({ feature, children, title, description, minPlan }) {
    const { hasFeature, loading } = useConfig();

    if (loading) return null; // Or a spinner

    if (hasFeature(feature)) {
        return <>{children}</>;
    }

    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[300px] md:min-h-[400px] text-center p-4 md:p-8 m-2 md:m-4 rounded-3xl border-2 border-dashed border-red-200 bg-[linear-gradient(135deg,#fef2f2_25%,#ffffff_25%,#ffffff_50%,#fef2f2_50%,#fef2f2_75%,#ffffff_75%,#ffffff_100%)] bg-[length:20px_20px]">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 border border-red-50">
                <Lock className="w-8 h-8 text-red-500" />
            </div>

            <div className="flex items-center gap-2 mb-3">
                <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <h2 className="text-xl font-bold text-gray-900">
                    Premium Feature
                </h2>
            </div>

            {title && <h3 className="text-md font-medium text-gray-600 mb-2">{title}</h3>}

            <p className="text-gray-500 max-w-md mb-8 leading-relaxed">
                {description || "Unlock this feature to manage your workflow efficiently."}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
                <a
                    href="/order"
                    className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-200 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                >
                    Upgrade Plan <ArrowRight className="w-4 h-4" />
                </a>
            </div>

            {minPlan && (
                <p className="mt-6 text-xs text-gray-400 font-medium uppercase tracking-wide">
                    Available on {minPlan} Plan
                </p>
            )}
        </div>
    );
}
