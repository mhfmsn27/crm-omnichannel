import * as toolService from '../services/toolService.js';
import scraperService from '../services/scraperService.js';
import { Queue } from 'bullmq';
import redisConnection from '../config/redis.js';
import fs from 'fs';
import { checkFeatureAccess } from '../services/featureGateService.js'; // Import Gate

const checkQueue = new Queue('number-check-queue', { connection: redisConnection });

// NEW: Generic Tool Stats Checker
export const getToolStats = async (req, res) => {
    const { organization_id } = req.user;
    const { tool_code } = req.query; // tool_warmer, tool_scraper, etc.

    try {
        if (!tool_code) return res.status(400).json({ error: "Tool code required" });

        const access = await checkFeatureAccess(organization_id, tool_code);
        res.json({
            allowed: access.allowed,
            locked: !access.allowed,
            message: access.message
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- NUMBER CHECKER ENDPOINTS ---

export const startCheck = async (req, res) => {
    const { name, device_id, input_type, manual_numbers } = req.body;
    const { organization_id } = req.user;
    const file = req.file;

    // 1. Check Feature
    const access = await checkFeatureAccess(organization_id, 'tool_number_check');
    if (!access.allowed) {
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(403).json({ error: access.message, upsell: true });
    }

    try {
        let numbers = [];
        if (input_type === 'file' && file) {
            numbers = toolService.parseExcelNumbers(file.path);
        } else if (input_type === 'manual' && manual_numbers) {
            numbers = manual_numbers.split('\n').map(n => n.trim()).filter(n => n);
        }

        if (numbers.length === 0) {
            if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
            return res.status(400).json({ error: "No valid numbers found." });
        }

        const batchId = await toolService.createBatch(organization_id, name, device_id, numbers);
        await checkQueue.add('process-batch', { batchId, numbers, deviceId: device_id, orgId: organization_id });

        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);

        res.status(201).json({ message: 'Batch started', batchId, count: numbers.length });
    } catch (err) {
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        res.status(500).json({ error: err.message });
    }
};

export const getHistory = async (req, res) => {
    try {
        const batches = await toolService.getBatches(req.user.organization_id);
        res.json(batches);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const getBatchDetail = async (req, res) => {
    const { id } = req.params;
    const { page, status } = req.query;
    try {
        const data = await toolService.getBatchDetails(req.user.organization_id, id, page, 50, status);
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const saveContacts = async (req, res) => {
    const { id } = req.params;
    const { label_id, new_label_name } = req.body;
    try {
        await toolService.saveValidContacts(req.user.organization_id, id, label_id, new_label_name);
        res.json({ message: 'Contacts saved successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const exportResult = async (req, res) => {
    const { id } = req.params;
    try {
        const { buffer, filename } = await toolService.generateExport(req.user.organization_id, id);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- GROUP EXTRACTOR ENDPOINTS ---

export const getGroups = async (req, res) => {
    const { device_id } = req.query;
    if (!device_id) return res.status(400).json({ error: "Device ID required" });

    // Feature Check
    const access = await checkFeatureAccess(req.user.organization_id, 'tool_group_grab');
    if (!access.allowed) return res.status(403).json({ error: access.message, upsell: true });

    try {
        const groups = await toolService.fetchGroups(device_id);
        res.json(groups);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const extractGroup = async (req, res) => {
    const { device_id, group_jid } = req.body;
    try {
        const data = await toolService.extractGroupMembers(device_id, group_jid);
        res.json(data);
    } catch (err) {
        console.error("[GroupExtractor] Error:", err.message);
        let statusCode = 500;
        if (err.message.includes("not found")) statusCode = 404;
        if (err.message.includes("Device session")) statusCode = 409;
        if (err.message.includes("timed out")) statusCode = 504;
        res.status(statusCode).json({ error: err.message });
    }
};

export const saveGroupContacts = async (req, res) => {
    const { contacts, label_name } = req.body;
    const { organization_id } = req.user;
    try {
        const result = await toolService.saveGroupContacts(organization_id, contacts, label_name);
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- GMAPS SCRAPER ENDPOINTS ---

export const proxyAutocomplete = async (req, res) => {
    const { q } = req.query;
    if (!q || q.length < 3) return res.json([]);

    try {
        const results = await scraperService.autocompleteLocation(q);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: "Autocomplete failed" });
    }
};

export const saveScraperConfig = async (req, res) => {
    const { provider, api_key } = req.body;
    const { organization_id } = req.user;

    // Feature Check
    const access = await checkFeatureAccess(organization_id, 'tool_scraper');
    if (!access.allowed) return res.status(403).json({ error: access.message, upsell: true });

    try {
        await scraperService.saveConfig(organization_id, provider, api_key);
        res.json({ message: 'Configuration saved' });
    } catch (err) {
        res.status(500).json({ error: "Failed to save config: " + err.message });
    }
};

export const getScraperConfig = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const config = await scraperService.getConfig(organization_id);
        res.json({
            has_google: !!config.google_places,
            has_serpapi: !!config.serpapi
        });
    } catch (err) {
        console.error("[Scraper Config] Error:", err);
        res.json({ has_google: false, has_serpapi: false });
    }
};

export const searchLeads = async (req, res) => {
    const { keyword, location, provider, pageToken, offset } = req.body;
    const { organization_id } = req.user;

    // Feature Check
    const access = await checkFeatureAccess(organization_id, 'tool_scraper');
    if (!access.allowed) return res.status(403).json({ error: access.message, upsell: true });

    try {
        const results = await scraperService.search(organization_id, keyword, location, provider, { pageToken, offset });
        res.json(results);
    } catch (err) {
        console.error("[Scraper Search] Error:", err);
        res.status(500).json({ error: err.message });
    }
};

export const getScraperHistory = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const history = await scraperService.getHistory(organization_id);
        res.json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getScraperHistoryDetail = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    try {
        const results = await scraperService.getHistoryDetail(organization_id, id);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const saveLeads = async (req, res) => {
    const { contacts: leads, label_name } = req.body;
    const { organization_id } = req.user;
    try {
        const result = await toolService.saveGroupContacts(organization_id, leads, label_name);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};