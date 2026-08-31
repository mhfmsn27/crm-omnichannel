import express from 'express';
import * as toolController from '../controllers/toolController.js';
import { robustUpload } from '../middleware/uploadMiddleware.js';
import { checkPlanFeature } from '../middleware/planMiddleware.js';

const router = express.Router();

router.get('/stats', toolController.getToolStats);

// Number Checker
router.post('/check-number/start', robustUpload, checkPlanFeature('tool_number_check'), toolController.startCheck);
router.get('/check-number/history', toolController.getHistory);
router.get('/check-number/:id', toolController.getBatchDetail);
router.get('/check-number/:id/export', toolController.exportResult);
router.post('/check-number/:id/save-contacts', toolController.saveContacts);

// Group Extractor
router.get('/groups', toolController.getGroups);
router.post('/groups/extract', checkPlanFeature('tool_group_extractor'), toolController.extractGroup);
router.post('/groups/save', checkPlanFeature('tool_group_extractor'), toolController.saveGroupContacts);

// GMaps Scraper
router.get('/scraper/autocomplete', toolController.proxyAutocomplete);
router.post('/scraper/config', toolController.saveScraperConfig);
router.get('/scraper/config', toolController.getScraperConfig);
router.post('/scraper/search', checkPlanFeature('tool_scraper'), toolController.searchLeads);
router.get('/scraper/history', toolController.getScraperHistory);
router.get('/scraper/history/:id', toolController.getScraperHistoryDetail);
router.post('/scraper/save', checkPlanFeature('tool_scraper'), toolController.saveLeads);

export default router;
