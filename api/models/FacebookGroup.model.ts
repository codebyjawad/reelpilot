import { DataTypes, Model, Sequelize, type ModelStatic } from 'sequelize';

export interface FacebookGroupAttributes {
    id: number;
    userId: number;
    fbGroupId: string;
    name: string;
    privacy: string; // 'PUBLIC' | 'CLOSED' | 'SECRET'
    avatarUrl: string | null;
    memberCount: number | null;
    connectedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface FacebookGroupCreationAttributes
    extends Omit<FacebookGroupAttributes, 'id' | 'createdAt' | 'updatedAt'> { }

export type FacebookGroupInstance = Model<FacebookGroupAttributes, FacebookGroupCreationAttributes> &
    FacebookGroupAttributes;
export type FacebookGroupInstanceStatic = ModelStatic<FacebookGroupInstance>;

export const defineFacebookGroupModel = (sequelize: Sequelize): FacebookGroupInstanceStatic => {
    return sequelize.define<FacebookGroupInstance>('FacebookGroup', {
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
        fbGroupId: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: 'fb_group_id',
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        privacy: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'PUBLIC',
        },
        avatarUrl: {
            type: DataTypes.STRING(1024),
            allowNull: true,
            field: 'avatar_url',
        },
        memberCount: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            field: 'member_count',
        },
        connectedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'connected_at',
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'created_at',
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'updated_at',
        },
    }, {
        tableName: 'facebook_groups',
        timestamps: true,
        underscored: true,
    });
};

let instance: FacebookGroupInstanceStatic | null = null;
export const setFacebookGroupModelInstance = (model: FacebookGroupInstanceStatic) => {
    instance = model;
};
export const getFacebookGroupModel = (): FacebookGroupInstanceStatic => {
    if (!instance) {
        throw new Error('FacebookGroup model has not been initialized');
    }
    return instance;
};
