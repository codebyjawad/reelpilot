import { DataTypes, Model, Sequelize, type ModelStatic } from 'sequelize';
import type { User as IUser } from '../../shared/types.js';

export interface UserAttributes extends IUser {
    passwordHash: string;
    updatedAt: Date;
}

export interface UserCreationAttributes extends Omit<UserAttributes, 'id' | 'createdAt' | 'updatedAt'> { }

export type UserInstance = Model<UserAttributes, UserCreationAttributes> & UserAttributes;
export type UserInstanceStatic = ModelStatic<UserInstance>;

export const defineUserModel = (sequelize: Sequelize): UserInstanceStatic => {
    return sequelize.define<UserInstance>('User', {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        passwordHash: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'password_hash',
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
        tableName: 'users',
        underscored: true,
        timestamps: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
        engine: 'InnoDB',
        indexes: [
            {
                name: 'ux_users_email',
                unique: true,
                fields: ['email'],
            },
        ],
    });
};

let _UserModel: UserInstanceStatic | null = null;

export function setUserModelInstance(m: UserInstanceStatic): void {
    _UserModel = m;
}

export function getUserModel(): UserInstanceStatic {
    if (!_UserModel) {
        throw new Error('UserModel has not been initialized. Call initModels() first.');
    }
    return _UserModel;
}

export type UserModel = UserInstance;

export default _UserModel as unknown as UserInstanceStatic;
