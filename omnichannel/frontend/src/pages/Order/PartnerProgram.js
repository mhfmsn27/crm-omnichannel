import React, { useEffect, useState } from 'react';
import {
    Copy, Wallet, Users, DollarSign, CreditCard,
    ArrowRight, Clock, CheckCircle, XCircle, MousePointerClick
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function PartnerProgram() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total_earnings: 0,
        paid_out: 0,
        balance: 0,
        total_referrals: 0
    });
    const [refLink, setRefLink] = useState('');
    const [refCode, setRefCode] = useState('');
    const [commissions, setCommissions] = useState([]);
    const [payouts, setPayouts] = useState([]);

    // Payout Form
    const [amount, setAmount] = useState('');
    const [bankDetails, setBankDetails] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [statsRes, commRes, payoutRes] = await Promise.all([
                axios.get('/api/app/affiliate/stats'),
                axios.get('/api/app/affiliate/commissions'),
                axios.get('/api/app/affiliate/payouts')
            ]);

            setStats(statsRes.data.stats);
            setRefLink(statsRes.data.referral_link);
            setRefCode(statsRes.data.referral_code);
            setCommissions(commRes.data);
            setPayouts(payoutRes.data);
        } catch (err) {
            console.error(err);
            toast.error("Gagal memuat data partner.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(refLink);
        toast.success("Link tersalin!");
    };

    const handlePayout = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await axios.post('/api/app/affiliate/request-payout', {
                amount: parseFloat(amount),
                bank_details: bankDetails
            });
            toast.success("Permintaan payout dikirim!");
            setAmount('');
            setBankDetails('');
            fetchData(); // Refresh
        } catch (err) {
            toast.error(err.response?.data?.error || "Gagal request payout");
        } finally {
            setSubmitting(false);
        }
    };

    const currency = (val) => "Rp " + parseInt(val).toLocaleString('id-ID');

    if (loading) return <div className="p-8 text-center">Loading Partner Data...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Users className="w-6 h-6 text-indigo-600" /> Affiliate Partner
                </h1>
                <p className="text-gray-500">Share your link and earn commissions.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT COLUMN - Main Info */}
                <div className="lg:col-span-2 space-y-8">

                    {/* BANNER */}
                    <div className="bg-indigo-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-xl font-bold mb-2">Your Referral Link</h2>
                            <p className="text-white/80 mb-6 text-sm">Share this link to track your referrals automatically.</p>

                            <div className="bg-white/10 backdrop-blur-md p-1 pl-4 rounded-xl flex items-center border border-white/20">
                                <code className="flex-1 text-sm font-mono truncate">{refLink}</code>
                                <button
                                    onClick={handleCopy}
                                    className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-50 transition-colors"
                                >
                                    <Copy className="w-4 h-4" /> Copy
                                </button>
                            </div>
                            <div className="mt-4 text-xs font-mono opacity-70">Referral Code: {refCode}</div>
                        </div>
                        {/* Decorative Circles */}
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-black/10 rounded-full blur-3xl"></div>
                    </div>

                    {/* STATS CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                            <span className="text-sm text-gray-500 font-medium">Total Earnings</span>
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-2xl font-bold text-gray-900">{currency(stats.total_earnings)}</span>
                                <div className="bg-green-100 p-2 rounded-lg text-green-600">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                            <span className="text-sm text-gray-500 font-medium">Total Referrals</span>
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-2xl font-bold text-gray-900">{stats.total_referrals}</span>
                                <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                                    <Users className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                            <span className="text-sm text-gray-500 font-medium">Paid Out</span>
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-2xl font-bold text-gray-900">{currency(stats.paid_out)}</span>
                                <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                            <span className="text-sm text-gray-500 font-medium">Total Clicks</span>
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-2xl font-bold text-gray-900">{stats.total_clicks || 0}</span>
                                <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                                    <MousePointerClick className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* COMMISSION HISTORY */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <h3 className="font-bold text-gray-900">Commission History</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium">
                                    <tr>
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Referred User</th>
                                        <th className="px-6 py-3">Amount</th>
                                        <th className="px-6 py-3 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {commissions.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-8 text-center text-gray-400 italic">No commissions yet.</td>
                                        </tr>
                                    ) : (
                                        commissions.map((c) => (
                                            <tr key={c.id}>
                                                <td className="px-6 py-3">{new Date(c.created_at).toLocaleDateString()}</td>
                                                <td className="px-6 py-3">
                                                    <div>{c.source_user_name || 'Unknown'}</div>
                                                    <div className="text-xs text-gray-400">{c.description}</div>
                                                </td>
                                                <td className="px-6 py-3 font-medium text-green-600">+{currency(c.amount)}</td>
                                                <td className="px-6 py-3 text-right">
                                                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 uppercase">
                                                        {c.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN - Wallet & Payout */}
                <div className="space-y-6">
                    {/* WALLET */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="font-bold text-gray-500 text-xs tracking-wider uppercase mb-1">YOUR WALLET</h3>
                        <div className="bg-gray-50 rounded-xl p-6 text-center mb-6 border border-dashed border-gray-300">
                            <div className="text-sm text-gray-500 mb-1">AVAILABLE BALANCE</div>
                            <div className="text-3xl font-extrabold text-indigo-600">{currency(stats.balance)}</div>
                        </div>

                        <form onSubmit={handlePayout} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Payout Amount</label>
                                <input
                                    type="number"
                                    className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    placeholder="Min 100.000"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    min="100000"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Bank Details</label>
                                <textarea
                                    className="w-full p-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all h-24 resize-none"
                                    placeholder="Bank Name, Account Number, Holder Name"
                                    value={bankDetails}
                                    onChange={e => setBankDetails(e.target.value)}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submitting || stats.balance < 100000}
                                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {submitting ? 'Requesting...' : <>Request Payout <ArrowRight className="w-4 h-4" /></>}
                            </button>
                            <p className="text-center text-xs text-gray-400">Minimum payout Rp 100.000</p>
                        </form>
                    </div>

                    {/* PAYOUT HISTORY */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase">Payout History</h3>
                        <div className="space-y-4">
                            {payouts.length === 0 ? (
                                <p className="text-center text-gray-400 text-sm py-4">No payout history.</p>
                            ) : (
                                payouts.map(p => (
                                    <div key={p.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0 border-gray-50">
                                        <div>
                                            <div className="font-medium text-gray-900">{currency(p.amount)}</div>
                                            <div className="text-xs text-gray-400">{new Date(p.requested_at).toLocaleDateString()}</div>
                                        </div>
                                        <div>
                                            {p.status === 'pending' && <span className="text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded text-xs font-bold">Pending</span>}
                                            {p.status === 'approved' && <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs font-bold">Paid</span>}
                                            {p.status === 'rejected' && <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs font-bold">Rejected</span>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
