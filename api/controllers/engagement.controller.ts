import type { Request, Response } from 'express';
import {
    getUserEngagementRules,
    createEngagementRule,
    updateEngagementRule,
    deleteEngagementRule,
    evaluateCommentAndAutoReply,
} from '../services/engagement.service.js';

export async function getRulesHandler(req: Request, res: Response) {
    try {
        const userId = req.user!.id;
        const rules = await getUserEngagementRules(userId);
        return res.json({ success: true, data: rules });
    } catch (err: any) {
        return res.status(500).json({ success: false, error: err.message });
    }
}

export async function createRuleHandler(req: Request, res: Response) {
    try {
        const userId = req.user!.id;
        const rule = await createEngagementRule(userId, req.body);
        return res.status(201).json({ success: true, data: rule });
    } catch (err: any) {
        return res.status(400).json({ success: false, error: err.message });
    }
}

export async function updateRuleHandler(req: Request, res: Response) {
    try {
        const userId = req.user!.id;
        const ruleId = Number(req.params.id);
        const rule = await updateEngagementRule(userId, ruleId, req.body);
        return res.json({ success: true, data: rule });
    } catch (err: any) {
        return res.status(400).json({ success: false, error: err.message });
    }
}

export async function deleteRuleHandler(req: Request, res: Response) {
    try {
        const userId = req.user!.id;
        const ruleId = Number(req.params.id);
        await deleteEngagementRule(userId, ruleId);
        return res.json({ success: true, message: 'Rule deleted' });
    } catch (err: any) {
        return res.status(400).json({ success: false, error: err.message });
    }
}

export async function testCommentReplyHandler(req: Request, res: Response) {
    try {
        const userId = req.user!.id;
        const { commentText, authorName } = req.body;
        if (!commentText) {
            return res.status(400).json({ success: false, error: 'commentText is required' });
        }
        const result = await evaluateCommentAndAutoReply(userId, commentText, authorName);
        return res.json({ success: true, data: result });
    } catch (err: any) {
        return res.status(500).json({ success: false, error: err.message });
    }
}
