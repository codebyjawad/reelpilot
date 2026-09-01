import { DataTypes, Model, Sequelize, type ModelStatic } from 'sequelize';

export interface AbTestAttributes {
    id: number;
    userId: number;
    title: string;
    testType: 'caption' | 'hook' | 'posting_time' | 'thumbnail';
    variantAReelId: number;
    variantBReelId: number;
    variantAMetrics: { views: number; likes: number; comments: number; shares: number } | null;
    variantBMetrics: { views: number; likes: number; comments: number; shares: number } | null;
    winnerVariant: 'A' | 'B' | 'tie' | null;
    status: 'draft' | 'running' | 'completed';
    durationHours: number;
    minViewsThreshold: number;
    autoSelectWinner: boolean;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface AbTestCreationAttributes extends Omit<AbTestAttributes, 'id' | 'createdAt' | 'updatedAt' | 'winnerVariant' | 'startedAt' | 'completedAt'> {
    winnerVariant?: 'A' | 'B' | 'tie' | null;
    startedAt?: Date | null;
    completedAt?: Date | null;
}

export type AbTestInstance = Model<AbTestAttributes, AbTestCreationAttributes> & AbTestAttributes;
export type AbTestInstanceStatic = ModelStatic<AbTestInstance>;

export const defineAbTestModel = (sequelize: Sequelize): AbTestInstanceStatic => {
    return sequelize.define<AbTestInstance>('AbTest', {
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
        title: {
            type: DataTypes.STRING(150),
            allowNull: false,
        },
        testType: {
            type: DataTypes.ENUM('caption', 'hook', 'posting_time', 'thumbnail'),
            allowNull: false,
            defaultValue: 'caption',
            field: 'test_type',
        },
        variantAReelId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            field: 'variant_a_reel_id',
        },
        variantBReelId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            field: 'variant_b_reel_id',
        },
        variantAMetrics: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'variant_a_metrics',
        },
        variantBMetrics: {
            type: DataTypes.JSON,
            allowNull: true,
            field: 'variant_b_metrics',
        },
        winnerVariant: {
            type: DataTypes.ENUM('A', 'B', 'tie'),
            allowNull: true,
            field: 'winner_variant',
        },
        status: {
            type: DataTypes.ENUM('draft', 'running', 'completed'),
            allowNull: false,
            defaultValue: 'draft',
        },
        durationHours: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            defaultValue: 48,
            field: 'duration_hours',
        },
        minViewsThreshold: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            defaultValue: 1000,
            field: 'min_views_threshold',
        },
        autoSelectWinner: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            field: 'auto_select_winner',
        },
        startedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'started_at',
        },
        completedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'completed_at',
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
        tableName: 'ab_tests',
        underscored: true,
        timestamps: true,
    });
};

let _AbTestModel: AbTestInstanceStatic | null = null;

export function setAbTestModelInstance(m: AbTestInstanceStatic): void {
    _AbTestModel = m;
}

export function getAbTestModel(): AbTestInstanceStatic {
    if (!_AbTestModel) {
        throw new Error('AbTestModel has not been initialized. Call initModels() first.');
    }
    return _AbTestModel;
}

export default _AbTestModel as unknown as AbTestInstanceStatic;
