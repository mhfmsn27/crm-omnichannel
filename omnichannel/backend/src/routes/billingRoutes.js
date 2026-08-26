import express from 'express';
import * as invoiceController from '../controllers/invoiceController.js';
import * as productController from '../controllers/productController.js';
import * as ongkirController from '../controllers/ongkirController.js';
import { robustUpload } from '../middleware/uploadMiddleware.js';
import { checkSystemFlag } from '../services/systemGateService.js';

const router = express.Router();

// --- Invoices ---
router.get('/invoices', checkSystemFlag('fin_invoice'), invoiceController.getInvoices);
router.get('/invoices/stats', checkSystemFlag('fin_invoice'), invoiceController.getStats);
router.get('/invoices/kpi', checkSystemFlag('fin_invoice'), invoiceController.getSalesKpi);
router.get('/invoices/:id', checkSystemFlag('fin_invoice'), invoiceController.getInvoiceDetail);
router.post('/invoices', checkSystemFlag('fin_invoice'), invoiceController.createInvoice);
router.post('/invoices/quick-link', checkSystemFlag('fin_invoice'), invoiceController.createQuickLink);
router.post('/invoices/:id/convert-to-invoice', checkSystemFlag('fin_invoice'), invoiceController.convertToInvoice);
router.put('/invoices/:id', checkSystemFlag('fin_invoice'), invoiceController.updateInvoice);
router.delete('/invoices/:id', checkSystemFlag('fin_invoice'), invoiceController.deleteInvoice);
router.post('/invoices/bulk', checkSystemFlag('fin_invoice'), invoiceController.createBulkInvoices);
router.get('/invoices/:id/download', checkSystemFlag('fin_invoice'), invoiceController.downloadPdf);
router.post('/invoices/:id/send', checkSystemFlag('fin_invoice'), invoiceController.sendInvoiceWA);
router.post('/invoices/:id/send-qris', checkSystemFlag('fin_invoice'), invoiceController.sendInvoiceQrisWA);
router.get('/invoices/:id/qris', checkSystemFlag('fin_invoice'), invoiceController.getInvoiceQris);
router.post('/invoices/:id/mark-paid', checkSystemFlag('fin_invoice'), invoiceController.markAsPaid);
router.get('/invoices/:id/payments', checkSystemFlag('fin_invoice'), invoiceController.getPaymentHistory);
router.post('/invoices/generate-from-chat', checkSystemFlag('fin_invoice'), invoiceController.generateInvoiceDraft);
router.post('/invoices/create-from-draft', checkSystemFlag('fin_invoice'), invoiceController.createInvoiceFromDraft);

// --- Invoice Settings & Gateway Config ---
router.get('/invoice-settings', checkSystemFlag('fin_invoice'), invoiceController.getSettings);
router.put('/invoice-settings', checkSystemFlag('fin_invoice'), invoiceController.updateSettings);
router.post('/invoice-settings/upload', checkSystemFlag('fin_invoice'), robustUpload, invoiceController.uploadLogo);
router.get('/invoice-gateway', checkSystemFlag('fin_invoice'), invoiceController.getGatewayConfigs);
router.post('/invoice-gateway', checkSystemFlag('fin_invoice'), invoiceController.saveGatewayConfig);
router.delete('/invoice-gateway/:gateway_type', checkSystemFlag('fin_invoice'), invoiceController.deleteGatewayConfig);
router.post('/invoice-gateway/test', checkSystemFlag('fin_invoice'), invoiceController.testGatewayConnection);

// --- Product Catalog ---
router.get('/products/categories', productController.getCategories);
router.post('/products/categories', productController.createCategory);
router.put('/products/categories/:id', productController.updateCategory);
router.delete('/products/categories/:id', productController.deleteCategory);
router.get('/products', productController.getProducts);
router.get('/products/:id', productController.getProduct);
router.post('/products', robustUpload, productController.createProduct);
router.put('/products/:id', robustUpload, productController.updateProduct);
router.delete('/products/:id', productController.deleteProduct);

// --- Ongkir Shipping Calculator ---
router.get('/settings/ongkir', ongkirController.getSettings);
router.put('/settings/ongkir', ongkirController.updateSettings);
router.get('/ongkir/provinces', ongkirController.getProvinces);
router.get('/ongkir/cities/:provinceId', ongkirController.getCities);
router.post('/ongkir/check', ongkirController.checkCost);

export default router;
