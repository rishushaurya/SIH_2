import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodSchema } from 'zod';

export function validateBody(schema: ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid request payload structure.',
          field_errors: error.issues.map((e) => ({
            field: e.path.join('.'),
            issue: e.message,
          })),
          request_id: (req as any).requestId,
        });
      }
      next(error);
    }
  };
}
