import * as systemGateService from '../../services/systemGateService.js';

export const getFlags = async (req, res) => {
    try {
        const flags = await systemGateService.getAllFlags();
        res.json(flags);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateFlag = async (req, res) => {
    const { key } = req.params;
    const { is_active, maintenance_message } = req.body;
    
    try {
        const result = await systemGateService.updateFlag(key, is_active, maintenance_message);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};