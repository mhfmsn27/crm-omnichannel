import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Truck, MapPin, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';

export default function CheckOngkirModal({ isOpen, onClose, onSend }) {
    const [step, setStep] = useState(1); // 1: Input, 2: Results
    const [loading, setLoading] = useState(false);

    // Form Data
    const [weight, setWeight] = useState(1000); // Grams
    const [destinationId, setDestinationId] = useState('');
    const [destinationName, setDestinationName] = useState(''); // Display name
    const [courier, setCourier] = useState('jne');

    // Data Lists
    const [provinces, setProvinces] = useState([]);
    const [cities, setCities] = useState([]);
    const [selectedProvince, setSelectedProvince] = useState('');

    const [results, setResults] = useState([]);
    const [originName, setOriginName] = useState('');

    const [defaultOriginName, setDefaultOriginName] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadProvinces();
            loadSettings();
        }
    }, [isOpen]);

    const loadSettings = async () => {
        try {
            const res = await axios.get('/api/app/settings/ongkir');
            if (res.data.default_origin_city_name) {
                setDefaultOriginName(res.data.default_origin_city_name);
                setOriginName(res.data.default_origin_city_name);
            }
        } catch (err) { }
    };

    // Fetch Provinces on Load
    const loadProvinces = async () => {
        try {
            const res = await axios.get('/api/app/ongkir/provinces');
            setProvinces(res.data.rajaongkir.results || []);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load provinces");
        }
    };

    // Fetch Cities when Province changes
    const handleProvinceChange = async (e) => {
        const provId = e.target.value;
        setSelectedProvince(provId);
        setCities([]);
        setDestinationId('');
        setDestinationName(''); // Reset destination name

        if (provId) {
            setLoading(true);
            try {
                const res = await axios.get(`/api/app/ongkir/cities/${provId}`);
                setCities(res.data.rajaongkir.results || []);
            } catch (err) {
                console.error(err);
            } finally { setLoading(false); }
        }
    };

    const handleCheckCost = async () => {
        if (!destinationId || !weight) {
            toast.error("Please fill all fields");
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post('/api/app/ongkir/check', {
                destination: destinationId,
                weight: parseInt(weight),
                courier: courier
            });

            const ra = res.data.rajaongkir;
            // Use API returned origin OR fallback to default settings origin
            setOriginName(ra.origin_details?.city_name || defaultOriginName || 'Kota Asal');
            setResults(ra.results?.[0]?.costs || []);
            setStep(2);
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || "Failed to check cost");
        } finally {
            setLoading(false);
        }
    };

    const handleSendResult = (costItem) => {
        const service = costItem.service; // e.g. REG
        const costVal = costItem.cost[0].value;
        const etd = costItem.cost[0].etd; // e.g. 1-2
        const formattedCost = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(costVal);

        const etdStr = etd ? `Estimasi: ${etd} hari` : '';
        const message = `*Ongkos Kirim ${courier.toUpperCase()} - ${service}*\nDari: ${originName}\nKe: ${destinationName}\nBerat: ${weight}g\n\nHarga: ${formattedCost}\n${etdStr}`;

        onSend(message);
        onClose();
        // Reset
        setStep(1);
        setResults([]);
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-indigo-500" /> Cek Ongkir
                </div>
            }
            size="md"
            className="max-h-[90vh] p-0 flex flex-col"
        >
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
                {step === 1 ? (
                    <div className="space-y-4">
                        {/* Destination */}
                        <div className="space-y-3">
                            <label className="block text-xs font-bold text-gray-500 uppercase">Tujuan Pengiriman</label>

                            <select
                                className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={selectedProvince}
                                onChange={handleProvinceChange}
                            >
                                <option value="">Pilih Provinsi</option>
                                {provinces.map(p => (
                                    <option key={p.province_id} value={p.province_id}>{p.province}</option>
                                ))}
                            </select>

                            <select
                                className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                                value={destinationId}
                                onChange={(e) => {
                                    setDestinationId(e.target.value);
                                    const city = cities.find(c => String(c.city_id) === String(e.target.value));
                                    if (city) setDestinationName(`${city.type} ${city.city_name}`);
                                }}
                                disabled={!selectedProvince}
                            >
                                <option value="">Pilih Kota/Kabupaten</option>
                                {cities.map(c => (
                                    <option key={c.city_id} value={c.city_id}>{c.type} {c.city_name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Weight & Courier */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Berat (Gram)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        className="w-full p-2.5 pl-9 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                                        value={weight}
                                        onChange={e => setWeight(e.target.value)}
                                        min="1"
                                    />
                                    <Package className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kurir</label>
                                <select
                                    className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                                    value={courier}
                                    onChange={e => setCourier(e.target.value)}
                                >
                                    <option value="jne">JNE</option>
                                    <option value="pos">POS</option>
                                    <option value="tiki">TIKI</option>
                                    <option value="jnt">J&T</option>
                                    <option value="sicepat">SiCepat</option>
                                    <option value="wahana">Wahana</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleCheckCost}
                            disabled={loading || !destinationId}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-bold shadow-lg shadow-indigo-500/20 transition-all flex justify-center items-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Memuat...' : <><Search className="w-4 h-4" /> Cek Harga</>}
                        </button>
                    </div>
                ) : (
                    // Results Step
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                            <div>
                                <p><span className="font-bold">Ke:</span> {destinationName}</p>
                                <p><span className="font-bold">Berat:</span> {weight}g ({courier.toUpperCase()})</p>
                            </div>
                            <button onClick={() => setStep(1)} className="text-indigo-600 hover:underline text-xs">Ubah</button>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                            {results.length === 0 ? (
                                <p className="text-center text-gray-500 py-4">Tidak ada layanan tersedia.</p>
                            ) : (
                                results.map((item, idx) => (
                                    <div key={idx} className="border border-gray-100 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex justify-between items-center group">
                                        <div>
                                            <p className="font-bold text-gray-800 dark:text-gray-200">{item.service}</p>
                                            <p className="text-xs text-gray-500">{item.description} ({item.cost[0].etd} hari)</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-indigo-600 dark:text-indigo-400">
                                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.cost[0].value)}
                                            </p>
                                            <button
                                                onClick={() => handleSendResult(item)}
                                                className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                                            >
                                                Kirim
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <button onClick={() => setStep(1)} className="w-full text-gray-500 text-sm hover:underline mt-2">Kembali</button>
                    </div>
                )}
            </div>
        </Modal>
    );
}
