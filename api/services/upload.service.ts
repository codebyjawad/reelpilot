import fs from 'fs';
import { logger } from '../utils/logger.js';

export const deleteFileIfExists = async (filePath: string): Promise<void> => {
    if (!filePath) return;
    try {
        await fs.promises.unlink(filePath);
    } catch (err: any) {
        if (err?.code !== 'ENOENT') {
            logger.warn(`Failed to delete file ${filePath}: ${err?.message ?? err}`);
        }
    }
};

export default {
    deleteFileIfExists,
};
