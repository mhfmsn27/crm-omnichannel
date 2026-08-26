
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Package, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PlanList() {
  const [plans, setPlans] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await axios.get('/api/sa/plans');
      setPlans(res.data);
    } catch (err) {
      console.error("Failed to fetch plans", err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this plan? If it has active subscribers, it will be archived instead.')) return;
    try {
      await axios.delete(`/api/sa/plans/${id}`);
      fetchPlans();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete plan');
    }
  };

  // Helper to get a feature value safely
  const getFeatVal = (plan, code) => {
    const f = plan.features.find(item => item.code === code);
    if (!f) return '-';
    return f.is_enabled ? (f.limit_value !== null ? f.limit_value : <Check className="w-4 h-4 text-green-500" />) : '-';
  };

  const PriceDisplay = ({ normal, promo }) => (
      <div>
          {promo ? (
              <div className="flex flex-col">
                  <span className="text-xs text-gray-400 line-through">Rp {parseInt(normal).toLocaleString('id-ID')}</span>
                  <span className="font-bold text-green-600">Rp {parseInt(promo).toLocaleString('id-ID')}</span>
              </div>
          ) : (
              <span className="font-mono">Rp {parseInt(normal).toLocaleString('id-ID')}</span>
          )}
      </div>
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
          <p className="text-sm text-gray-500">Manage pricing tiers and feature limits.</p>
        </div>
        <button 
          onClick={() => navigate('/admin/plans/create')}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Create New Plan
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Plan Name</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Price (Monthly)</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Devices</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Broadcast</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Subscribers</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {plans.map((plan) => (
              <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{plan.name}</p>
                      <p className="text-xs text-gray-500 max-w-[150px] truncate">{plan.description}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">
                  <PriceDisplay normal={plan.price_monthly} promo={plan.price_monthly_promo} />
                </td>
                <td className="px-6 py-4 text-sm">
                  {getFeatVal(plan, 'feat_session_limit')}
                </td>
                <td className="px-6 py-4 text-sm">
                  {getFeatVal(plan, 'feat_broadcast')} 
                  {plan.features.find(f => f.code === 'feat_broadcast')?.is_enabled && (
                     <span className="text-xs text-gray-400 ml-1">
                       ({getFeatVal(plan, 'feat_broadcast_limit')})
                     </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {plan.subscriber_count} Users
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button 
                        onClick={() => navigate(`/admin/plans/${plan.id}/edit`)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => handleDelete(plan.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {plans.length === 0 && (
               <tr>
                 <td colSpan="6" className="px-6 py-12 text-center text-gray-500">No plans found. Create one to get started.</td>
               </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
