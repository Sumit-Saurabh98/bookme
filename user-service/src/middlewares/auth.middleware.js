import { verifyAccessToken } from "../utils/auth.js";
import { UnAuthorizedError } from "../utils/error.js";

export const requireAuth = (req, res, next) => {
    const accessToken =
        req.cookies?.accessToken ||
        (req.headers.authorization?.startsWith("Bearer ")
            ? req.headers.authorization.split(" ")[1]
            : null);

    if (!accessToken) {
        return next(new UnAuthorizedError("Authorization token missing"));
    }

    try {
        const payload = verifyAccessToken(accessToken);
        req.user = {
            id: payload.id
        };
        next();
    } catch (err) {
        return next(new UnAuthorizedError("Invalid or expired access token"));
    }
}