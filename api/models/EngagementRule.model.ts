import { DataTypes, Model, Sequelize, type ModelStatic } from 'sequelize';

export interface EngagementRuleAttributes {
    id: number;
    userId: number;
    name: string;
    triggerType: 'keyword' | 'ai_all' | 'sentiment_negative' | 'sentiment_question';
    keywords: string[] | null;
    matchMode: 'exact' | 'contains' | 'any';
    replyType: 'template' | 'ai_persona' | 'dm_link';
    replyTemplate: string | null;
    aiPersonaTone: 'friendly' | 'professional' | 'witty' | 'enthusiastic';
    ctaLink: string | null;
    dmMessage: string | null;
    isActive: boolean;
    repliesCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface EngagementRuleCreationAttributes extends Omit<EngagementRuleAttributes, 'id' | 'createdAt' | 'updatedAt' | 'repliesCount'> {
    repliesCount?: number;
}

export type EngagementRuleInstance = Model<EngagementRuleAttributes, EngagementRuleCreationAttributes> & EngagementRuleAttributes;
export type EngagementRuleInstanceStatic = ModelStatic<EngagementRuleInstance>;

export const defineEngagementRuleModel = (sequelize: Sequelize): EngagementRuleInstanceStatic => {
    return sequelize.define<EngagementRuleInstance>('EngagementRule', {
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
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        triggerType: {
            type: DataTypes.ENUM('keyword', 'ai_all', 'sentiment_negative', 'sentiment_question'),
            allowNull: false,
            defaultValue: 'keyword',
            field: 'trigger_type',
        },
        keywords: {
            type: DataTypes.JSON,
            allowNull: true,
            get(this: EngagementRuleInstance): string[] {
                const raw = (this as EngagementRuleInstance).getDataValue('keywords') as unknown;
                if (raw === null || raw === undefined) return [];
                if (Array.isArray(raw)) return raw as string[];
                try {
                    return typeof raw === 'string' ? JSON.parse(raw) : [];
                } catch {
                    return [];
                }
            },
        },
        matchMode: {
            type: DataTypes.ENUM('exact', 'contains', 'any'),
            allowNull: false,
            defaultValue: 'contains',
            field: 'match_mode',
        },
        replyType: {
            type: DataTypes.ENUM('template', 'ai_persona', 'dm_link'),
            allowNull: false,
            defaultValue: 'ai_persona',
            field: 'reply_type',
        },
        replyTemplate: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'reply_template',
        },
        aiPersonaTone: {
            type: DataTypes.ENUM('friendly', 'professional', 'witty', 'enthusiastic'),
            allowNull: false,
            defaultValue: 'friendly',
            field: 'ai_persona_tone',
        },
        ctaLink: {
            type: DataTypes.STRING(1024),
            allowNull: true,
            field: 'cta_link',
        },
        dmMessage: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'dm_message',
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            field: 'is_active',
        },
        repliesCount: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            defaultValue: 0,
            field: 'replies_count',
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
        tableName: 'engagement_rules',
        underscored: true,
        timestamps: true,
    });
};

let _EngagementRuleModel: EngagementRuleInstanceStatic | null = null;

export function setEngagementRuleModelInstance(m: EngagementRuleInstanceStatic): void {
    _EngagementRuleModel = m;
}

export function getEngagementRuleModel(): EngagementRuleInstanceStatic {
    if (!_EngagementRuleModel) {
        throw new Error('EngagementRuleModel has not been initialized. Call initModels() first.');
    }
    return _EngagementRuleModel;
}

export default _EngagementRuleModel as unknown as EngagementRuleInstanceStatic;
