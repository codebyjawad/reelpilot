import { DataTypes, Model, Sequelize, type ModelStatic } from 'sequelize';
import type { TargetPlatform } from '../../shared/types.js';

export interface ViralSourceAttributes {
    id: number;
    userId: number;
    pageId: number;
    name: string;
    keywords: string[];
    minViews: number;
    publishedWithinDays: number;
    resultCount: number;
    targetPlatforms: TargetPlatform[];
    useAiCaptions: boolean;
    autoImport: boolean;
    intervalHours: number;
    isActive: boolean;
    lastPolledAt: Date | null;
    discoveredCount: number;
    importedCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface ViralSourceCreationAttributes extends Omit<ViralSourceAttributes, 'id' | 'createdAt' | 'updatedAt' | 'lastPolledAt' | 'discoveredCount' | 'importedCount'> {
    lastPolledAt?: Date | null;
    discoveredCount?: number;
    importedCount?: number;
}

export type ViralSourceInstance = Model<ViralSourceAttributes, ViralSourceCreationAttributes> & ViralSourceAttributes;
export type ViralSourceInstanceStatic = ModelStatic<ViralSourceInstance>;

export const defineViralSourceModel = (sequelize: Sequelize): ViralSourceInstanceStatic => {
    return sequelize.define<ViralSourceInstance>('ViralSource', {
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
        keywords: {
            type: DataTypes.JSON,
            allowNull: false,
            get(this: ViralSourceInstance): string[] {
                const raw = (this as ViralSourceInstance).getDataValue('keywords') as unknown;
                if (raw === null || raw === undefined) return [];
                if (Array.isArray(raw)) return raw as string[];
                try {
                    return typeof raw === 'string' ? JSON.parse(raw) : [];
                } catch {
                    return [];
                }
            },
        },
        minViews: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            defaultValue: 10000,
            field: 'min_views',
        },
        publishedWithinDays: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            defaultValue: 7,
            field: 'published_within_days',
        },
        resultCount: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            defaultValue: 8,
            field: 'result_count',
        },
        targetPlatforms: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: ['facebook', 'instagram'],
            field: 'target_platforms',
        },
        useAiCaptions: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            field: 'use_ai_captions',
        },
        autoImport: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            field: 'auto_import',
        },
        intervalHours: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            defaultValue: 6,
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
        discoveredCount: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            defaultValue: 0,
            field: 'discovered_count',
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
        tableName: 'viral_sources',
        underscored: true,
        timestamps: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
        engine: 'InnoDB',
        indexes: [
            {
                name: 'ix_viral_sources_user',
                fields: ['user_id'],
            },
            {
                name: 'ix_viral_sources_active',
                fields: ['is_active'],
            },
        ],
    });
};

let _ViralSourceModel: ViralSourceInstanceStatic | null = null;

export function setViralSourceModelInstance(m: ViralSourceInstanceStatic): void {
    _ViralSourceModel = m;
}

export function getViralSourceModel(): ViralSourceInstanceStatic {
    if (!_ViralSourceModel) {
        throw new Error('ViralSourceModel has not been initialized. Call initModels() first.');
    }
    return _ViralSourceModel;
}

export default _ViralSourceModel as unknown as ViralSourceInstanceStatic;