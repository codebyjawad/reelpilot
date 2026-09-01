import { Request, Response } from 'express';
import * as groupsSvc from '../services/groups.service.js';

export const list = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const groups = await groupsSvc.getUserGroups(userId);

    res.status(200).json({
        success: true,
        data: groups,
    });
};

export const connect = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { fbGroupId, name, privacy } = req.body;

    if (!fbGroupId || typeof fbGroupId !== 'string') {
        res.status(400).json({ success: false, error: 'fbGroupId is required' });
        return;
    }

    const group = await groupsSvc.connectGroup(userId, fbGroupId, name, privacy);

    res.status(201).json({
        success: true,
        data: group,
    });
};

export const remove = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const id = Number(req.params.id);

    await groupsSvc.removeGroup(userId, id);

    res.status(204).end();
};

export const publishToGroup = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    const { videoUrl, title, description } = req.body;

    if (!videoUrl || !title) {
        res.status(400).json({ success: false, error: 'videoUrl and title are required' });
        return;
    }

    const result = await groupsSvc.publishReelToGroup(userId, id, videoUrl, title, description);

    res.status(200).json({
        success: true,
        data: result,
    });
};

export const sync = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const groups = await groupsSvc.syncFacebookGroups(userId);

    res.status(200).json({
        success: true,
        data: groups,
    });
};

export const getActivity = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const logs = await groupsSvc.getGroupActivityLogs(userId);

    res.status(200).json({
        success: true,
        data: logs,
    });
};

export const update = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    const { name, privacy, fbGroupId } = req.body;

    const group = await groupsSvc.updateGroup(userId, id, { name, privacy, fbGroupId });

    res.status(200).json({
        success: true,
        data: group,
    });
};

export default {
    list,
    connect,
    update,
    sync,
    remove,
    publishToGroup,
    getActivity,
};
