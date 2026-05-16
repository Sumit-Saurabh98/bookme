import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UnauthorizedError } from '../utils/error.js';
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

          // Attach user context to request for downstream services
          req.user = {
               id: payload.id,
          };

          // Add user ID to headers for proxied requests
          req.headers['x-user-id'] = payload.id.toString();

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



