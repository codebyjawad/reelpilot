import { DataTypes, Model, Sequelize, type ModelStatic } from 'sequelize';

export type AiPostLogStatus = 'pending' | 'posted' | 'failed';

export interface AiPostLogAttributes {
    id: number;
    autopilotId: number;
    userId: number;
    pageId: number;
    imagePath: string | null;
    imagePrompt: string | null;
    title: string | null;
    caption: string | null;
    hashtags: string[] | null;
    facebookPostId: string | null;
    status: AiPostLogStatus;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface AiPostLogCreationAttributes
    extends Omit<AiPostLogAttributes, 'id' | 'createdAt' | 'updatedAt'> { }

export type AiPostLogInstance = Model<AiPostLogAttributes, AiPostLogCreationAttributes> & AiPostLogAttributes;
export type AiPostLogInstanceStatic = ModelStatic<AiPostLogInstance>;

export const defineAiPostLogModel = (sequelize: Sequelize): AiPostLogInstanceStatic => {
    return sequelize.define<AiPostLogInstance>('AiPostLog', {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        autopilotId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            field: 'autopilot_id',
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
        imagePath: {
            type: DataTypes.STRING(1024),
            allowNull: true,
            field: 'image_path',
        },
        imagePrompt: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'image_prompt',
        },
        title: {
            type: DataTypes.STRING(512),
            allowNull: true,
        },
        caption: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        hashtags: {
            type: DataTypes.JSON,
            allowNull: true,
            get(this: AiPostLogInstance): string[] {
                const raw = (this as AiPostLogInstance).getDataValue('hashtags') as unknown;
                if (Array.isArray(raw)) return raw as string[];
                try { return typeof raw === 'string' ? JSON.parse(raw) : []; } catch { return []; }
            },
        },
        facebookPostId: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'facebook_post_id',
        },
        status: {
            type: DataTypes.ENUM('pending', 'posted', 'failed'),
            allowNull: false,
            defaultValue: 'pending',
        },
        errorMessage: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'error_message',
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
        tableName: 'ai_post_logs',
        underscored: true,
        timestamps: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
        engine: 'InnoDB',
        indexes: [
            { name: 'ix_ai_post_logs_autopilot', fields: ['autopilot_id'] },
            { name: 'ix_ai_post_logs_user', fields: ['user_id'] },
        ],
    });
};

let _AiPostLogModel: AiPostLogInstanceStatic | null = null;

export function setAiPostLogModelInstance(m: AiPostLogInstanceStatic): void {
    _AiPostLogModel = m;
}

export function getAiPostLogModel(): AiPostLogInstanceStatic {
    if (!_AiPostLogModel) {
        throw new Error('AiPostLogModel has not been initialized. Call initModels() first.');
    }
    return _AiPostLogModel;
}

export default _AiPostLogModel as unknown as AiPostLogInstanceStatic;
