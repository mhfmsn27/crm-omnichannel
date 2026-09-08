import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

// SECURE: Magic Number Validation for File Uploads
const MAGIC_NUMBERS = {
    // Images
    'jpeg': { bytes: [0xFF, 0xD8, 0xFF], offset: 0 },
    'jpg': { bytes: [0xFF, 0xD8, 0xFF], offset: 0 },
    'png': { bytes: [0x89, 0x50, 0x4E, 0x47], offset: 0 },
    'gif': { bytes: [0x47, 0x49, 0x46, 0x38], offset: 0 },
    'webp': { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },
    // Documents
    'pdf': { bytes: [0x25, 0x50, 0x44, 0x46], offset: 0 },
    'doc': { bytes: [0xD0, 0xCF, 0x11, 0xE0], offset: 0 },
    'docx': { bytes: [0x50, 0x4B, 0x03, 0x04], offset: 0 },
    'xls': { bytes: [0xD0, 0xCF, 0x11, 0xE0], offset: 0 },
    'xlsx': { bytes: [0x50, 0x4B, 0x03, 0x04], offset: 0 },
    // Text/CSV
    'txt': { bytes: null, offset: 0 },
    'csv': { bytes: null, offset: 0 },
};

const validateMagicNumber = (buffer, ext) => {
    const magicInfo = MAGIC_NUMBERS[ext.toLowerCase()];
    if (!magicInfo) return false;
    if (magicInfo.bytes === null) return true;

    for (let i = 0; i < magicInfo.bytes.length; i++) {
        if (buffer[magicInfo.offset + i] !== magicInfo.bytes[i]) {
            return false;
        }
    }
    return true;
};

const ALLOWED_MIME_TYPES = {
    'jpeg': 'image/jpeg',
    'jpg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'txt': 'text/plain',
    'csv': 'text/csv',
};

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let folder = 'uploads/';
        if (req.originalUrl.includes('/cms/')) folder = 'uploads/cms/';
        if (req.originalUrl.includes('/settings/')) folder = 'uploads/system/';
        if (req.originalUrl.includes('/webchat/')) folder = 'uploads/webchat/';
        if (req.originalUrl.includes('/products')) folder = 'uploads/products/';

        const fullPath = path.join(projectRoot, folder);
        if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });

        cb(null, fullPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const safeExt = ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        cb(null, file.fieldname + '-' + uniqueSuffix + '.' + safeExt);
    }
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const allowedExts = Object.keys(MAGIC_NUMBERS);

    if (!allowedExts.includes(ext)) {
        return cb(new Error(`Error: File type not allowed. Allowed: ${allowedExts.join(', ')}`));
    }

    const allowedMime = Object.values(ALLOWED_MIME_TYPES);
    if (!allowedMime.includes(file.mimetype)) {
        console.warn(`[Upload] Suspicious MIME type: ${file.mimetype} for file: ${file.originalname}`);
    }

    req.uploadedFileExt = ext;
    return cb(null, true);
};

export const multerUpload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024,
        files: 10
    }
});

export const robustUpload = (req, res, next) => {
    const upload = multerUpload.fields([
        { name: 'file', maxCount: 10 },
        { name: 'files', maxCount: 10 },
        { name: 'image', maxCount: 10 }
    ]);

    upload(req, res, async (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ error: `Upload Error: ${err.message} (Code: ${err.code})` });
            }
            return res.status(400).json({ error: err.message });
        }

        const allUploadedFiles = [
            ...(req.files?.['file'] || []),
            ...(req.files?.['files'] || []),
            ...(req.files?.['image'] || [])
        ];

        for (const uploadedFile of allUploadedFiles) {
            try {
                const fd = fs.openSync(uploadedFile.path, 'r');
                const buffer = Buffer.alloc(16);
                fs.readSync(fd, buffer, 0, 16, 0);
                fs.closeSync(fd);

                const ext = path.extname(uploadedFile.originalname).toLowerCase().replace('.', '');
                if (!validateMagicNumber(buffer, ext)) {
                    for (const f of allUploadedFiles) {
                        if (f.path && fs.existsSync(f.path)) {
                            try { fs.unlinkSync(f.path); } catch (_) {}
                        }
                    }
                    return res.status(400).json({
                        error: `File ${uploadedFile.originalname} content does not match its extension. Upload rejected for security.`
                    });
                }
            } catch (validationErr) {
                console.error('[Upload] Magic number validation error:', validationErr);
                for (const f of allUploadedFiles) {
                    if (f.path && fs.existsSync(f.path)) {
                        try { fs.unlinkSync(f.path); } catch (_) {}
                    }
                }
                return res.status(500).json({ error: 'File validation failed.' });
            }
        }

        if (allUploadedFiles.length > 0) {
            req.file = allUploadedFiles[0]; // Backward compatibility for single file handlers
            req.allFiles = allUploadedFiles; // Array of all uploaded files
        }

        next();
    });
};

