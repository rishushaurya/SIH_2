import { NextFunction, Request, Response } from 'express';
import { verifyAuthToken } from './jwt';

export interface AuthenticatedRequest extends Request {
  user?: {
    citizen_hash: string;
    full_name: string;
    role: 'CITIZEN' | 'DEPT_ADMIN' | 'SYS_ADMIN';
    department_id?: string;
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authorization header with Bearer token is required.',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAuthToken(token);
    req.user = payload;
    next();
  } catch (error: any) {
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: error.message,
    });
  }
}

export function requireRole(allowedRoles: ('CITIZEN' | 'DEPT_ADMIN' | 'SYS_ADMIN')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: `Role ${req.user.role} does not possess required permissions (${allowedRoles.join(', ')}).`,
      });
    }

    next();
  };
}
