import { config } from "../config/index.js";
import { ForbiddenError, UnAuthorizedError } from "../utils/error.js";

const getHeaderValue = (header) => Array.isArray(header) ? header[0] : header;

export const requireGateway = (req, res, next) => {
     const gatewaySecret = getHeaderValue(req.headers['x-gateway-secret']);

     if (gatewaySecret !== config.INTERNAL_GATEWAY_SECRET) {
          return next(new UnAuthorizedError('Request must come through API gateway'));
     }

     next();
}

/**
 * Extract user context from gateway headers
 * Gateway sets x-user-id after JWT verification(We have discussed this in video)
 */
export const getUserContext = (req, res, next) => {
     const userId = getHeaderValue(req.headers['x-user-id']);
     const role = getHeaderValue(req.headers['x-user-role']);

     if (!userId) {
          return next(
               new UnAuthorizedError('User context missing - must come through gateway')
          );
     }

     req.user = { id: userId, role };
     next();
}

export const requireAdminContext = (req, res, next) => {
     if (req.user?.role !== 'ADMIN') {
          return next(new ForbiddenError('Admin access required'));
     }

     next();
}
