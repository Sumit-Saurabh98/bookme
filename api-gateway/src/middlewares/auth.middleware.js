import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { ForbiddenError, UnauthorizedError } from '../utils/error.js';
import { logger } from '../config/logger.js';

export const requireAuth = (req, res, next) => {
     try {
          const accessToken =
               req.cookies?.accessToken ||
               (req.headers.authorization?.startsWith("Bearer ")
                    ? req.headers.authorization.split(" ")[1]
                    : null);

          if (!accessToken) {
               throw new UnauthorizedError('Authorization token missing');
          }

          // Verify access token
          const payload = jwt.verify(accessToken, config.JWT_ACCESS_SECRET);

          if (!payload.id) {
               throw new UnauthorizedError('Invalid token payload');
          }

          req.user = {
               id: payload.id,
               role: payload.role || 'USER'
          };

          logger.debug(`User ${payload.id} authenticated successfully`);

          next();
     } catch (err) {
          if (err.name === 'TokenExpiredError') {
               return next(new UnauthorizedError('Access token expired', 'TOKEN_EXPIRED'));
          }
          if (err.name === 'JsonWebTokenError') {
               return next(new UnauthorizedError('Invalid access token', 'TOKEN_INVALID'));
          }
          return next(err);
     }
}

export const requireRole = (...allowedRoles) => {
     return (req, res, next) => {
          if (!req.user?.role || !allowedRoles.includes(req.user.role)) {
               return next(new ForbiddenError('Admin access required', 'ADMIN_ACCESS_REQUIRED'));
          }

          next();
     };
}

export const requireAdmin = requireRole('ADMIN');
