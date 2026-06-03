import { NextFunction, Request, RequestHandler, Response } from "express";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  message: string;
  keyPrefix: string;
  keyGenerator?: (req: Request) => string;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();

// Handles getClientIp logic.
const getClientIp = (req: Request) => req.ip || req.socket.remoteAddress || "unknown";

// Handles cleanupExpiredBuckets logic.
const cleanupExpiredBuckets = (now: number) => {
  for (const [key, entry] of buckets.entries()) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
};

// Handles createRateLimiter logic.
export const createRateLimiter = ({
  windowMs,
  max,
  message,
  keyPrefix,
  keyGenerator = getClientIp
}: RateLimitOptions): RequestHandler => {
  // Handles rateLimitMiddleware logic.
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    cleanupExpiredBuckets(now);

    const key = `${keyPrefix}:${keyGenerator(req)}`;
    const current = buckets.get(key);
    const entry =
      current && current.resetAt > now
        ? current
        : {
            count: 0,
            resetAt: now + windowMs
          };

    entry.count += 1;
    buckets.set(key, entry);

    const remaining = Math.max(max - entry.count, 0);
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);

    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({ message });
      return;
    }

    next();
  };
};

// Handles userOrIpKey logic.
const userOrIpKey = (req: Request) => req.user?.userId || getClientIp(req);

// Handles emailAndIpKey logic.
const emailAndIpKey = (req: Request) => {
  const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "unknown";
  return `${getClientIp(req)}:${email}`;
};

export const loginRateLimiter = createRateLimiter({
  keyPrefix: "auth:login",
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts. Please try again later.",
  keyGenerator: emailAndIpKey
});

export const registerRateLimiter = createRateLimiter({
  keyPrefix: "auth:register",
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many registration attempts. Please try again later.",
  keyGenerator: emailAndIpKey
});

export const chatRateLimiter = createRateLimiter({
  keyPrefix: "ai:chat",
  windowMs: 60 * 1000,
  max: 20,
  message: "Too many AI messages. Please slow down.",
  keyGenerator: userOrIpKey
});

export const uploadRateLimiter = createRateLimiter({
  keyPrefix: "ai:upload",
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many file uploads. Please try again later.",
  keyGenerator: userOrIpKey
});
