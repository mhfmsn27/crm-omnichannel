/**
 * E-Commerce Integration Service
 * Shopee, Tokopedia, Lazada sync
 */

import pool from '../config/db.js';

let schemaInitialized = false;
export const ensureSchema = async () => {
    if (schemaInitialized) return;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ecommerce_connections (
                id SERIAL PRIMARY KEY,
                organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                platform VARCHAR(50) NOT NULL,
                store_name VARCHAR(255),
                store_id VARCHAR(100),
                api_key TEXT,
                api_secret TEXT,
                api_url TEXT,
                webhook_url TEXT,
                webhook_secret TEXT,
                auto_sync_products BOOLEAN DEFAULT FALSE,
                auto_sync_orders BOOLEAN DEFAULT FALSE,
                sync_interval_minutes INTEGER DEFAULT 30,
                last_sync_at TIMESTAMPTZ,
                is_active BOOLEAN DEFAULT FALSE,
                connection_status VARCHAR(20) DEFAULT 'disconnected',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_ecom_org ON ecommerce_connections(organization_id);
            CREATE INDEX IF NOT EXISTS idx_ecom_platform ON ecommerce_connections(platform);

            CREATE TABLE IF NOT EXISTS ecommerce_products (
                id SERIAL PRIMARY KEY,
                organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                connection_id BIGINT NOT NULL REFERENCES ecommerce_connections(id) ON DELETE CASCADE,
                external_product_id VARCHAR(100) NOT NULL,
                external_variant_ids JSONB DEFAULT '[]',
                name VARCHAR(255),
                description TEXT,
                price DECIMAL(15,2),
                stock INTEGER DEFAULT 0,
                status VARCHAR(20) DEFAULT 'active',
                images JSONB DEFAULT '[]',
                categories JSONB DEFAULT '[]',
                synced_at TIMESTAMPTZ DEFAULT NOW(),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(connection_id, external_product_id)
            );

            CREATE TABLE IF NOT EXISTS ecommerce_orders (
                id SERIAL PRIMARY KEY,
                organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                connection_id BIGINT NOT NULL REFERENCES ecommerce_connections(id) ON DELETE CASCADE,
                external_order_id VARCHAR(100) NOT NULL,
                external_status VARCHAR(50),
                customer_name VARCHAR(255),
                customer_phone VARCHAR(50),
                customer_address TEXT,
                items JSONB DEFAULT '[]',
                subtotal DECIMAL(15,2) DEFAULT 0,
                shipping_cost DECIMAL(15,2) DEFAULT 0,
                total_amount DECIMAL(15,2) DEFAULT 0,
                shipping_method VARCHAR(100),
                tracking_number VARCHAR(100),
                contact_id BIGINT REFERENCES contacts(id) ON DELETE SET NULL,
                conversation_id BIGINT REFERENCES conversations(id) ON DELETE SET NULL,
                sync_status VARCHAR(50) DEFAULT 'synced',
                order_time TIMESTAMPTZ DEFAULT NOW(),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(connection_id, external_order_id)
            );
        `);
        schemaInitialized = true;
    } catch (e) {
        console.warn('[Ecommerce] ensureSchema warning:', e.message);
    }
};

/**
 * Get e-commerce connections for organization
 */
export const getConnections = async (organizationId) => {
    try {
        await ensureSchema();
        const result = await pool.query(
            'SELECT * FROM ecommerce_connections WHERE organization_id = $1 ORDER BY created_at DESC',
            [organizationId]
        );
        return result.rows;
    } catch (error) {
        console.error('[Ecommerce] Error getting connections:', error);
        return [];
    }
};

/**
 * Create/update connection
 */
export const saveConnection = async (organizationId, connectionData) => {
    const {
        id, platform, storeName, storeId, apiKey, apiSecret,
        webhookUrl, webhookSecret, autoSyncProducts, autoSyncOrders,
        syncIntervalMinutes, isActive
    } = connectionData;

    try {
        await ensureSchema();
        if (id) {
            // Update existing
            const result = await pool.query(
                `UPDATE ecommerce_connections SET
                 platform = $3,
                 store_name = COALESCE($4, store_name),
                 store_id = COALESCE($5, store_id),
                 api_key = COALESCE($6, api_key),
                 api_secret = COALESCE($7, api_secret),
                 webhook_url = COALESCE($8, webhook_url),
                 webhook_secret = COALESCE($9, webhook_secret),
                 auto_sync_products = COALESCE($10, auto_sync_products),
                 auto_sync_orders = COALESCE($11, auto_sync_orders),
                 sync_interval_minutes = COALESCE($12, sync_interval_minutes),
                 is_active = COALESCE($13, is_active),
                 updated_at = NOW()
                 WHERE id = $1 AND organization_id = $2
                 RETURNING *`,
                [id, organizationId, platform, storeName, storeId, apiKey, apiSecret,
                    webhookUrl, webhookSecret, autoSyncProducts, autoSyncOrders, syncIntervalMinutes, isActive]
            );
            return result.rows[0];
        } else {
            // Create new
            const result = await pool.query(
                `INSERT INTO ecommerce_connections
                 (organization_id, platform, store_name, store_id, api_key, api_secret,
                  webhook_url, webhook_secret, auto_sync_products, auto_sync_orders,
                  sync_interval_minutes, is_active)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                 RETURNING *`,
                [organizationId, platform, storeName, storeId, apiKey, apiSecret,
                    webhookUrl, webhookSecret, autoSyncProducts, autoSyncOrders, syncIntervalMinutes || 30, isActive || false]
            );
            return result.rows[0];
        }
    } catch (error) {
        console.error('[Ecommerce] Error saving connection:', error);
        throw error;
    }
};

/**
 * Delete connection
 */
export const deleteConnection = async (organizationId, connectionId) => {
    try {
        await pool.query(
            'DELETE FROM ecommerce_connections WHERE id = $1 AND organization_id = $2',
            [connectionId, organizationId]
        );
        return true;
    } catch (error) {
        console.error('[Ecommerce] Error deleting connection:', error);
        return false;
    }
};

/**
 * Test connection (placeholder - actual implementation depends on platform API)
 */
export const testConnection = async (organizationId, connectionId) => {
    try {
        const connRes = await pool.query(
            'SELECT * FROM ecommerce_connections WHERE id = $1 AND organization_id = $2',
            [connectionId, organizationId]
        );

        if (connRes.rows.length === 0) {
            return { success: false, error: 'Connection not found' };
        }

        const conn = connRes.rows[0];

        // Update status
        await pool.query(
            `UPDATE ecommerce_connections
             SET connection_status = 'connected', updated_at = NOW()
             WHERE id = $1`,
            [connectionId]
        );

        return {
            success: true,
            message: `Connected to ${conn.platform} store: ${conn.store_name || conn.store_id}`
        };
    } catch (error) {
        console.error('[Ecommerce] Test connection error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get products from e-commerce
 */
export const getProducts = async (organizationId, connectionId, options = {}) => {
    const { search, status = 'active' } = options;

    try {
        await ensureSchema();
        let query = `
            SELECT ep.*, ec.store_name, ec.platform
            FROM ecommerce_products ep
            JOIN ecommerce_connections ec ON ep.connection_id = ec.id
            WHERE ep.organization_id = $1
        `;
        const params = [organizationId];
        let idx = 2;

        if (connectionId) {
            query += ` AND ep.connection_id = $${idx}`;
            params.push(connectionId);
            idx++;
        }

        if (search) {
            query += ` AND ep.name ILIKE $${idx}`;
            params.push(`%${search}%`);
            idx++;
        }

        if (status) {
            query += ` AND ep.status = $${idx}`;
            params.push(status);
            idx++;
        }

        query += ' ORDER BY ep.synced_at DESC LIMIT 100';

        const result = await pool.query(query, params);
        return result.rows;
    } catch (error) {
        console.error('[Ecommerce] Error getting products:', error);
        return [];
    }
};

/**
 * Get orders from e-commerce
 */
export const getOrders = async (organizationId, options = {}) => {
    const { connectionId, status, search } = options;

    try {
        await ensureSchema();
        let query = `
            SELECT eo.*, ec.store_name, ec.platform,
                   c.name as contact_name, c.phone_number as contact_phone
            FROM ecommerce_orders eo
            JOIN ecommerce_connections ec ON eo.connection_id = ec.id
            LEFT JOIN contacts c ON eo.contact_id = c.id
            WHERE eo.organization_id = $1
        `;
        const params = [organizationId];
        let idx = 2;

        if (connectionId) {
            query += ` AND eo.connection_id = $${idx}`;
            params.push(connectionId);
            idx++;
        }

        if (status) {
            query += ` AND eo.external_status = $${idx}`;
            params.push(status);
            idx++;
        }

        if (search) {
            query += ` AND (eo.external_order_id ILIKE $${idx} OR c.name ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }

        query += ' ORDER BY eo.order_time DESC LIMIT 100';

        const result = await pool.query(query, params);
        return result.rows;
    } catch (error) {
        console.error('[Ecommerce] Error getting orders:', error);
        return [];
    }
};

/**
 * Link order to conversation
 */
export const linkOrderToConversation = async (organizationId, orderId, conversationId) => {
    try {
        // Get order and contact
        const orderRes = await pool.query(
            'SELECT * FROM ecommerce_orders WHERE id = $1 AND organization_id = $2',
            [orderId, organizationId]
        );

        if (orderRes.rows.length === 0) {
            throw new Error('Order not found');
        }

        const order = orderRes.rows[0];

        // Get or create contact
        let contactId = order.contact_id;

        if (!contactId && order.customer_phone) {
            const contactRes = await pool.query(
                'SELECT id FROM contacts WHERE organization_id = $1 AND phone_number = $2',
                [organizationId, order.customer_phone]
            );

            if (contactRes.rows.length > 0) {
                contactId = contactRes.rows[0].id;
            } else {
                const newContact = await pool.query(
                    `INSERT INTO contacts (organization_id, name, phone_number, source)
                     VALUES ($1, $2, $3, $4) RETURNING id`,
                    [organizationId, order.customer_name || 'E-Commerce Customer', order.customer_phone, order.platform]
                );
                contactId = newContact.rows[0].id;
            }

            // Update order with contact_id
            await pool.query(
                'UPDATE ecommerce_orders SET contact_id = $1 WHERE id = $2',
                [contactId, orderId]
            );
        }

        // Update conversation
        if (conversationId) {
            await pool.query(
                `UPDATE conversations SET
                 ecommerce_order_id = $1
                 WHERE id = $2 AND organization_id = $3`,
                [orderId, conversationId, organizationId]
            );
        }

        // Update order with conversation
        await pool.query(
            `UPDATE ecommerce_orders SET
             conversation_id = $3, sync_status = 'linked'
             WHERE id = $1 AND organization_id = $2`,
            [orderId, organizationId, conversationId]
        );

        return { success: true, contactId };
    } catch (error) {
        console.error('[Ecommerce] Error linking order:', error);
        throw error;
    }
};

/**
 * Get product catalog for quick reply
 */
export const getProductCatalog = async (organizationId, options = {}) => {
    const { connectionId, limit = 20 } = options;

    try {
        await ensureSchema();
        let query = `
            SELECT ep.*, ec.platform
            FROM ecommerce_products ep
            JOIN ecommerce_connections ec ON ep.connection_id = ec.id
            WHERE ep.organization_id = $1
            AND ep.status = 'active'
            AND ec.is_active = true
        `;
        const params = [organizationId];

        if (connectionId) {
            query += ' AND ep.connection_id = $2';
            params.push(connectionId);
        }

        query += ' ORDER BY ep.name LIMIT $' + (params.length + 1);
        params.push(limit);

        const result = await pool.query(query, params);
        return result.rows;
    } catch (error) {
        console.error('[Ecommerce] Error getting catalog:', error);
        return [];
    }
};

/**
 * Sync products from platform (placeholder)
 */
export const syncProducts = async (organizationId, connectionId) => {
    try {
        // Update last sync time
        await pool.query(
            'UPDATE ecommerce_connections SET last_sync_at = NOW() WHERE id = $1 AND organization_id = $2',
            [connectionId, organizationId]
        );

        // In real implementation, this would call platform API
        // For now, return success
        return { success: true, synced: 0 };
    } catch (error) {
        console.error('[Ecommerce] Sync error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get available platforms
 */
export const getAvailablePlatforms = () => {
    return [
        {
            id: 'shopee',
            name: 'Shopee',
            logo: '/icons/shopee.svg',
            color: '#EE4D2D',
            features: ['products', 'orders', 'webhooks']
        },
        {
            id: 'tokopedia',
            name: 'Tokopedia',
            logo: '/icons/tokopedia.svg',
            color: '#03AC0E',
            features: ['products', 'orders']
        },
        {
            id: 'lazada',
            name: 'Lazada',
            logo: '/icons/lazada.svg',
            color: '#0D1588',
            features: ['products', 'orders']
        },
        {
            id: 'blibli',
            name: 'Blibli',
            logo: '/icons/blibli.svg',
            color: '#E31837',
            features: ['products', 'orders']
        },
        {
            id: 'woocommerce',
            name: 'WooCommerce',
            logo: '/icons/woocommerce.svg',
            color: '#96588A',
            features: ['products', 'orders', 'webhooks']
        },
        {
            id: 'custom',
            name: 'Custom API',
            logo: '/icons/api.svg',
            color: '#6366F1',
            features: ['webhooks']
        }
    ];
};

/**
 * Get order stats
 */
export const getOrderStats = async (organizationId) => {
    try {
        await ensureSchema();
        const statsRes = await pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE sync_status = 'synced') as synced_orders,
                COUNT(*) FILTER (WHERE sync_status = 'linked') as linked_orders,
                COUNT(*) FILTER (WHERE external_status = 'unpaid') as unpaid_orders,
                COUNT(*) FILTER (WHERE external_status = 'paid') as paid_orders,
                COUNT(*) FILTER (WHERE external_status = 'shipped') as shipped_orders,
                SUM(total_amount) FILTER (WHERE external_status = 'paid') as total_revenue
            FROM ecommerce_orders
            WHERE organization_id = $1
        `, [organizationId]);

        return statsRes.rows[0] || {
            synced_orders: 0,
            linked_orders: 0,
            unpaid_orders: 0,
            paid_orders: 0,
            shipped_orders: 0,
            total_revenue: 0
        };
    } catch (error) {
        console.error('[Ecommerce] Error getting stats:', error);
        return {
            synced_orders: 0,
            linked_orders: 0,
            unpaid_orders: 0,
            paid_orders: 0,
            shipped_orders: 0,
            total_revenue: 0
        };
    }
};