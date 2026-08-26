import pool from '../config/db.js';
import axios from 'axios';

class ScraperService {

    // --- AUTO MIGRATION ---
    async ensureTables() {
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS integration_settings (
                    id BIGSERIAL PRIMARY KEY,
                    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
                    provider VARCHAR(50) NOT NULL,
                    credentials JSONB NOT NULL,
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE(organization_id, provider)
                );
            `);
            await pool.query(`
                CREATE TABLE IF NOT EXISTS scraper_history (
                    id BIGSERIAL PRIMARY KEY,
                    organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
                    keyword VARCHAR(255) NOT NULL,
                    location VARCHAR(255) NOT NULL,
                    provider_used VARCHAR(50),
                    total_results INTEGER DEFAULT 0,
                    results_data JSONB,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            `);
            try {
                await pool.query("CREATE INDEX idx_scraper_history_org ON scraper_history(organization_id)");
            } catch (e) { /* Ignore if exists */ }

        } catch (err) {
            console.warn("Auto-migration for scraper failed:", err.message);
        }
    }

    // --- CONFIGURATION ---

    async saveConfig(orgId, provider, apiKey) {
        await this.ensureTables();

        if (!provider || !apiKey) {
            throw new Error("Provider and API Key are required");
        }

        const credentials = { api_key: apiKey };

        await pool.query(
            `INSERT INTO integration_settings (organization_id, provider, credentials, is_active)
             VALUES ($1, $2, $3, true)
             ON CONFLICT (organization_id, provider) 
             DO UPDATE SET credentials = EXCLUDED.credentials, is_active = true, updated_at = NOW()`,
            [orgId, provider, credentials]
        );
    }

    async getConfig(orgId) {
        await this.ensureTables();

        try {
            const res = await pool.query(
                "SELECT provider, credentials FROM integration_settings WHERE organization_id = $1 AND is_active = true",
                [orgId]
            );

            const config = {};
            if (res.rows.length > 0) {
                res.rows.forEach(r => {
                    if (r.credentials && r.credentials.api_key) {
                        config[r.provider] = r.credentials.api_key;
                    }
                });
            }
            return config;
        } catch (error) {
            console.warn("Failed to fetch scraper config:", error.message);
            return {};
        }
    }

    // --- SEARCH LOGIC ---

    async search(orgId, keyword, location, preferredProvider = 'serpapi', pagination = {}) {
        await this.ensureTables();

        const configs = await this.getConfig(orgId);

        let resultObj = { results: [], nextPageToken: null, nextOffset: null };
        let providerUsed = '';

        if (preferredProvider === 'google_places' && configs.google_places) {
            resultObj = await this.searchWithGoogle(configs.google_places, keyword, location, pagination.pageToken);
            providerUsed = 'google_places';
        } else if (configs.serpapi) {
            resultObj = await this.searchWithSerpApi(configs.serpapi, keyword, location, pagination.offset);
            providerUsed = 'serpapi';
        } else {
            throw new Error("API Key not configured. Please setup API Key in settings.");
        }

        const { results } = resultObj;

        if (results.length > 0) {
            try {
                // Only save history on first page search to avoid spamming history with partial pages
                // OR save every batch. Let's save every batch for now or maybe just the first one?
                // User requirement: "results yang ditampilkan hanya 1 halaman, tampilkan hasil lebih banyak"
                // Usually history tracks the "Search Attempt". Let's log it.
                await pool.query(
                    `INSERT INTO scraper_history (organization_id, keyword, location, provider_used, total_results, results_data)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [orgId, keyword, location, providerUsed, results.length, JSON.stringify(results)]
                );
            } catch (err) {
                console.warn("Failed to save scraper history:", err.message);
            }
        }

        return resultObj;
    }

    async getHistory(orgId) {
        await this.ensureTables();
        try {
            const res = await pool.query(
                "SELECT id, keyword, location, provider_used, total_results, created_at FROM scraper_history WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 20",
                [orgId]
            );
            return res.rows;
        } catch (error) {
            return [];
        }
    }

    async getHistoryDetail(orgId, id) {
        await this.ensureTables();
        const res = await pool.query(
            "SELECT results_data FROM scraper_history WHERE id = $1 AND organization_id = $2",
            [id, orgId]
        );
        if (res.rows.length === 0) return [];
        return res.rows[0].results_data;
    }

    // --- AUTOCOMPLETE PROXY (FIX CORS) ---
    async autocompleteLocation(query) {
        try {
            const response = await axios.get('https://nominatim.openstreetmap.org/search', {
                params: {
                    format: 'json',
                    q: query,
                    addressdetails: 1,
                    limit: 5
                },
                headers: {
                    'User-Agent': 'ReplySaaS-Proxy/1.0 (contact@reply.co.id)' // Required by Nominatim
                }
            });
            return response.data;
        } catch (error) {
            console.error("Nominatim Proxy Error:", error.message);
            return [];
        }
    }

    // --- PROVIDER IMPLEMENTATIONS ---

    async searchWithGoogle(apiKey, keyword, location, pageToken = null) {
        try {
            const textQuery = `${keyword} in ${location}`;
            const isNextPage = !!pageToken;

            const payload = isNextPage ? { textQuery, pageToken } : { textQuery };

            const response = await axios.post(
                'https://places.googleapis.com/v1/places:searchText',
                payload,
                {
                    headers: {
                        'X-Goog-Api-Key': apiKey,
                        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.rating,places.websiteUri,nextPageToken'
                    }
                }
            );

            if (!response.data.places) return { results: [], nextPageToken: null };

            const results = response.data.places
                .filter(p => p.nationalPhoneNumber)
                .map(p => ({
                    name: p.displayName?.text,
                    address: p.formattedAddress,
                    phone: this.normalizePhone(p.nationalPhoneNumber),
                    rating: p.rating || 0,
                    website: p.websiteUri || ''
                }));

            return {
                results,
                nextPageToken: response.data.nextPageToken || null
            };

        } catch (err) {
            console.error("Google Places API Error:", err.response?.data || err.message);
            throw new Error("Google API Error: " + (err.response?.data?.error?.message || err.message));
        }
    }

    async searchWithSerpApi(apiKey, keyword, location, offset = 0) {
        try {
            const query = `${keyword} in ${location}`;

            const response = await axios.get('https://serpapi.com/search.json', {
                params: {
                    engine: 'google_maps',
                    q: query,
                    type: 'search',
                    api_key: apiKey,
                    num: 20,
                    start: offset
                }
            });

            if (!response.data.local_results) return { results: [], nextOffset: null };

            const results = response.data.local_results
                .filter(p => p.phone)
                .map(p => ({
                    name: p.title,
                    address: p.address,
                    phone: this.normalizePhone(p.phone),
                    rating: p.rating || 0,
                    website: p.website || ''
                }));

            // Determine if next page is available
            // SerpApi logic: if we got results (e.g. 20), assume there might be next page.
            // If < 20, probably end of list.
            const hasNext = results.length > 0 && response.data.serpapi_pagination?.next;

            return {
                results,
                nextOffset: hasNext ? (parseInt(offset) + 20) : null
            };

        } catch (err) {
            console.error("SerpApi Error:", err.response?.data || err.message);
            const msg = err.response?.data?.error || err.message;
            throw new Error("SerpApi Error: " + msg);
        }
    }

    // --- HELPER ---
    normalizePhone(raw) {
        if (!raw) return '';
        let p = String(raw).replace(/[^0-9]/g, '');
        if (p.startsWith('0')) p = '62' + p.slice(1);
        else if (p.startsWith('8')) p = '62' + p;
        return p;
    }
}

export default new ScraperService();