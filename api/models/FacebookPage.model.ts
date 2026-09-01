import { DataTypes, Model, Sequelize, type ModelStatic } from 'sequelize';

export interface FacebookPageAttributes {
    id: number;
    userId: number;
    fbPageId: string;
    name: string;
    avatarUrl: string | null;
    accessTokenEnc: string;
    permissions: string[] | null;
    tokenExpiresAt: Date | null;
    connectedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface FacebookPageCreationAttributes extends Omit<FacebookPageAttributes, 'id' | 'createdAt' | 'updatedAt'> { }

export type FacebookPageInstance = Model<FacebookPageAttributes, FacebookPageCreationAttributes> & FacebookPageAttributes;
export type FacebookPageInstanceStatic = ModelStatic<FacebookPageInstance>;

export const defineFacebookPageModel = (sequelize: Sequelize): FacebookPageInstanceStatic => {
    return sequelize.define<FacebookPageInstance>('FacebookPage', {
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
        fbPageId: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: 'fb_page_id',
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        avatarUrl: {
            type: DataTypes.STRING(1024),
            allowNull: true,
            field: 'avatar_url',
        },
        accessTokenEnc: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: 'access_token_enc',
        },
        permissions: {
            type: DataTypes.JSON,
            allowNull: true,
        },
        tokenExpiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'token_expires_at',
        },
        connectedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'connected_at',
            defaultValue: DataTypes.NOW,
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
        tableName: 'facebook_pages',
        underscored: true,
        timestamps: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
        engine: 'InnoDB',
        indexes: [
            {
                name: 'ux_fb_pages_user_fbid',
                unique: true,
                fields: ['user_id', 'fb_page_id'],
            },
            {
                name: 'ix_fb_pages_user_id',
                fields: ['user_id'],
            },
        ],
    });
};

let _FacebookPageModel: FacebookPageInstanceStatic | null = null;

export function setFacebookPageModelInstance(m: FacebookPageInstanceStatic): void {
    _FacebookPageModel = m;
}

export function getFacebookPageModel(): FacebookPageInstanceStatic {
    if (!_FacebookPageModel) {
        throw new Error('FacebookPageModel has not been initialized. Call initModels() first.');
    }
    return _FacebookPageModel;
}

export type FacebookPageModel = FacebookPageInstance;

export default _FacebookPageModel as unknown as FacebookPageInstanceStatic;
