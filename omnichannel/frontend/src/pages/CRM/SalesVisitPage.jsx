import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    MapPin, Camera, User, Calendar, Plus, Search, 
    Navigation, ExternalLink, ShieldCheck, CheckCircle2, Clock 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal, { ModalFooter } from '../../components/common/Modal';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';

export default function SalesVisitPage() {
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [gettingLocation, setGettingLocation] = useState(false);

    const [form, setForm] = useState({
        customer_name: '',
        location_name: '',
        address: '',
        notes: '',
        photo_url: '',
        latitude: null,
        longitude: null
    });

    useEffect(() => {
        fetchVisits();
    }, []);

    const fetchVisits = async () => {
        try {
            const res = await axios.get('/api/app/sales-visits');
            setVisits(res.data || []);
        } catch (err) {
            toast.error("Gagal memuat riwayat kunjungan");
        } finally {
            setLoading(false);
        }
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            return toast.error("Browser tidak mendukung geolokasi GPS");
        }
        setGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setForm(prev => ({
                    ...prev,
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude
                }));
                toast.success(`Koordinat GPS terdeteksi: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
                setGettingLocation(false);
            },
            (err) => {
                toast.error("Gagal mendeteksi lokasi: " + err.message);
                setGettingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleCheckinSubmit = async () => {
        if (!form.customer_name) return toast.error("Nama klien / toko wajib diisi");
        if (!form.latitude || !form.longitude) return toast.error("Silakan deteksi koordinat GPS terlebih dahulu");

        setSubmitting(true);
        try {
            await axios.post('/api/app/sales-visits', form);
            toast.success("Check-in kunjungan sales berhasil dicatat!");
            setIsCheckinModalOpen(false);
            setForm({
                customer_name: '',
                location_name: '',
                address: '',
                notes: '',
                photo_url: '',
                latitude: null,
                longitude: null
            });
            fetchVisits();
        } catch (err) {
            toast.error("Gagal check-in: " + (err.response?.data?.error || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    const filteredVisits = visits.filter(v => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
            (v.customer_name || '').toLowerCase().includes(s) ||
            (v.sales_name || '').toLowerCase().includes(s) ||
            (v.location_name || '').toLowerCase().includes(s) ||
            (v.notes || '').toLowerCase().includes(s)
        );
    });

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-600 text-white rounded-2xl shadow-md">
                            <Navigation className="w-6 h-6" />
                        </div>
                        Field Sales GPS Visit Tracking
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        Pencatatan check-in kunjungan sales lapangan dengan akurasi GPS real-time, foto toko/klien, dan notula meeting.
                    </p>
                </div>
                <Button 
                    onClick={() => {
                        setIsCheckinModalOpen(true);
                        handleGetLocation();
                    }}
                    leftIcon={<Plus className="w-4 h-4" />}
                    className="!bg-indigo-600 hover:!bg-indigo-700 text-white font-bold shadow-md"
                >
                    + Check-in Kunjungan Baru
                </Button>
            </div>

            {/* Search Bar */}
            <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-gray-200 dark:border-slate-800 flex justify-between items-center">
                <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 outline-none"
                        placeholder="Cari nama klien / sales / lokasi..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Visits Cards Grid */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : filteredVisits.length === 0 ? (
                <EmptyState
                    title="Belum Ada Riwayat Kunjungan"
                    description="Tim sales lapangan dapat mencatat kunjungan klien secara langsung dengan koordinat GPS real-time."
                    icon="map-pin"
                    action={{
                        label: 'Check-in Kunjungan Pertama',
                        onClick: () => {
                            setIsCheckinModalOpen(true);
                            handleGetLocation();
                        },
                        icon: Navigation
                    }}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredVisits.map(v => (
                        <div key={v.id} className="p-5 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-black text-gray-900 dark:text-white text-base">{v.customer_name}</h3>
                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                        <User className="w-3 h-3 text-indigo-600" /> Sales: <span className="font-bold text-gray-700 dark:text-slate-300">{v.sales_name}</span>
                                    </p>
                                </div>
                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {new Date(v.checkin_time).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                                </span>
                            </div>

                            <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl space-y-1.5 text-xs">
                                <div className="flex items-start gap-1.5 text-gray-600 dark:text-slate-300">
                                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                                    <span>{v.location_name || v.address || `GPS: ${v.latitude}, ${v.longitude}`}</span>
                                </div>
                                {v.notes && (
                                    <p className="text-gray-700 dark:text-slate-400 italic pt-1 border-t border-gray-200 dark:border-slate-700">
                                        "{v.notes}"
                                    </p>
                                )}
                            </div>

                            {v.latitude && v.longitude && (
                                <a
                                    href={`https://www.google.com/maps?q=${v.latitude},${v.longitude}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" /> Lihat di Google Maps
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Check-in Modal */}
            <Modal
                isOpen={isCheckinModalOpen}
                onClose={() => setIsCheckinModalOpen(false)}
                title="Check-in Kunjungan Sales Lapangan"
                size="md"
                footer={
                    <ModalFooter className="w-full flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
                        <Button variant="outline" onClick={() => setIsCheckinModalOpen(false)} fullWidth className="sm:w-auto">Batal</Button>
                        <Button 
                            onClick={handleCheckinSubmit} 
                            disabled={submitting} 
                            fullWidth 
                            className="sm:w-auto !bg-indigo-600 hover:!bg-indigo-700 text-white font-bold"
                        >
                            {submitting ? 'Menyimpan...' : 'Konfirmasi Check-in GPS'}
                        </Button>
                    </ModalFooter>
                }
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Nama Klien / Toko</label>
                        <input
                            className="w-full border p-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                            placeholder="Contoh: Toko Berkah Abadi / PT Maju Jaya"
                            value={form.customer_name}
                            onChange={e => setForm({ ...form, customer_name: e.target.value })}
                        />
                    </div>

                    {/* GPS Coordinates Box */}
                    <div className="p-3 bg-indigo-50/70 dark:bg-slate-800/80 rounded-xl border border-indigo-100 dark:border-slate-700 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-800 dark:text-white flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-rose-500" /> Koordinat GPS
                            </span>
                            <button
                                type="button"
                                onClick={handleGetLocation}
                                disabled={gettingLocation}
                                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                {gettingLocation ? 'Mendeteksi...' : 'Perbarui Lokasi GPS'}
                            </button>
                        </div>
                        <div className="text-xs font-mono text-gray-600 dark:text-slate-300">
                            {form.latitude && form.longitude ? (
                                <span className="text-emerald-600 font-bold">
                                    Lat: {form.latitude.toFixed(6)}, Long: {form.longitude.toFixed(6)}
                                </span>
                            ) : (
                                <span className="text-rose-500 italic">Lokasi belum terdeteksi. Izinkan akses GPS browser.</span>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Nama Lokasi / Alamat</label>
                        <input
                            className="w-full border p-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                            placeholder="Contoh: Ruko Golden City Blok A2, Bekasi"
                            value={form.location_name}
                            onChange={e => setForm({ ...form, location_name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Catatan Hasil Kunjungan / Notula</label>
                        <textarea
                            rows={3}
                            className="w-full border p-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white"
                            placeholder="Tuliskan poin hasil diskusi dengan prospek..."
                            value={form.notes}
                            onChange={e => setForm({ ...form, notes: e.target.value })}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
