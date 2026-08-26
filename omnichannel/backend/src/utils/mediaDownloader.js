import fs from 'fs';
import path from 'path';
import axios from 'axios';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

const ensureDirectory = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

/**
 * Downloads media from a URL and saves it locally.
 * Returns the relative path to the saved file (e.g., /uploads/messenger/abc.jpg)
 */
export const downloadMedia = async (url, subfolder = 'general', headers = {}) => {
    try {
        if (!url) return null;

        // Create directory
        const uploadDir = path.join(ROOT_DIR, 'uploads', subfolder);
        ensureDirectory(uploadDir);

        // Fetch the file as a stream
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
            timeout: 30000, // 30 second timeout to prevent hanging
            headers: headers // Pass custom headers (e.g. Authorization for Meta)
        });

        // Determine extension (try content-type or fallback)
        let ext = '.bin';
        const contentType = response.headers['content-type'];
        if (contentType) {
            if (contentType.includes('image/jpeg')) ext = '.jpg';
            else if (contentType.includes('image/png')) ext = '.png';
            else if (contentType.includes('image/webp')) ext = '.webp';
            else if (contentType.includes('video/mp4')) ext = '.mp4';
            else if (contentType.includes('audio/mpeg')) ext = '.mp3';
            else if (contentType.includes('audio/ogg')) ext = '.ogg';
            else if (contentType.includes('application/pdf')) ext = '.pdf';
        } else {
            // Try URL
            const urlExt = path.extname(new URL(url).pathname);
            if (urlExt) ext = urlExt;
        }

        // Generate filename
        const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
        const filePath = path.join(uploadDir, filename);

        // Pipe to file
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                writer.destroy();
                reject(new Error('Stream write timeout after 60 seconds'));
            }, 60000);

            writer.on('finish', () => {
                clearTimeout(timeout);
                resolve(`/uploads/${subfolder}/${filename}`);
            });
            writer.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    } catch (error) {
        console.error(`[MediaDownloader] Error downloading ${url}:`, error.message);
        return url; // Fallback to original URL if download fails?
    }
};
