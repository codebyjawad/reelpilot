import { Request, Response } from 'express';
import * as backgroundWorkerSvc from '../services/backgroundWorker.service.js';

export const getStatus = async (_req: Request, res: Response): Promise<void> => {
  const status = await backgroundWorkerSvc.getWorkerStatus();

  res.status(200).json({
    success: true,
    data: status,
  });
};

export const triggerAutoRetry = async (_req: Request, res: Response): Promise<void> => {
  const count = await backgroundWorkerSvc.autoRetryFailedReels();

  res.status(200).json({
    success: true,
    data: { retriedCount: count },
  });
};

export default {
  getStatus,
  triggerAutoRetry,
};
