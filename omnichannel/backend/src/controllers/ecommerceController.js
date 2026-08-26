/**
 * E-Commerce Controller
 */

import * as ecommerceService from "../services/ecommerceService.js";

export const getConnections = async (req, res) => {
    const { organization_id } = req.user;

    try {
        const connections = await ecommerceService.getConnections(organization_id);
        res.json(connections);
    } catch (error) {
        console.error('[Ecommerce] Connections error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const saveConnection = async (req, res) => {
    const { organization_id } = req.user;

    try {
        const connection = await ecommerceService.saveConnection(organization_id, req.body);
        res.json(connection);
    } catch (error) {
        console.error('[Ecommerce] Save error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const deleteConnection = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;

    try {
        await ecommerceService.deleteConnection(organization_id, parseInt(id));
        res.json({ message: 'Connection deleted' });
    } catch (error) {
        console.error('[Ecommerce] Delete error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const testConnection = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;

    try {
        const result = await ecommerceService.testConnection(organization_id, parseInt(id));
        res.json(result);
    } catch (error) {
        console.error('[Ecommerce] Test error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getProducts = async (req, res) => {
    const { organization_id } = req.user;
    const { connectionId, search } = req.query;

    try {
        const products = await ecommerceService.getProducts(organization_id, connectionId ? parseInt(connectionId) : null, { search });
        res.json(products);
    } catch (error) {
        console.error('[Ecommerce] Products error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getOrders = async (req, res) => {
    const { organization_id } = req.user;
    const { connectionId, status, search } = req.query;

    try {
        const orders = await ecommerceService.getOrders(organization_id, {
            connectionId: connectionId ? parseInt(connectionId) : null,
            status,
            search
        });
        res.json(orders);
    } catch (error) {
        console.error('[Ecommerce] Orders error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const linkOrder = async (req, res) => {
    const { organization_id } = req.user;
    const { orderId } = req.params;
    const { conversationId } = req.body;

    try {
        const result = await ecommerceService.linkOrderToConversation(
            organization_id,
            parseInt(orderId),
            conversationId ? parseInt(conversationId) : null
        );
        res.json(result);
    } catch (error) {
        console.error('[Ecommerce] Link error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getCatalog = async (req, res) => {
    const { organization_id } = req.user;
    const { connectionId, limit } = req.query;

    try {
        const products = await ecommerceService.getProductCatalog(organization_id, {
            connectionId: connectionId ? parseInt(connectionId) : null,
            limit: limit ? parseInt(limit) : 20
        });
        res.json(products);
    } catch (error) {
        console.error('[Ecommerce] Catalog error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const syncProducts = async (req, res) => {
    const { organization_id } = req.user;
    const { connectionId } = req.params;

    try {
        const result = await ecommerceService.syncProducts(organization_id, parseInt(connectionId));
        res.json(result);
    } catch (error) {
        console.error('[Ecommerce] Sync error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getPlatforms = async (req, res) => {
    res.json(ecommerceService.getAvailablePlatforms());
};

export const getOrderStats = async (req, res) => {
    const { organization_id } = req.user;

    try {
        const stats = await ecommerceService.getOrderStats(organization_id);
        res.json(stats);
    } catch (error) {
        console.error('[Ecommerce] Stats error:', error);
        res.status(500).json({ error: error.message });
    }
};