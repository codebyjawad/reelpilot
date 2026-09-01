import { DataTypes, Model, Sequelize, type ModelStatic } from 'sequelize';
import type { ReelStatus } from '../../shared/types.js';

export interface PublishLogAttributes {
    id: number;
    reelId: number;
    attempt: number;
    status: ReelStatus;
    responseCode: number | null;
    error: string | null;
    createdAt: Date;
}

export interface PublishLogCreationAttributes extends Omit<PublishLogAttributes, 'id' | 'createdAt'> { }

export type PublishLogInstance = Model<PublishLogAttributes, PublishLogCreationAttributes> & PublishLogAttributes;
export type PublishLogInstanceStatic = ModelStatic<PublishLogInstance>;

export const definePublishLogModel = (sequelize: Sequelize): PublishLogInstanceStatic => {
    return sequelize.define<PublishLogInstance>('PublishLog', {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        reelId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            field: 'reel_id',
        },
        attempt: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
        },
        responseCode: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'response_code',
        },
        error: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'created_at',
        },
    }, {
        tableName: 'publish_logs',
        underscored: true,
        timestamps: false,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
        engine: 'InnoDB',
        indexes: [
            {
                name: 'ix_logs_reel_id',
                fields: ['reel_id'],
            },
        ],
    });
};

let _PublishLogModel: PublishLogInstanceStatic | null = null;

export function setPublishLogModelInstance(m: PublishLogInstanceStatic): void {
    _PublishLogModel = m;
}

export function getPublishLogModel(): PublishLogInstanceStatic {
    if (!_PublishLogModel) {
        throw new Error('PublishLogModel has not been initialized. Call initModels() first.');
    }
    return _PublishLogModel;
}

export type PublishLogModel = PublishLogInstance;

export default _PublishLogModel as unknown as PublishLogInstanceStatic;
