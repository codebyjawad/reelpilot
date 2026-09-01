import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenvConfig({ path: resolve(__dirname, '../../.env') });

const getEnv = (key: string, defaultValue?: string): string => {
    const value = process.env[key];
    if (value === undefined && defaultValue === undefined) {
        throw new Error(`Environment variable ${key} is not set`);
    }
    return value ?? (defaultValue as string);
};

const getEnvNumber = (key: string, defaultValue?: number): number => {
    const value = process.env[key];
    if (value === undefined) {
        if (defaultValue === undefined) {
            throw new Error(`Environment variable ${key} is not set`);
        }
        return defaultValue;
    }
    const num = parseInt(value, 10);
    if (isNaN(num)) {
        throw new Error(`Environment variable ${key} must be a number`);
    }
    return num;
};

export interface AppConfig {
    NODE_ENV: 'development' | 'production' | 'test';
    PORT: number;
    FRONTEND_URL: string;
    UPLOAD_DIR: string;
    MAX_VIDEO_SIZE_MB: number;
    ENCRYPTION_KEY: string;
    DB_HOST: string;
    DB_PORT: number;
    DB_USER: string;
    DB_PASSWORD: string;
    DB_NAME: string;
    JWT_ACCESS_SECRET: string;
    JWT_REFRESH_SECRET: string;
    ACCESS_TTL: string;
    REFRESH_TTL: string;
    FACEBOOK_APP_ID: string;
    FACEBOOK_APP_SECRET: string;
    FACEBOOK_CALLBACK_URL: string;
}

export const config: AppConfig = {
    NODE_ENV: (getEnv('NODE_ENV', 'development') as AppConfig['NODE_ENV']),
    PORT: getEnvNumber('PORT', 3000),
    FRONTEND_URL: getEnv('FRONTEND_URL', 'http://localhost:5173'),
    UPLOAD_DIR: resolve(getEnv('UPLOAD_DIR', 'uploads')),
    MAX_VIDEO_SIZE_MB: getEnvNumber('MAX_VIDEO_SIZE_MB', 100),
    ENCRYPTION_KEY: getEnv('ENCRYPTION_KEY', 'change-me-in-production-please-32bytes!'),
    DB_HOST: getEnv('DB_HOST', 'localhost'),
    DB_PORT: getEnvNumber('DB_PORT', 3306),
    DB_USER: getEnv('DB_USER', 'root'),
    DB_PASSWORD: getEnv('DB_PASSWORD', ''),
    DB_NAME: getEnv('DB_NAME', 'reelpilot'),
    JWT_ACCESS_SECRET: getEnv('JWT_ACCESS_SECRET', 'access-secret-change-me'),
    JWT_REFRESH_SECRET: getEnv('JWT_REFRESH_SECRET', 'refresh-secret-change-me'),
    ACCESS_TTL: getEnv('ACCESS_TTL', '7d'),
    REFRESH_TTL: getEnv('REFRESH_TTL', '7d'),
    FACEBOOK_APP_ID: getEnv('FACEBOOK_APP_ID', ''),
    FACEBOOK_APP_SECRET: getEnv('FACEBOOK_APP_SECRET', ''),
    FACEBOOK_CALLBACK_URL: getEnv('FACEBOOK_CALLBACK_URL', 'http://localhost:3001/api/pages/facebook/callback'),
};

export default config;
