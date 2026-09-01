
import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { authenticateJWT } from './middleware/auth.middleware.js';
import { apiLimiter } from './middleware/rateLimit.middleware.js';

import authRoutes from './routes/auth.routes.js';
import pagesRoutes from './routes/pages.routes.js';
import reelsRoutes from './routes/reels.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import uploadsRoutes from './routes/uploads.routes.js';
import rssRoutes from './routes/rss.routes.js';
import bulkRoutes from './routes/bulk.routes.js';
import groupsRoutes from './routes/groups.routes.js';
import commentsRoutes from './routes/comments.routes.js';
import growthRoutes from './routes/growth.routes.js';
import backgroundRoutes from './routes/background.routes.js';
import aiAutoPilotRoutes from './routes/aiAutoPilot.routes.js';
import brandingRoutes from './routes/branding.routes.js';
import engagementRoutes from './routes/engagement.routes.js';
import abTestRoutes from './routes/abTest.routes.js';
import youtubeRoutes from './routes/youtube.routes.js';

const app = express();

app.set('trust proxy', 1);

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
  }),
);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use(cookieParser());

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'ok' });
});

app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/pages', authenticateJWT, pagesRoutes);
app.use('/api/reels', authenticateJWT, reelsRoutes);
app.use('/api/dashboard', authenticateJWT, dashboardRoutes);
app.use('/api/uploads', authenticateJWT, uploadsRoutes);
app.use('/api/rss-feeds', authenticateJWT, rssRoutes);
app.use('/api/reels/bulk-import', authenticateJWT, bulkRoutes);
app.use('/api/groups', authenticateJWT, groupsRoutes);
app.use('/api/comments', authenticateJWT, commentsRoutes);
app.use('/api/growth', authenticateJWT, growthRoutes);
app.use('/api/background', authenticateJWT, backgroundRoutes);
app.use('/api/ai-autopilot', authenticateJWT, aiAutoPilotRoutes);
app.use('/api/branding', authenticateJWT, brandingRoutes);
app.use('/api/engagement', authenticateJWT, engagementRoutes);
app.use('/api/ab-testing', authenticateJWT, abTestRoutes);
app.use('/api/youtube', authenticateJWT, youtubeRoutes);


// Serve AI-generated images and other uploads statically
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsDir));

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ReelPilot API',
      version: '1.0.0',
      description: 'ReelPilot Backend API - Facebook Reels scheduling & publishing',
    },
    servers: [
      {
        url: `/api`,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' });
});

app.use((err: Error & { statusCode?: number; validationErrors?: unknown; name?: string; errors?: any[]; original?: any }, req: Request, res: Response, _next: NextFunction) => {
  let status = err.statusCode ?? 500;
  let message: string = err.message;

  if (!err.statusCode) {
    if (err.name === 'SequelizeConnectionRefusedError' ||
      err.name === 'SequelizeConnectionError' ||
      err.name === 'SequelizeHostNotFoundError' ||
      err.name === 'ConnectionError') {
      status = 503;
      message = 'Database service is currently unavailable. Please try again in a moment or contact support.';
    } else if (err.name === 'SequelizeUniqueConstraintError') {
      status = 409;
      const fields = (err.errors || []).map(e => (e as any)?.path || (e as any)?.message).filter(Boolean);
      if (fields.some((f: string) => String(f).toLowerCase().includes('email'))) {
        message = 'An account with this email already exists. Please sign in instead.';
      } else {
        message = 'Duplicate entry - a record with these unique values already exists.';
      }
    } else if (err.name === 'SequelizeValidationError') {
      status = 400;
      const firstMsg = (err.errors || [])[0]?.message;
      if (firstMsg) message = firstMsg;
    } else if (err.name === 'ZodError') {
      status = 400;
      message = 'Request validation failed';
    } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      status = 401;
      message = err.name === 'TokenExpiredError' ? 'Your session has expired. Please sign in again.' : 'Invalid authentication token. Please sign in.';
    } else if ((err as any).code === 'LIMIT_UNEXPECTED_FILE') {
      status = 413;
      message = 'File is too large or the wrong field was used for upload.';
    }
  }

  const logLevel = status >= 500 ? 'error' : 'warn';
  logger[logLevel]('API error', {
    status,
    method: req.method,
    path: req.path,
    name: err.name,
    message,
    rawMessage: err.message !== message ? err.message : undefined,
    validationErrors: err.validationErrors,
    stack: status >= 500 ? err.stack : undefined,
  });

  if (res.headersSent) {
    return;
  }

  const body: Record<string, unknown> = {
    success: false,
    error: message,
  };
  if (err.validationErrors) {
    body.validationErrors = err.validationErrors;
  }
  if (status === 409 && (err as any)?.errors?.length) {
    (body as any).conflictFields = (err as any).errors.map((e: any) => e.path || e.message);
  }
  res.status(status).json(body);
});

export default app;
