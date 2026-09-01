import { Request, Response } from 'express';
import { getRssFeedModel } from '../models/RssFeed.model.js';
import { getFacebookPageModel } from '../models/FacebookPage.model.js';
import * as rssService from '../services/rss.service.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

export const listRssFeeds = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const feeds = await getRssFeedModel().findAll({
        where: { userId },
        include: [{ model: getFacebookPageModel(), as: 'page', attributes: ['id', 'name', 'avatarUrl'] }],
        order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
        success: true,
        data: { feeds },
    });
};

export const createRssFeed = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { pageId, name, feedUrl, targetPlatforms, intervalHours } = req.body;

    if (!pageId || !name || !feedUrl) {
        throw new BadRequestError('pageId, name, and feedUrl are required');
    }

    const normalizedUrl = rssService.normalizeRssUrl(feedUrl);

    const feed = await getRssFeedModel().create({
        userId,
        pageId: Number(pageId),
        name,
        feedUrl: normalizedUrl,
        targetPlatforms: Array.isArray(targetPlatforms) && targetPlatforms.length ? targetPlatforms : ['facebook'],
        intervalHours: Number(intervalHours) || 3,
        isActive: true,
        importedCount: 0,
        lastPolledAt: null,
    });

    // Trigger initial poll in background
    rssService.pollRssFeed(feed.id).catch(() => { });

    res.status(201).json({
        success: true,
        data: { feed },
    });
};

export const syncRssFeedNow = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const feedId = Number(req.params.id);

    const feed = await getRssFeedModel().findOne({ where: { id: feedId, userId } });
    if (!feed) {
        throw new NotFoundError('RSS Feed not found');
    }

    const { importedCount } = await rssService.pollRssFeed(feed.id);

    res.status(200).json({
        success: true,
        data: { importedCount },
    });
};

export const deleteRssFeed = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const feedId = Number(req.params.id);

    const feed = await getRssFeedModel().findOne({ where: { id: feedId, userId } });
    if (!feed) {
        throw new NotFoundError('RSS Feed not found');
    }

    await feed.destroy();

    res.status(200).json({
        success: true,
    });
};
