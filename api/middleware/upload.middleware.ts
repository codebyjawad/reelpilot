import multer, { diskStorage } from 'multer';
import { resolve, extname } from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { config } from '../config/index.js';

const ALLOWED_EXTENSIONS = new Set(['.mp4', '.mov', '.webm', '.mkv', '.avi']);

const ensureVideoDir = (): string => {
    const videoDir = resolve(config.UPLOAD_DIR, 'videos');
    fs.mkdirSync(videoDir, { recursive: true });
    return videoDir;
};

const storage = diskStorage({
    destination: (_req, _file, cb) => {
        try {
            const videoDir = ensureVideoDir();
            cb(null, videoDir);
        } catch (err) {
            cb(err as Error, '');
        }
    },
    filename: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        const filename = randomUUID() + ext;
        cb(null, filename);
    },
});

const fileFilter = (
    _req: any,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
) => {
    const ext = extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Allowed: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}`));
    }
};

export const uploadVideo = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: config.MAX_VIDEO_SIZE_MB * 1024 * 1024,
    },
}).single('video');

export default uploadVideo;
