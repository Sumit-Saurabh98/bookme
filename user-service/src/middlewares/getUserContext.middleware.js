import { config } from "../config/index.js";
import { UnAuthorizedError } from "../utils/error.js";

const getHeaderValue = (header) => Array.isArray(header) ? header[0] : header;

export const requireGateway = (req, res, next) => {
     const gatewaySecret = getHeaderValue(req.headers['x-gateway-secret']);

     if (gatewaySecret !== config.INTERNAL_GATEWAY_SECRET) {
          return next(
               new UnAuthorizedError('Request must come through API gateway')
          );
     }

     next();
}

/**
 * Extract user context from gateway headers
 * Gateway sets x-user-id after JWT verification(We have discussed this in video)
 */
export const getUserContext = (req, res, next)=>  {
     const userId = getHeaderValue(req.headers['x-user-id']);

     if (!userId) {
          return next(
               new UnAuthorizedError('User context missing - must come through gateway')
          );
     }

     req.user = { id: userId };
     next();
}
