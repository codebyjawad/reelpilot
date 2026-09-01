import { DataTypes, Model, Sequelize, type ModelStatic } from 'sequelize';

export interface AiAutoPilotAttributes {
    id: number;
    userId: number;
    pageId: number;
    topic: string;
    stylePreset?: string | null;
    brandName?: string | null;
    brandRole?: string | null;
    brandHandle?: string | null;
    directorPrompt?: string | null;
    targetGroupIds?: number[] | null;
    intervalMinutes: number;
    targetPlatforms: string[];
    isActive: boolean;
    lastRunAt: Date | null;
    totalPosts: number;
    geminiApiKey: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface AiAutoPilotCreationAttributes
    extends Omit<AiAutoPilotAttributes, 'id' | 'createdAt' | 'updatedAt' | 'lastRunAt' | 'totalPosts'> {
    lastRunAt?: Date | null;
    totalPosts?: number;
    stylePreset?: string | null;
    brandName?: string | null;
    brandRole?: string | null;
    brandHandle?: string | null;
    directorPrompt?: string | null;
    targetGroupIds?: number[] | null;
}

export type AiAutoPilotInstance = Model<AiAutoPilotAttributes, AiAutoPilotCreationAttributes> & AiAutoPilotAttributes;
export type AiAutoPilotInstanceStatic = ModelStatic<AiAutoPilotInstance>;

export const defineAiAutoPilotModel = (sequelize: Sequelize): AiAutoPilotInstanceStatic => {
    return sequelize.define<AiAutoPilotInstance>('AiAutoPilot', {
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
        topic: {
            type: DataTypes.STRING(512),
            allowNull: false,
        },
        stylePreset: {
            type: DataTypes.STRING(128),
            allowNull: true,
            defaultValue: 'master-creative-director',
            field: 'style_preset',
        },
        brandName: {
            type: DataTypes.STRING(256),
            allowNull: true,
            field: 'brand_name',
        },
        brandRole: {
            type: DataTypes.STRING(256),
            allowNull: true,
            field: 'brand_role',
        },
        brandHandle: {
            type: DataTypes.STRING(256),
            allowNull: true,
            field: 'brand_handle',
        },
        directorPrompt: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'director_prompt',
        },
        targetGroupIds: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: [],
            field: 'target_group_ids',
            get(this: AiAutoPilotInstance): number[] {
                const raw = (this as AiAutoPilotInstance).getDataValue('targetGroupIds') as unknown;
                if (Array.isArray(raw)) return raw.map(Number);
                try { return typeof raw === 'string' ? JSON.parse(raw).map(Number) : []; } catch { return []; }
            },
        },
        intervalMinutes: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            defaultValue: 60,
            field: 'interval_minutes',
        },
        targetPlatforms: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: ['facebook'],
            field: 'target_platforms',
            get(this: AiAutoPilotInstance): string[] {
                const raw = (this as AiAutoPilotInstance).getDataValue('targetPlatforms') as unknown;
                if (Array.isArray(raw)) return raw as string[];
                try { return typeof raw === 'string' ? JSON.parse(raw) : ['facebook']; } catch { return ['facebook']; }
            },
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            field: 'is_active',
        },
        lastRunAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'last_run_at',
        },
        totalPosts: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            defaultValue: 0,
            field: 'total_posts',
        },

        geminiApiKey: {
            type: DataTypes.STRING(512),
            allowNull: true,
            field: 'gemini_api_key',
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
        tableName: 'ai_autopilots',
        underscored: true,
        timestamps: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
        engine: 'InnoDB',
        indexes: [
            { name: 'ix_ai_autopilots_user', fields: ['user_id'] },
            { name: 'ix_ai_autopilots_active', fields: ['is_active'] },
        ],
    });
};

let _AiAutoPilotModel: AiAutoPilotInstanceStatic | null = null;

export function setAiAutoPilotModelInstance(m: AiAutoPilotInstanceStatic): void {
    _AiAutoPilotModel = m;
}

export function getAiAutoPilotModel(): AiAutoPilotInstanceStatic {
    if (!_AiAutoPilotModel) {
        throw new Error('AiAutoPilotModel has not been initialized. Call initModels() first.');
    }
    return _AiAutoPilotModel;
}

export default _AiAutoPilotModel as unknown as AiAutoPilotInstanceStatic;
