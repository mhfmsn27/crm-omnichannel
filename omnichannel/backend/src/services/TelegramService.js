import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'https://api.telegram.org/bot';

class TelegramService {
    
    // ... (getMe, setWebhook, deleteWebhook unchanged) ...
    async getMe(token) {
        try {
            const res = await axios.get(`${BASE_URL}${token}/getMe`);
            return res.data.result;
        } catch (error) {
            throw new Error(`Telegram getMe Error: ${error.response?.data?.description || error.message}`);
        }
    }

    async setWebhook(token, webhookUrl) {
        try {
            const res = await axios.post(`${BASE_URL}${token}/setWebhook`, { url: webhookUrl });
            return res.data.result;
        } catch (error) {
            throw new Error(`Telegram setWebhook Error: ${error.response?.data?.description || error.message}`);
        }
    }

    async deleteWebhook(token) {
        try { await axios.post(`${BASE_URL}${token}/deleteWebhook`); } catch (e) {}
    }

    async sendMessage(token, chatId, text) {
        try {
            const res = await axios.post(`${BASE_URL}${token}/sendMessage`, {
                chat_id: chatId,
                text: text
            });
            return res.data.result;
        } catch (error) {
            throw new Error(`Telegram Send Error: ${error.response?.data?.description || error.message}`);
        }
    }

    // Send Photo
    async sendPhoto(token, chatId, photoUrl, caption) {
        try {
            let formData = new FormData();
            formData.append('chat_id', chatId);
            if(caption) formData.append('caption', caption);

            // Check if local file
            if (photoUrl.startsWith('/') || photoUrl.includes('uploads/')) {
                const relativePath = photoUrl.startsWith('http') ? photoUrl.split('/uploads/')[1] : photoUrl.replace(/^\//, '');
                const localPath = path.join(__dirname, '../../', relativePath.includes('uploads') ? relativePath : `uploads/${relativePath}`);
                
                if (fs.existsSync(localPath)) {
                    formData.append('photo', fs.createReadStream(localPath));
                    
                    const res = await axios.post(`${BASE_URL}${token}/sendPhoto`, formData, {
                        headers: formData.getHeaders()
                    });
                    return res.data.result;
                }
            }
            
            // Fallback to URL
            const res = await axios.post(`${BASE_URL}${token}/sendPhoto`, {
                chat_id: chatId,
                photo: photoUrl,
                caption: caption
            });
            return res.data.result;

        } catch (error) {
            console.error("[Telegram] Send Photo Failed:", error.message);
            throw new Error(`Telegram Send Photo Error: ${error.message}`);
        }
    }
    
    // Send Document
    async sendDocument(token, chatId, docUrl, caption) {
        try {
            let formData = new FormData();
            formData.append('chat_id', chatId);
            if(caption) formData.append('caption', caption);

            // Check if local file
            // URL might be "https://.../uploads/file.pdf" or "/uploads/file.pdf"
            let localPath = null;
            
            if (docUrl.startsWith('/') && !docUrl.startsWith('http')) {
                // Relative path "/uploads/..."
                localPath = path.join(__dirname, '../../', docUrl.replace(/^\//, ''));
            } else if (docUrl.includes('/uploads/')) {
                // Full URL -> Extract filename
                const filename = docUrl.split('/uploads/')[1];
                localPath = path.join(__dirname, '../../uploads', filename);
            }

            if (localPath && fs.existsSync(localPath)) {
                 console.log(`[Telegram] Sending local file: ${localPath}`);
                 formData.append('document', fs.createReadStream(localPath));
                 
                 const res = await axios.post(`${BASE_URL}${token}/sendDocument`, formData, {
                     headers: formData.getHeaders()
                 });
                 return res.data.result;
            }

            // Fallback to URL
            const res = await axios.post(`${BASE_URL}${token}/sendDocument`, {
                chat_id: chatId,
                document: docUrl,
                caption: caption
            });
            return res.data.result;
        } catch (error) {
            console.error("[Telegram] Send Doc Failed:", error.message);
            throw new Error(`Telegram Send Doc Error: ${error.response?.data?.description || error.message}`);
        }
    }

    async getFileLink(token, fileId) {
        try {
            const res = await axios.get(`${BASE_URL}${token}/getFile`, { params: { file_id: fileId } });
            const filePath = res.data.result.file_path;
            return `https://api.telegram.org/file/bot${token}/${filePath}`;
        } catch (error) {
            return null;
        }
    }
}

export default new TelegramService();