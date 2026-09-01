import type { Request, Response } from 'express';
import {
    getUserAbTests,
    createAbTestCampaign,
    evaluateAbTestWinner,
} from '../services/abTesting.service.js';

export async function getAbTestsHandler(req: Request, res: Response) {
    try {
        const userId = req.user!.id;
        const tests = await getUserAbTests(userId);
        return res.json({ success: true, data: tests });
    } catch (err: any) {
        return res.status(500).json({ success: false, error: err.message });
    }
}

export async function createAbTestHandler(req: Request, res: Response) {
    try {
        const userId = req.user!.id;
        const test = await createAbTestCampaign(userId, req.body);
        return res.status(201).json({ success: true, data: test });
    } catch (err: any) {
        return res.status(400).json({ success: false, error: err.message });
    }
}

export async function evaluateWinnerHandler(req: Request, res: Response) {
    try {
        const userId = req.user!.id;
        const testId = Number(req.params.id);
        const result = await evaluateAbTestWinner(userId, testId);
        return res.json({ success: true, data: result });
    } catch (err: any) {
        return res.status(400).json({ success: false, error: err.message });
    }
}
