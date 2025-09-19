import type { NextFunction, Request, RequestHandler, Response } from 'express';

declare namespace rateLimit {
  interface RateLimitOptions {
    windowMs?: number;
    limit?: number;
    max?: number;
    message?: string | Record<string, unknown> | ((req: Request, res: Response) => any);
    keyGenerator?: (req: Request, res: Response) => string;
    standardHeaders?: boolean;
    legacyHeaders?: boolean;
    handler?: (req: Request, res: Response, next: NextFunction, options: RateLimitOptions) => void;
  }

  type RateLimitRequestHandler = RequestHandler;
}

declare function rateLimit(options?: rateLimit.RateLimitOptions): rateLimit.RateLimitRequestHandler;

export = rateLimit;
