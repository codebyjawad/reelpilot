import { DataTypes, Model, Sequelize, type ModelStatic } from 'sequelize';

export interface BrandingPresetAttributes {
    id: number;
    userId: number;
    name: string;
    logoUrl: string | null;
    logoFilePath: string | null;
    watermarkPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity: number; // 0.1 to 1.0
    scale: number; // 0.05 to 0.5
    introStingerText: string | null;
    introDuration: number; // seconds
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface BrandingPresetCreationAttributes extends Omit<BrandingPresetAttributes, 'id' | 'createdAt' | 'updatedAt'> { }

export type BrandingPresetInstance = Model<BrandingPresetAttributes, BrandingPresetCreationAttributes> & BrandingPresetAttributes;
export type BrandingPresetInstanceStatic = ModelStatic<BrandingPresetInstance>;

export const defineBrandingPresetModel = (sequelize: Sequelize): BrandingPresetInstanceStatic => {
    return sequelize.define<BrandingPresetInstance>('BrandingPreset', {
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
        logoUrl: {
            type: DataTypes.STRING(1024),
            allowNull: true,
            field: 'logo_url',
        },
        logoFilePath: {
            type: DataTypes.STRING(1024),
            allowNull: true,
            field: 'logo_file_path',
        },
        watermarkPosition: {
            type: DataTypes.ENUM('top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'),
            allowNull: false,
            defaultValue: 'top-right',
            field: 'watermark_position',
        },
        opacity: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 0.85,
        },
        scale: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 0.15,
        },
        introStingerText: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'intro_stinger_text',
        },
        introDuration: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            defaultValue: 2,
            field: 'intro_duration',
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            field: 'is_active',
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
        tableName: 'branding_presets',
        underscored: true,
        timestamps: true,
    });
};

let _BrandingPresetModel: BrandingPresetInstanceStatic | null = null;

export function setBrandingPresetModelInstance(m: BrandingPresetInstanceStatic): void {
    _BrandingPresetModel = m;
}

export function getBrandingPresetModel(): BrandingPresetInstanceStatic {
    if (!_BrandingPresetModel) {
        throw new Error('BrandingPresetModel has not been initialized. Call initModels() first.');
    }
    return _BrandingPresetModel;
}

export default _BrandingPresetModel as unknown as BrandingPresetInstanceStatic;
