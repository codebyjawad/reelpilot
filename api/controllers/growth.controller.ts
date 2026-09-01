import { Request, Response } from 'express';
import * as growthSvc from '../services/growth.service.js';

export const findViralGroups = async (req: Request, res: Response): Promise<void> => {
    const { topic, geminiApiKey } = req.body;
    if (!topic || typeof topic !== 'string') {
        res.status(400).json({ success: false, error: 'topic is required' });
        return;
    }

    const data = await growthSvc.findViralGroupsForTopic(topic, geminiApiKey);

    res.status(200).json({
        success: true,
        data,
    });
};

export const generateViralHook = async (req: Request, res: Response): Promise<void> => {
    const { topic, groupName, geminiApiKey } = req.body;
    if (!topic || typeof topic !== 'string') {
        res.status(400).json({ success: false, error: 'topic is required' });
        return;
    }

    const data = await growthSvc.generateGroupViralHook(topic, groupName, geminiApiKey);

    res.status(200).json({
        success: true,
        data,
    });
};

export default {
    findViralGroups,
    generateViralHook,
};
