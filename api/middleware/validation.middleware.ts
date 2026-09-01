import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const formatZodIssues = (issues: z.ZodIssue[]): Record<string, string> => {
    const errors: Record<string, string> = {};
    for (const issue of issues) {
        const path = issue.path.join('.');
        if (path) {
            errors[path] = issue.message;
        } else {
            errors['_root'] = issue.message;
        }
    }
    return errors;
};

export const validate = (schemas: {
    body?: z.ZodSchema;
    query?: z.ZodSchema;
    params?: z.ZodSchema;
}) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const validationErrors: Record<string, string> = {};

        if (schemas.body) {
            const result = schemas.body.safeParse(req.body);
            if (!result.success) {
                Object.assign(validationErrors, formatZodIssues(result.error.issues));
            } else {
                req.body = result.data;
            }
        }

        if (schemas.query) {
            const result = schemas.query.safeParse(req.query);
            if (!result.success) {
                Object.assign(validationErrors, formatZodIssues(result.error.issues));
            } else {
                req.query = result.data;
            }
        }

        if (schemas.params) {
            const result = schemas.params.safeParse(req.params);
            if (!result.success) {
                Object.assign(validationErrors, formatZodIssues(result.error.issues));
            } else {
                req.params = result.data;
            }
        }

        if (Object.keys(validationErrors).length > 0) {
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                validationErrors,
            });
            return;
        }

        next();
    };
};

export const validateBody = (schema: z.ZodSchema) => validate({ body: schema });
export const validateQuery = (schema: z.ZodSchema) => validate({ query: schema });
export const validateParams = (schema: z.ZodSchema) => validate({ params: schema });

export default validate;
