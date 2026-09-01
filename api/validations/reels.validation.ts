import { z } from 'zod';
import type { ReelStatus, VideoSource } from '../../shared/types.js';

const REEL_STATUSES: [ReelStatus, ...ReelStatus[]] = [
    'draft',
    'scheduled',
    'uploading',
    'publishing',
    'published',
    'failed',
];

const VIDEO_SOURCES: [VideoSource, ...VideoSource[]] = ['url', 'upload'];

export const HashtagSchema = z
    .string()
    .max(30, 'Hashtag must be at most 30 characters');

export const CreateReelSchema = z
    .object({
        pageId: z
            .number({ invalid_type_error: 'pageId must be a number' })
            .int()
            .positive('pageId must be a positive number'),
        title: z
            .string()
            .min(1, 'Title is required')
            .max(255, 'Title must be at most 255 characters'),
        caption: z
            .string()
            .max(2200, 'Caption must be at most 2200 characters')
            .nullish(),
        hashtags: z.array(HashtagSchema).optional().default([]),
        videoSource: z.enum(VIDEO_SOURCES, {
            required_error: 'videoSource is required',
        }),
        videoUrl: z
            .string()
            .url('videoUrl must be a valid URL')
            .nullish(),
        scheduledAt: z
            .string()
            .refine((val) => !isNaN(Date.parse(val)), 'scheduledAt must be a valid ISO date')
            .nullish(),
    })
    .superRefine((data, ctx) => {
        if (data.videoSource === 'url' && !data.videoUrl) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['videoUrl'],
                message: 'videoUrl is required when videoSource is "url"',
            });
        }
    });

export const UpdateReelSchema = z.object({
    pageId: z.number().int().positive().optional(),
    title: z.string().min(1).max(255).optional(),
    caption: z.string().max(2200).nullish().optional(),
    hashtags: z.array(HashtagSchema).optional(),
    videoSource: z.enum(VIDEO_SOURCES).optional(),
    videoUrl: z.string().url().nullish().optional(),
    scheduledAt: z.string().refine((val) => !isNaN(Date.parse(val))).nullish().optional(),
    status: z.enum(REEL_STATUSES).optional(),
});

export const ReelQuerySchema = z.object({
    status: z
        .union([z.enum(['all', ...REEL_STATUSES]), z.undefined()])
        .default('all'),
    pageId: z.coerce.number().int().positive().optional(),
    from: z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), 'from must be a valid date')
        .optional(),
    to: z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), 'to must be a valid date')
        .optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100, 'limit must be at most 100').default(20),
});

export type CreateReelDto = z.infer<typeof CreateReelSchema>;
export type UpdateReelDto = z.infer<typeof UpdateReelSchema>;
export type ReelQueryDto = z.infer<typeof ReelQuerySchema>;
