import axios from 'axios';
import dns from 'dns';

class RajaOngkirClient {
    constructor() {
        this.baseUrls = {
            starter: 'https://rajaongkir.komerce.id/api/v1',
            basic: 'https://rajaongkir.komerce.id/api/v1',
            pro: 'https://rajaongkir.komerce.id/api/v1'
        };

        // Debug DNS
        try {
            dns.lookup('rajaongkir.komerce.id', (err, address) => {
                console.log('[RajaOngkir DNS Debug] rajaongkir.komerce.id resolves to:', address);
            });
        } catch (e) { }
    }

    getBaseUrl(accountType = 'starter') {
        return this.baseUrls[accountType] || this.baseUrls['starter'];
    }

    async request(apiKey, accountType, endpoint, method = 'GET', data = null) {
        try {
            const url = `${this.getBaseUrl(accountType)}${endpoint}`;
            const headers = {
                'key': apiKey,
            };

            // Komerce seems to prefer Form Data for Cost Calculation
            let requestData = data;

            if (method !== 'GET') {
                headers['content-type'] = 'application/x-www-form-urlencoded';

                // Manually serialize to form-urlencoded
                if (data && typeof data === 'object') {
                    const params = new URLSearchParams();
                    Object.keys(data).forEach(key => {
                        params.append(key, data[key]);
                    });
                    requestData = params;
                }
            }

            const config = {
                method,
                url,
                headers,
                data: requestData
            };

            console.log(`[RajaOngkir] Requesting: ${method} ${url}`);
            const response = await axios(config);
            // console.log(`[RajaOngkir] Response ${response.status}:`, response.data ? 'Data Received' : 'No Data');

            // Normalize Komerce Response
            if (response.data && response.data.data) {
                let rawData = response.data.data;

                // Normalization for COST Check (Flat List -> RajaOngkir Structure)
                if (Array.isArray(rawData) && rawData.length > 0 && rawData[0].cost !== undefined) {
                    const normalizedCosts = rawData.map(item => ({
                        service: item.service,
                        description: item.description,
                        cost: [{
                            value: item.cost,
                            etd: item.etd || ''
                        }]
                    }));

                    return {
                        rajaongkir: {
                            status: { code: 200, description: 'OK' },
                            results: [
                                {
                                    code: "komerce_aggregation",
                                    name: "All Couriers",
                                    costs: normalizedCosts
                                }
                            ]
                        }
                    };
                }

                // Normalization for PROVINCE/CITY List
                if (!response.data.rajaongkir) {
                    let results = Array.isArray(rawData) ? rawData : [rawData];
                    results = results.map(item => {
                        const newItem = { ...item };
                        if (newItem.name && !newItem.province) newItem.province = newItem.name;
                        if (newItem.id && !newItem.province_id) newItem.province_id = newItem.id;
                        if (newItem.name && !newItem.city_name) newItem.city_name = newItem.name;
                        if (newItem.id && !newItem.city_id) newItem.city_id = newItem.id;
                        if (!newItem.type) newItem.type = 'Kota/Kab';
                        return newItem;
                    });

                    return {
                        rajaongkir: {
                            status: { code: 200, description: 'OK' },
                            results: results
                        }
                    };
                }
            }

            return response.data;
        } catch (error) {
            console.error(`RajaOngkir API Error (${endpoint}):`, error.response?.data || error.message);
            throw error.response?.data || new Error('Failed to connect to RajaOngkir');
        }
    }

    async getProvinces(apiKey, accountType) {
        return this.request(apiKey, accountType, '/destination/province');
    }

    async getCities(apiKey, accountType, provinceId = null) {
        // Komerce usually uses path param: /destination/city/{province_id}
        const endpoint = provinceId ? `/destination/city/${provinceId}` : '/destination/city';
        return this.request(apiKey, accountType, endpoint);
    }

    async checkCost(apiKey, accountType, { origin, originType, destination, destinationType, weight, courier }) {
        // Komerce need Integers for IDs?
        const payload = {
            origin: parseInt(origin),
            destination: parseInt(destination),
            weight: parseInt(weight),
            courier,
            originType: originType || 'city',
            destinationType: destinationType || 'city'
        };

        console.log('[RajaOngkir] Check Cost Payload:', JSON.stringify(payload));
        return this.request(apiKey, accountType, '/calculate/domestic-cost', 'POST', payload);
    }
    async findCityByName(apiKey, accountType, cityName) {
        if (!cityName) return null;
        try {
            // Fetch all cities (no province filter)
            const response = await this.getCities(apiKey, accountType, null);
            const cities = response && response.rajaongkir ? response.rajaongkir.results : [];

            if (!cities.length) return null;

            const searchLower = cityName.toLowerCase();
            // Exact match
            let found = cities.find(c => c.city_name.toLowerCase() === searchLower);

            // If not found, try includes
            if (!found) {
                found = cities.find(c => c.city_name.toLowerCase().includes(searchLower));
            }

            return found || null;
        } catch (error) {
            console.error("Error finding city:", error);
            return null;
        }
    }
}

export default new RajaOngkirClient();
