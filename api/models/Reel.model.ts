import { DataTypes, Model, Sequelize, type ModelStatic } from 'sequelize';
import type { ReelStatus, VideoSource } from '../../shared/types.js';

export const ReelStatuses = ['draft', 'scheduled', 'uploading', 'publishing', 'published', 'failed'] as const;
export const VideoSources = ['url', 'upload'] as const;

export interface ReelAttributes {
    id: number;
    userId: number;
    pageId: number;
    title: string;
    caption: string | null;
    hashtags: string[] | null;
    videoSource: VideoSource;
    videoUrl: string | null;
    videoFilePath: string | null;
    thumbnailUrl: string | null;
    status: ReelStatus;
    scheduledAt: Date | null;
    publishedAt: Date | null;
    facebookPostId: string | null;
    platformPostIds: Record<string, string> | null;
    targetPlatforms: string[] | null;
    errorMessage: string | null;
    retryCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface ReelCreationAttributes extends Omit<ReelAttributes, 'id' | 'createdAt' | 'updatedAt'> { }

export type ReelInstance = Model<ReelAttributes, ReelCreationAttributes> & ReelAttributes;
export type ReelInstanceStatic = ModelStatic<ReelInstance>;

export const defineReelModel = (sequelize: Sequelize): ReelInstanceStatic => {
    return sequelize.define<ReelInstance>('Reel', {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        userId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            field: 'user_id',
        },
        pageId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            field: 'page_id',
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        caption: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        hashtags: {
            type: DataTypes.JSON,
            allowNull: true,
            get(this: ReelInstance): string[] {
                const raw = (this as ReelInstance).getDataValue('hashtags') as unknown;
                if (raw === null || raw === undefined) return [];
                if (Array.isArray(raw)) return raw as string[];
                try {
                    return typeof raw === 'string' ? JSON.parse(raw) : [];
                } catch {
                    return [];
                }
            },
        },
        videoSource: {
            type: DataTypes.ENUM(...VideoSources),
            allowNull: false,
            field: 'video_source',
        },
        videoUrl: {
            type: DataTypes.STRING(2048),
            allowNull: true,
            field: 'video_url',
        },
        videoFilePath: {
            type: DataTypes.STRING(1024),
            allowNull: true,
            field: 'video_file_path',
        },
        thumbnailUrl: {
            type: DataTypes.STRING(1024),
            allowNull: true,
            field: 'thumbnail_url',
        },
        status: {
            type: DataTypes.ENUM(...ReelStatuses),
            allowNull: false,
            defaultValue: 'draft',
        },
        scheduledAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'scheduled_at',
        },
        publishedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'published_at',
        },
        facebookPostId: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'facebook_post_id',
        },
        platformPostIds: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'platform_post_ids',
        },
        targetPlatforms: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'target_platforms',
        },
        errorMessage: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'error_message',
        },
        retryCount: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            defaultValue: 0,
            field: 'retry_count',
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
    }, {
        tableName: 'reels',
        underscored: true,
        timestamps: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
        engine: 'InnoDB',
        indexes: [
            {
                name: 'ix_reels_status_scheduled',
                fields: ['status', 'scheduled_at'],
            },
            {
                name: 'ix_reels_user_status',
                fields: ['user_id', 'status'],
            },
            {
                name: 'ix_reels_user_id',
                fields: ['user_id'],
            },
            {
                name: 'ix_reels_page_id',
                fields: ['page_id'],
            },
        ],
    });
};

let _ReelModel: ReelInstanceStatic | null = null;

export function setReelModelInstance(m: ReelInstanceStatic): void {
    _ReelModel = m;
}

export function getReelModel(): ReelInstanceStatic {
    if (!_ReelModel) {
        throw new Error('ReelModel has not been initialized. Call initModels() first.');
    }
    return _ReelModel;
}

export type ReelModel = ReelInstance;

export default _ReelModel as unknown as ReelInstanceStatic;
