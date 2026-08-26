import * as formService from '../services/formService.js';
import XLSX from 'xlsx';

export const getForms = async (req, res) => {
    try {
        const forms = await formService.getForms(req.user.organization_id);
        res.json(forms);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createForm = async (req, res) => {
    try {
        const form = await formService.createForm(req.user.organization_id, req.body);
        res.status(201).json(form);
    } catch (err) {
        if(err.code === '23505') return res.status(400).json({ error: "Keyword already exists" });
        res.status(500).json({ error: err.message });
    }
};

export const updateForm = async (req, res) => {
    try {
        const form = await formService.updateForm(req.user.organization_id, req.params.id, req.body);
        if(!form) return res.status(404).json({ error: "Not found" });
        res.json(form);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const deleteForm = async (req, res) => {
    try {
        await formService.deleteForm(req.user.organization_id, req.params.id);
        res.json({ message: "Deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getSubmissions = async (req, res) => {
    try {
        const subs = await formService.getSubmissions(req.user.organization_id, req.params.id);
        res.json(subs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// NEW: EXPORT EXCEL
export const exportSubmissions = async (req, res) => {
    try {
        const subs = await formService.getSubmissions(req.user.organization_id, req.params.id);
        
        if (subs.length === 0) return res.status(404).json({ error: "No data" });

        // Flatten data for excel
        const flatData = subs.map(s => ({
            Date: new Date(s.created_at).toLocaleString(),
            Contact: s.contact_name,
            Phone: s.phone_number,
            ...s.data, // Spread the JSON answers
            PDF_Link: s.generated_pdf_url ? `${process.env.APP_URL}${s.generated_pdf_url}` : '-'
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(flatData);
        XLSX.utils.book_append_sheet(wb, ws, "Submissions");
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', `attachment; filename="submissions-${req.params.id}.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};