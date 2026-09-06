import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sequelize } from 'sequelize';
import { config } from './index.js';
import { defineUserModel, setUserModelInstance } from '../models/User.model.js';
import { defineFacebookPageModel, setFacebookPageModelInstance } from '../models/FacebookPage.model.js';
import { defineReelModel, setReelModelInstance } from '../models/Reel.model.js';
import { definePublishLogModel, setPublishLogModelInstance } from '../models/PublishLog.model.js';
import { defineRssFeedModel, setRssFeedModelInstance } from '../models/RssFeed.model.js';
import { defineFacebookGroupModel, setFacebookGroupModelInstance } from '../models/FacebookGroup.model.js';
import { defineAiAutoPilotModel, setAiAutoPilotModelInstance } from '../models/AiAutoPilot.model.js';
import { defineAiPostLogModel, setAiPostLogModelInstance } from '../models/AiPostLog.model.js';
import { defineBrandingPresetModel, setBrandingPresetModelInstance } from '../models/BrandingPreset.model.js';
import { defineEngagementRuleModel, setEngagementRuleModelInstance } from '../models/EngagementRule.model.js';
import { defineAbTestModel, setAbTestModelInstance } from '../models/AbTest.model.js';
import { defineViralSourceModel, setViralSourceModelInstance } from '../models/ViralSource.model.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const loggerPromise = import('../utils/logger.js');
const logWarn = (msg: string, meta?: any) =>
    loggerPromise
        .then((m) => m.logger.warn(msg, meta))
        .catch(() => console.warn('[warn]', msg));
const logInfo = (msg: string, meta?: any) =>
    loggerPromise
        .then((m) => m.logger.info(msg, meta))
        .catch(() => console.info('[info]', msg));
const logError = (msg: string, meta?: any) =>
    loggerPromise
        .then((m) => m.logger.error(msg, meta))
        .catch(() => console.error('[error]', msg));

export type DbDialect = 'mysql' | 'sqlite';
export let DB_DIALECT: DbDialect = 'mysql';

function buildMysqlSequelize(): Sequelize {
    return new Sequelize(
        config.DB_NAME,
        config.DB_USER,
        config.DB_PASSWORD,
        {
            host: config.DB_HOST,
            port: config.DB_PORT,
            dialect: 'mysql',
            logging:
                config.NODE_ENV === 'development'
                    ? (msg) =>
                        loggerPromise
                            .then((m) => m.logger.debug(msg))
                            .catch(() => { })
                    : false,
            pool: { max: 10, min: 0, acquire: 60000, idle: 10000 },
            define: { underscored: true, timestamps: true },
            dialectOptions: { charset: 'utf8mb4' },
        }
    );
}

function buildSqliteSequelize(): Sequelize {
    const dataDir = path.resolve(process.cwd(), 'data');
    fs.mkdirSync(dataDir, { recursive: true });
    const storage = path.resolve(dataDir, 'reelpilot.sqlite');
    const seq = new Sequelize({
        dialect: 'sqlite',
        storage,
        logging: false,
        define: { underscored: true, timestamps: true },
        pool: { max: 5, min: 0, acquire: 120000, idle: 10000 },
    });
    seq.addHook('afterConnect', async (conn: any) => {
        try {
            await conn.query('PRAGMA journal_mode = WAL;');
            await conn.query('PRAGMA busy_timeout = 60000;');
        } catch (e) {
            // ignore
        }
    });
    return seq;
}

let sequelize: Sequelize;

try {
    const mysqlSeq = buildMysqlSequelize();
    await mysqlSeq.authenticate();
    sequelize = mysqlSeq;
    DB_DIALECT = 'mysql';
    await logInfo('MySQL connected successfully on ' + config.DB_HOST + ':' + config.DB_PORT);
} catch (mysqlErr: any) {
    await logWarn(
        'MySQL unavailable (' +
        (mysqlErr?.message || mysqlErr?.name || 'unknown') +
        ') — falling back to SQLite file store'
    );
    try {
        sequelize = buildSqliteSequelize();
        DB_DIALECT = 'sqlite';
        await sequelize.authenticate();
        await logInfo(
            'SQLite fallback connected — local persistence enabled at data/reelpilot.sqlite'
        );
    } catch (sqliteErr: any) {
        await logError(
            'FATAL: Both MySQL and SQLite failed. SQLite error: ' +
            (sqliteErr?.message || sqliteErr?.name || 'unknown')
        );
        throw sqliteErr;
    }
}

export function initModels(seq: Sequelize = sequelize) {
    const User = defineUserModel(seq);
    const FacebookPage = defineFacebookPageModel(seq);
    const FacebookGroup = defineFacebookGroupModel(seq);
    const Reel = defineReelModel(seq);
    const PublishLog = definePublishLogModel(seq);
    const RssFeed = defineRssFeedModel(seq);
    const AiAutoPilot = defineAiAutoPilotModel(seq);
    const AiPostLog = defineAiPostLogModel(seq);
    const BrandingPreset = defineBrandingPresetModel(seq);
    const EngagementRule = defineEngagementRuleModel(seq);
    const AbTest = defineAbTestModel(seq);
    const ViralSource = defineViralSourceModel(seq);

    User.hasMany(FacebookPage, {
        foreignKey: { name: 'userId', allowNull: false, field: 'user_id' },
        as: 'pages',
        onDelete: 'CASCADE',
        hooks: true,
    });
    FacebookPage.belongsTo(User, {
        foreignKey: { name: 'userId', allowNull: false, field: 'user_id' },
        as: 'user',
    });

    User.hasMany(FacebookGroup, {
        foreignKey: { name: 'userId', allowNull: false, field: 'user_id' },
        as: 'groups',
        onDelete: 'CASCADE',
        hooks: true,
    });
    FacebookGroup.belongsTo(User, {
        foreignKey: { name: 'userId', allowNull: false, field: 'user_id' },
        as: 'user',
    });

    User.hasMany(Reel, {
        foreignKey: { name: 'userId', allowNull: false, field: 'user_id' },
        as: 'reels',
        onDelete: 'CASCADE',
        hooks: true,
    });
    Reel.belongsTo(User, {
        foreignKey: { name: 'userId', allowNull: false, field: 'user_id' },
        as: 'user',
    });

    FacebookPage.hasMany(Reel, {
        foreignKey: { name: 'pageId', allowNull: false, field: 'page_id' },
        as: 'reels',
        onDelete: 'CASCADE',
        hooks: true,
    });
    Reel.belongsTo(FacebookPage, {
        foreignKey: { name: 'pageId', allowNull: false, field: 'page_id' },
        as: 'page',
    });

    User.hasMany(RssFeed, {
        foreignKey: { name: 'userId', allowNull: false, field: 'user_id' },
        as: 'rssFeeds',
        onDelete: 'CASCADE',
        hooks: true,
    });
    RssFeed.belongsTo(User, {
        foreignKey: { name: 'userId', allowNull: false, field: 'user_id' },
        as: 'user',
    });

    FacebookPage.hasMany(RssFeed, {
        foreignKey: { name: 'pageId', allowNull: false, field: 'page_id' },
        as: 'rssFeeds',
        onDelete: 'CASCADE',
        hooks: true,
    });
    RssFeed.belongsTo(FacebookPage, {
        foreignKey: { name: 'pageId', allowNull: false, field: 'page_id' },
        as: 'page',
    });

    User.hasMany(ViralSource, {
        foreignKey: { name: 'userId', allowNull: false, field: 'user_id' },
        as: 'viralSources',
        onDelete: 'CASCADE',
        hooks: true,
    });
    ViralSource.belongsTo(User, {
        foreignKey: { name: 'userId', allowNull: false, field: 'user_id' },
        as: 'user',
    });

    FacebookPage.hasMany(ViralSource, {
        foreignKey: { name: 'pageId', allowNull: false, field: 'page_id' },
        as: 'viralSources',
        onDelete: 'CASCADE',
        hooks: true,
    });
    ViralSource.belongsTo(FacebookPage, {
        foreignKey: { name: 'pageId', allowNull: false, field: 'page_id' },
        as: 'page',
    });

    Reel.hasMany(PublishLog, {
        foreignKey: { name: 'reelId', allowNull: false, field: 'reel_id' },
        as: 'publishLogs',
        onDelete: 'CASCADE',
        hooks: true,
    });
    PublishLog.belongsTo(Reel, {
        foreignKey: { name: 'reelId', allowNull: false, field: 'reel_id' },
        as: 'reel',
    });

    // AiAutoPilot associations
    User.hasMany(AiAutoPilot, {
        foreignKey: { name: 'userId', allowNull: false, field: 'user_id' },
        as: 'aiAutoPilots',
        onDelete: 'CASCADE',
        hooks: true,
    });
    AiAutoPilot.belongsTo(User, {
        foreignKey: { name: 'userId', allowNull: false, field: 'user_id' },
        as: 'user',
    });
    AiAutoPilot.hasMany(AiPostLog, {
        foreignKey: { name: 'autopilotId', allowNull: false, field: 'autopilot_id' },
        as: 'postLogs',
        onDelete: 'CASCADE',
        hooks: true,
    });
    AiPostLog.belongsTo(AiAutoPilot, {
        foreignKey: { name: 'autopilotId', allowNull: false, field: 'autopilot_id' },
        as: 'autopilot',
    });

    setUserModelInstance(User);
    setFacebookPageModelInstance(FacebookPage);
    setFacebookGroupModelInstance(FacebookGroup);
    setReelModelInstance(Reel);
    setPublishLogModelInstance(PublishLog);
    setRssFeedModelInstance(RssFeed);
    setAiAutoPilotModelInstance(AiAutoPilot);
    setAiPostLogModelInstance(AiPostLog);
    setBrandingPresetModelInstance(BrandingPreset);
    setEngagementRuleModelInstance(EngagementRule);
    setAbTestModelInstance(AbTest);
    setViralSourceModelInstance(ViralSource);

    return { User, FacebookPage, FacebookGroup, Reel, PublishLog, RssFeed, AiAutoPilot, AiPostLog, BrandingPreset, EngagementRule, AbTest, ViralSource };

}

initModels(sequelize);

try {
    // SQLite does not support ENUM or ALTER TABLE in the way Sequelize expects.
    // Use alter:true only for MySQL; for SQLite just ensure tables exist (force:false).
    const syncOptions = DB_DIALECT === 'mysql' ? { alter: true } : { force: false };
    await sequelize.sync(syncOptions);

    if (DB_DIALECT === 'sqlite') {
        try {
            await sequelize.query('ALTER TABLE reels ADD COLUMN target_platforms TEXT;');
        } catch (_e) { /* Ignore if column already exists */ }
        try {
            await sequelize.query('ALTER TABLE reels ADD COLUMN platform_post_ids TEXT;');
        } catch (_e) { /* Ignore if column already exists */ }
        try {
            await sequelize.query("ALTER TABLE ai_autopilots ADD COLUMN style_preset VARCHAR(50) DEFAULT 'master-creative-director';");
        } catch (_e) { /* Ignore */ }
        try {
            await sequelize.query('ALTER TABLE ai_autopilots ADD COLUMN brand_name VARCHAR(100);');
        } catch (_e) { /* Ignore */ }
        try {
            await sequelize.query('ALTER TABLE ai_autopilots ADD COLUMN brand_role VARCHAR(100);');
        } catch (_e) { /* Ignore */ }
        try {
            await sequelize.query('ALTER TABLE ai_autopilots ADD COLUMN brand_handle VARCHAR(100);');
        } catch (_e) { /* Ignore */ }
        try {
            await sequelize.query('ALTER TABLE ai_autopilots ADD COLUMN director_prompt TEXT;');
        } catch (_e) { /* Ignore */ }
        try {
            await sequelize.query('ALTER TABLE ai_autopilots ADD COLUMN target_group_ids TEXT;');
        } catch (_e) { /* Ignore */ }
    }



    await logInfo(
        'Database tables synced (' +
        DB_DIALECT +
        '). Ready to accept queries.'
    );
} catch (syncErr: any) {
    await logError(
        'Database sync failed (' + DB_DIALECT + '): ' + (syncErr?.message || syncErr?.name)
    );
    if (DB_DIALECT === 'mysql') {
        await logWarn('Re-trying sync without ALTER (strict mode)...');
        try {
            await sequelize.sync({ force: false });
            await logInfo('Database tables basic sync succeeded.');
        } catch (e2: any) {
            await logError('Basic sync also failed: ' + (e2?.message || e2?.name));
        }
    }
}

export { sequelize };
export default sequelize;
