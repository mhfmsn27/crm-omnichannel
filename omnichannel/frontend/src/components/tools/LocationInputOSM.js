import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';
import axios from 'axios'; // Use axios for auth headers

const LocationInputOSM = ({ onSelect, initialValue = '' }) => {
    const [query, setQuery] = useState(initialValue);
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const debounceTimeout = useRef(null);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearch = async (value) => {
        if (!value || value.length < 3) {
            setSuggestions([]);
            return;
        }
        setIsLoading(true);
        try {
            // PROXY via Backend to avoid CORS issues
            const response = await axios.get('/api/app/tools/scraper/autocomplete', {
                params: { q: value }
            });
            setSuggestions(response.data);
            setIsOpen(true);
        } catch (error) {
            console.error("Error fetching location:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(() => {
            handleSearch(val);
        }, 600); // Reduced debounce slightly for responsiveness
    };

    const handleSelect = (item) => {
        setQuery(item.display_name);
        setSuggestions([]);
        setIsOpen(false);
        onSelect(item.display_name);
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div className="relative">
                <MapPin className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <input
                    type="text"
                    value={query}
                    onChange={handleChange}
                    placeholder="Ketik lokasi (misal: Tebet, Jakarta)..."
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                    onFocus={() => suggestions.length > 0 && setIsOpen(true)}
                />
                {isLoading && (
                    <div className="absolute right-3 top-3">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    </div>
                )}
                {!isLoading && query && (
                    <button onClick={() => { setQuery(''); onSelect(''); }} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {isOpen && suggestions.length > 0 && (
                <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-xl max-h-60 overflow-y-auto">
                    {suggestions.map((item) => (
                        <li
                            key={item.place_id}
                            onClick={() => handleSelect(item)}
                            className="px-4 py-3 hover:bg-indigo-50 cursor-pointer text-sm text-gray-700 border-b last:border-b-0 flex flex-col"
                        >
                            <span className="font-medium text-gray-900">{item.name || item.display_name.split(',')[0]}</span>
                            <span className="text-xs text-gray-500 truncate">{item.display_name}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default LocationInputOSM;