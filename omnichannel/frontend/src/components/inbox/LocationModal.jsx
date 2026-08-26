import React, { useState } from 'react';
import { X, MapPin, Search, Navigation } from 'lucide-react';
import Modal, { ModalFooter } from '../common/Modal';
import Button from '../common/Button';

/**
 * LocationModal - Send location via WhatsApp
 */
export default function LocationModal({ isOpen, onClose, onSend }) {
    const [locationName, setLocationName] = useState('');
    const [address, setAddress] = useState('');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState('');

    const handleSend = async () => {
        // Validate
        if (!latitude || !longitude) {
            setError('Koordinat latitude dan longitude diperlukan');
            return;
        }

        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);

        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            setError('Koordinat tidak valid. Latitude: -90 to 90, Longitude: -180 to 180');
            return;
        }

        setIsSending(true);
        setError('');

        try {
            await onSend({
                type: 'location',
                data: {
                    latitude: lat,
                    longitude: lng,
                    name: locationName || null,
                    address: address || null
                }
            });
            onClose();
        } catch (err) {
            setError('Gagal mengirim lokasi');
            console.error('Send location error:', err);
        } finally {
            setIsSending(false);
        }
    };

    // Try to get current location
    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation tidak didukung browser ini');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLatitude(position.coords.latitude.toString());
                setLongitude(position.coords.longitude.toString());
                setError('');
            },
            (err) => {
                setError('Tidak bisa mendapatkan lokasi: ' + err.message);
            }
        );
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Kirim Lokasi"
            size="md"
            footer={
                <ModalFooter>
                    <Button onClick={onClose} variant="ghost">
                        Batal
                    </Button>
                    <Button
                        onClick={handleSend}
                        disabled={!latitude || !longitude || isSending}
                        className="bg-green-500 hover:bg-green-600 text-white"
                    >
                        {isSending ? 'Mengirim...' : 'Kirim Lokasi'}
                    </Button>
                </ModalFooter>
            }
        >
            <div className="space-y-4">
                    {/* Current Location Button */}
                    <button
                        onClick={getCurrentLocation}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg border border-green-200 dark:border-green-800"
                    >
                        <Navigation className="w-4 h-4" />
                        <span className="font-medium">Gunakan Lokasi Saat Ini</span>
                    </button>

                    {/* Location Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Lokasi (opsional)</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={locationName}
                                onChange={(e) => setLocationName(e.target.value)}
                                placeholder="Contoh: Rumah, Kantor"
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Address */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alamat (opsional)</label>
                        <textarea
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Contoh: Jl. Sudirman No. 123, Jakarta"
                            rows={2}
                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                        />
                    </div>

                    {/* Coordinates */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Latitude <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={latitude}
                                onChange={(e) => { setLatitude(e.target.value); setError(''); }}
                                placeholder="-6.2088"
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Longitude <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={longitude}
                                onChange={(e) => { setLongitude(e.target.value); setError(''); }}
                                placeholder="106.8456"
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Map Link Preview */}
                    {latitude && longitude && (
                        <a
                            href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                            <Search className="w-4 h-4" />
                            Lihat di Google Maps
                        </a>
                    )}

                    {/* Error */}
                    {error && (
                        <p className="text-sm text-red-500">{error}</p>
                    )}
            </div>
        </Modal>
    );
}
