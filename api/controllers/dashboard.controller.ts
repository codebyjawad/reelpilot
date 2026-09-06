import { Request, Response } from 'express';
import { Op, fn, col, literal } from 'sequelize';
import { getReelModel } from '../models/Reel.model.js';
import { getFacebookPageModel } from '../models/FacebookPage.model.js';
import * as analyticsSvc from '../services/analytics.service.js';
import type { DashboardStats } from '../../shared/types.js';

const formatDate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

export const getStats = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const ReelModel = getReelModel();
    const PageModel = getFacebookPageModel();

    const [
        totalScheduled,
        publishedToday,
        draftCount,
        connectedPages,
        failedCount,
    ] = await Promise.all([
        ReelModel.count({ where: { userId, status: 'scheduled' } }),
        ReelModel.count({
            where: {
                userId,
                status: 'published',
                publishedAt: { [Op.between]: [todayStart, todayEnd] },
            },
        }),
        ReelModel.count({ where: { userId, status: 'draft' } }),
        PageModel.count({ where: { userId } }),
        ReelModel.count({ where: { userId, status: 'failed' } }),
    ]);

    const last7Days: DashboardStats['last7Days'] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ds = new Date(d);
        ds.setHours(0, 0, 0, 0);
        const de = new Date(d);
        de.setHours(23, 59, 59, 999);

        const [pub, sch] = await Promise.all([
            ReelModel.count({
                where: {
                    userId,
                    status: 'published',
                    publishedAt: { [Op.between]: [ds, de] },
                },
            }),
            ReelModel.count({
                where: {
                    userId,
                    status: { [Op.in]: ['scheduled', 'draft'] },
                    scheduledAt: { [Op.between]: [ds, de] },
                },
            }),
        ]);

        last7Days.push({
            date: formatDate(d),
            published: pub,
            scheduled: sch,
        });
    }

    const stats: DashboardStats = {
        totalScheduled,
        publishedToday,
        draftCount,
        connectedPages,
        failedCount,
        last7Days,
    };

    res.status(200).json({
        success: true,
        data: stats,
    });
};

export const getAnalytics = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const analytics = await analyticsSvc.getUserAnalytics(userId);

    res.status(200).json({
        success: true,
        data: analytics,
    });
};

export default {
    getStats,
    getAnalytics,
};
