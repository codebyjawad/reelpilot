import { Request, Response } from 'express';
import * as commentsSvc from '../services/comments.service.js';

export const getReelComments = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const reelId = Number(req.params.reelId);

    const result = await commentsSvc.fetchReelComments(userId, reelId);

    res.status(200).json({
        success: true,
        data: result,
    });
};

export const generateAiReply = async (req: Request, res: Response): Promise<void> => {
    const { commentMessage, reelTitle, tone, geminiApiKey } = req.body;

    if (!commentMessage || !reelTitle) {
        res.status(400).json({ success: false, error: 'commentMessage and reelTitle are required' });
        return;
    }

    const reply = await commentsSvc.generateAiCommentReply(commentMessage, reelTitle, tone, geminiApiKey);

    res.status(200).json({
        success: true,
        data: { reply },
    });
};

export const postReply = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { commentId, replyText, pageId } = req.body;

    if (!commentId || !replyText) {
        res.status(400).json({ success: false, error: 'commentId and replyText are required' });
        return;
    }

    const result = await commentsSvc.postCommentReply(userId, commentId, replyText, pageId);

    res.status(200).json({
        success: true,
        data: result,
    });
};

export const runAutoBot = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const reelId = Number(req.params.reelId);
    const { tone } = req.body;

    const result = await commentsSvc.runAutoResponderForReel(userId, reelId, tone);

    res.status(200).json({
        success: true,
        data: result,
    });
};

export default {
    getReelComments,
    generateAiReply,
    postReply,
    runAutoBot,
};
