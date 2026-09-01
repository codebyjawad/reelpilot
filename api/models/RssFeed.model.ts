import { DataTypes, Model, Sequelize, type ModelStatic } from 'sequelize';
import type { TargetPlatform } from '../../shared/types.js';

export interface RssFeedAttributes {
    id: number;
    userId: number;
    pageId: number;
    name: string;
    feedUrl: string;
    targetPlatforms: TargetPlatform[];
    intervalHours: number;
    isActive: boolean;
    lastPolledAt: Date | null;
    importedCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface RssFeedCreationAttributes extends Omit<RssFeedAttributes, 'id' | 'createdAt' | 'updatedAt' | 'lastPolledAt' | 'importedCount'> {
    lastPolledAt?: Date | null;
    importedCount?: number;
}

export type RssFeedInstance = Model<RssFeedAttributes, RssFeedCreationAttributes> & RssFeedAttributes;
export type RssFeedInstanceStatic = ModelStatic<RssFeedInstance>;

export const defineRssFeedModel = (sequelize: Sequelize): RssFeedInstanceStatic => {
    return sequelize.define<RssFeedInstance>('RssFeed', {
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
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        feedUrl: {
            type: DataTypes.STRING(2048),
            allowNull: false,
            field: 'feed_url',
        },
        targetPlatforms: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: ['facebook'],
            field: 'target_platforms',
        },
        intervalHours: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            defaultValue: 3,
            field: 'interval_hours',
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            field: 'is_active',
        },
        lastPolledAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'last_polled_at',
        },
        importedCount: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            defaultValue: 0,
            field: 'imported_count',
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
        tableName: 'rss_feeds',
        underscored: true,
        timestamps: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
        engine: 'InnoDB',
        indexes: [
            {
                name: 'ix_rss_feeds_user',
                fields: ['user_id'],
            },
            {
                name: 'ix_rss_feeds_active',
                fields: ['is_active'],
            },
        ],
    });
};

let _RssFeedModel: RssFeedInstanceStatic | null = null;

export function setRssFeedModelInstance(m: RssFeedInstanceStatic): void {
    _RssFeedModel = m;
}

export function getRssFeedModel(): RssFeedInstanceStatic {
    if (!_RssFeedModel) {
        throw new Error('RssFeedModel has not been initialized. Call initModels() first.');
    }
    return _RssFeedModel;
}

export default _RssFeedModel as unknown as RssFeedInstanceStatic;
