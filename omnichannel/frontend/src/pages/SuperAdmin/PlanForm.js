import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { FEATURE_CONFIG } from '../../config/featureConfig';
import { Save, X, Clock, AlertTriangle, Lock, CornerDownRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Define Dependencies (Child requires Parent to be enabled)
const FEATURE_DEPENDENCIES = {
    'feat_broadcast_limit': 'feat_broadcast',
    'feat_media_sending': 'feat_broadcast',
    'limit_messenger': 'channel_messenger',
    'limit_instagram': 'channel_instagram',
    'limit_telegram': 'channel_telegram',
    'limit_webchat': 'channel_webchat'
};

// Define Logical Display Order
const FEATURE_ORDER = [
    // Core Limits
    'feat_session_limit',
    'feat_agent_limit',

    // Broadcast Module & its sub-features
    'feat_broadcast',
    'feat_broadcast_limit',
    'feat_media_sending',

    // Other Core Modules
    'feat_chatbot',
    'feat_rotator',
    'feat_group_management',
    'feat_official_api',

    // Channels & their limits
    'channel_messenger', 'limit_messenger',
    'channel_instagram', 'limit_instagram',
    'channel_telegram', 'limit_telegram',
    'channel_webchat', 'limit_webchat'
];

export default function PlanForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const [basicInfo, setBasicInfo] = useState({
        name: '',
        price_monthly: 0,
        price_monthly_promo: '',
        price_yearly: 0,
        price_yearly_promo: '',
        description: '',
        is_trial_allowed: false,
        trial_days: 0
    });

    const [features, setFeatures] = useState([]);

    useEffect(() => {
        if (!id) {
            // Create Mode: Init defaults
            const initFeatures = Object.keys(FEATURE_CONFIG).map(code => ({
                code,
                is_enabled: false,
                limit_value: FEATURE_CONFIG[code].type === 'limit' ? 0 : null
            }));
            setFeatures(initFeatures);
        } else {
            fetchPlanDetails();
        }
    }, [id]);

    const fetchPlanDetails = async () => {
        try {
            const res = await axios.get(`/api/sa/plans/${id}`);
            const plan = res.data;
            setBasicInfo({
                name: plan.name,
                price_monthly: plan.price_monthly,
                price_monthly_promo: plan.price_monthly_promo || '',
                price_yearly: plan.price_yearly,
                price_yearly_promo: plan.price_yearly_promo || '',
                description: plan.description || '',
                is_trial_allowed: plan.is_trial_allowed || false,
                trial_days: plan.trial_days || 0
            });

            // Merge existing features with Config
            const mergedFeatures = Object.keys(FEATURE_CONFIG).map(code => {
                const existing = plan.features.find(f => f.code === code);
                return {
                    code,
                    is_enabled: existing ? existing.is_enabled : false,
                    limit_value: existing ? existing.limit_value : (FEATURE_CONFIG[code].type === 'limit' ? 0 : null)
                };
            });
            setFeatures(mergedFeatures);
        } catch (err) {
            toast.error("Failed to load plan");
            navigate('/admin/plans');
        }
    };

    const handleFeatureChange = (code, field, value) => {
        setFeatures(prev => {
            // Update current feature
            const newFeatures = prev.map(f => f.code === code ? { ...f, [field]: value } : f);

            // If disabling a parent feature, auto-disable dependent children
            if (field === 'is_enabled' && value === false) {
                const childrenCodes = Object.keys(FEATURE_DEPENDENCIES).filter(k => FEATURE_DEPENDENCIES[k] === code);
                childrenCodes.forEach(childCode => {
                    const childIndex = newFeatures.findIndex(f => f.code === childCode);
                    if (childIndex !== -1) {
                        newFeatures[childIndex].is_enabled = false;
                    }
                });
            }
            return newFeatures;
        });
    };

    // Helper to determine if price is active
    const isPriceActive = (p) => p !== null && p !== '' && p !== 0;

    const [pricingActive, setPricingActive] = useState({
        monthly: true,
        yearly: true
    });

    useEffect(() => {
        if (id && basicInfo.price_monthly !== undefined) {
            setPricingActive({
                monthly: isPriceActive(basicInfo.price_monthly),
                yearly: isPriceActive(basicInfo.price_yearly)
            });
        }
    }, [id, basicInfo.name]); // Trigger once loaded

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (pricingActive.monthly && basicInfo.price_monthly_promo && parseInt(basicInfo.price_monthly_promo) >= parseInt(basicInfo.price_monthly)) {
            return toast.error("Monthly Promo Price must be lower than Normal Price");
        }
        if (pricingActive.yearly && basicInfo.price_yearly_promo && parseInt(basicInfo.price_yearly_promo) >= parseInt(basicInfo.price_yearly)) {
            return toast.error("Yearly Promo Price must be lower than Normal Price");
        }

        setLoading(true);

        const payload = {
            ...basicInfo,
            price_monthly: pricingActive.monthly ? basicInfo.price_monthly : null,
            price_monthly_promo: (pricingActive.monthly && basicInfo.price_monthly_promo !== '') ? parseInt(basicInfo.price_monthly_promo) : null,
            price_yearly: pricingActive.yearly ? basicInfo.price_yearly : null,
            price_yearly_promo: (pricingActive.yearly && basicInfo.price_yearly_promo !== '') ? parseInt(basicInfo.price_yearly_promo) : null,
            features,
            // Force disable trial since removed from UI
            is_trial_allowed: false,
            trial_days: 0
        };

        try {
            if (id) {
                await axios.put(`/api/sa/plans/${id}`, payload);
                toast.success("Plan Updated Successfully");
            } else {
                await axios.post('/api/sa/plans', payload);
                toast.success("Plan Created Successfully");
            }
            navigate('/admin/plans');
        } catch (err) {
            toast.error("Failed to save: " + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    // Sort features based on Order
    const sortedFeatures = [...features].sort((a, b) => {
        const indexA = FEATURE_ORDER.indexOf(a.code);
        const indexB = FEATURE_ORDER.indexOf(b.code);
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    const isDependencyMet = (code) => {
        const parentCode = FEATURE_DEPENDENCIES[code];
        if (!parentCode) return true;
        const parent = features.find(f => f.code === parentCode);
        return parent && parent.is_enabled;
    };

    // JSX Changes below
    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">{id ? 'Edit Plan' : 'Create New Plan'}</h1>
                <button onClick={() => navigate('/admin/plans')} className="p-2 bg-white border rounded-full hover:bg-gray-50 transition-colors">
                    <X className="w-5 h-5 text-gray-500" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT COL: Basic Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Basic Information</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Plan Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    value={basicInfo.name}
                                    onChange={e => setBasicInfo({ ...basicInfo, name: e.target.value })}
                                    placeholder="e.g. Pro Plan"
                                />
                            </div>

                            {/* MONTHLY PRICING */}
                            <div className={`space-y-3 bg-gray-50 p-3 rounded-lg border transition-all ${pricingActive.monthly ? 'border-gray-100 opacity-100' : 'border-gray-100 opacity-60'}`}>
                                <div className="flex justify-between items-center">
                                    <p className="text-xs font-bold text-gray-500 uppercase">Monthly Pricing</p>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={pricingActive.monthly}
                                            onChange={e => setPricingActive({ ...pricingActive, monthly: e.target.checked })}
                                        />
                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] text-gray-500 mb-1">Normal Price</label>
                                        <input
                                            type="number"
                                            required={pricingActive.monthly}
                                            min="0"
                                            disabled={!pricingActive.monthly}
                                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                                            value={basicInfo.price_monthly}
                                            onChange={e => setBasicInfo({ ...basicInfo, price_monthly: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-500 mb-1">Promo (Optional)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            disabled={!pricingActive.monthly}
                                            className="w-full px-2 py-1.5 border border-indigo-200 bg-indigo-50 rounded text-sm focus:ring-indigo-500 disabled:bg-gray-100 disabled:border-gray-300"
                                            value={basicInfo.price_monthly_promo}
                                            onChange={e => setBasicInfo({ ...basicInfo, price_monthly_promo: e.target.value })}
                                            placeholder="Discounted"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* YEARLY PRICING */}
                            <div className={`space-y-3 bg-gray-50 p-3 rounded-lg border transition-all ${pricingActive.yearly ? 'border-gray-100 opacity-100' : 'border-gray-100 opacity-60'}`}>
                                <div className="flex justify-between items-center">
                                    <p className="text-xs font-bold text-gray-500 uppercase">Yearly Pricing</p>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={pricingActive.yearly}
                                            onChange={e => setPricingActive({ ...pricingActive, yearly: e.target.checked })}
                                        />
                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] text-gray-500 mb-1">Normal Price</label>
                                        <input
                                            type="number"
                                            required={pricingActive.yearly}
                                            min="0"
                                            disabled={!pricingActive.yearly}
                                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                                            value={basicInfo.price_yearly}
                                            onChange={e => setBasicInfo({ ...basicInfo, price_yearly: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-500 mb-1">Promo (Optional)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            disabled={!pricingActive.yearly}
                                            className="w-full px-2 py-1.5 border border-indigo-200 bg-indigo-50 rounded text-sm focus:ring-indigo-500 disabled:bg-gray-100 disabled:border-gray-300"
                                            value={basicInfo.price_yearly_promo}
                                            onChange={e => setBasicInfo({ ...basicInfo, price_yearly_promo: e.target.value })}
                                            placeholder="Discounted"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 h-24 text-sm"
                                    value={basicInfo.description}
                                    onChange={e => setBasicInfo({ ...basicInfo, description: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COL: Features */}
                <div className="lg:col-span-2">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 border-b pb-2">Feature Configuration</h3>

                        <div className="space-y-1 flex-1 overflow-y-auto max-h-[600px] custom-scrollbar pr-2">
                            {sortedFeatures.map((item) => {
                                const config = FEATURE_CONFIG[item.code];
                                if (!config) return null;

                                const dependencyMet = isDependencyMet(item.code);
                                const isChild = !!FEATURE_DEPENDENCIES[item.code];

                                return (
                                    <div
                                        key={item.code}
                                        className={`
                                        flex items-center justify-between p-4 rounded-lg border transition-all
                                        ${!dependencyMet ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100 hover:border-indigo-100 hover:shadow-sm'}
                                        ${isChild ? 'ml-8 border-l-4 border-l-indigo-100' : ''}
                                    `}
                                    >
                                        <div className="flex-1 pr-4">
                                            <div className="flex items-center gap-2">
                                                {isChild && <CornerDownRight className="w-4 h-4 text-gray-400" />}
                                                <p className={`font-bold text-sm ${item.is_enabled ? 'text-indigo-900' : 'text-gray-500'}`}>
                                                    {config.label}
                                                </p>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5 ml-6">{config.desc}</p>
                                            {!dependencyMet && (
                                                <div className="flex items-center gap-1 mt-1 ml-6 text-[10px] text-red-500 font-medium">
                                                    <Lock className="w-3 h-3" /> Requires {FEATURE_CONFIG[FEATURE_DEPENDENCIES[item.code]].label}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {/* Toggle Switch */}
                                            <label className={`relative inline-flex items-center ${dependencyMet ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={item.is_enabled}
                                                    disabled={!dependencyMet}
                                                    onChange={(e) => handleFeatureChange(item.code, 'is_enabled', e.target.checked)}
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                            </label>

                                            {/* Limit Input */}
                                            {config.type === 'limit' && (
                                                <div className="w-24 relative">
                                                    <input
                                                        type="number"
                                                        className={`w-full px-2 py-1.5 border rounded text-sm text-center font-bold transition-colors ${item.is_enabled ? 'border-indigo-300 bg-white text-indigo-700' : 'border-gray-200 bg-gray-100 text-gray-400'
                                                            }`}
                                                        placeholder="0"
                                                        value={item.limit_value === null ? '' : item.limit_value}
                                                        disabled={!item.is_enabled || !dependencyMet}
                                                        onChange={(e) => handleFeatureChange(item.code, 'limit_value', e.target.value === '' ? '' : parseInt(e.target.value))}
                                                    />
                                                </div>
                                            )}

                                            {/* Boolean Indicator */}
                                            {config.type === 'boolean' && (
                                                <div className="w-24 flex justify-center">
                                                    {item.is_enabled ? (
                                                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100">Active</span>
                                                    ) : (
                                                        <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded border border-gray-200">Locked</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-100 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => navigate('/admin/plans')}
                                className="px-6 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-8 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all transform active:scale-95"
                            >
                                <Save className="w-5 h-5" />
                                {loading ? 'Saving...' : 'Save Plan'}
                            </button>
                        </div>
                    </div>
                </div>

            </form>
        </div>
    );
}