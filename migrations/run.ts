import sequelize from '../api/config/database.js';
import { logger } from '../api/utils/logger.js';
import { config } from '../api/config/index.js';

const run = async (): Promise<void> => {
    try {
        logger.info('Running migrations / syncing schema...');

        await import('../api/models/User.model.js');
        await import('../api/models/FacebookPage.model.js');
        await import('../api/models/Reel.model.js');
        await import('../api/models/PublishLog.model.js');

        const alter = config.NODE_ENV === 'development';
        await sequelize.sync({ alter, force: false });

        logger.info(
            `Sequelize sync completed successfully${alter ? ' (with ALTER in dev)' : ''}`
        );

        await sequelize.close();
        process.exit(0);
    } catch (err: any) {
        logger.error(`Migration failed: ${err?.message ?? err}`, err);
        try { await sequelize.close(); } catch (_) { }
        process.exit(1);
    }
};

run();

