import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { assignRequestId, clientIp, requestId } from "./request-context";

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger("HTTP");

  use(request: Request, response: Response, next: NextFunction) {
    // Normally already assigned by assignRequestId; this keeps the id stable if
    // that middleware is not installed (for example in a narrow unit test).
    if (!requestId(request)) assignRequestId(request, response, () => undefined);
    const id = requestId(request)!;
    const start = Date.now();
    response.on("finish", () => {
      const entry = {
        requestId: id,
        method: request.method,
        path: request.path,
        status: response.statusCode,
        durationMs: Date.now() - start,
        ip: clientIp(request),
      };
      // Never log query strings or bodies: they can carry tokens and personal data.
      if (response.statusCode >= 500) this.logger.error(JSON.stringify(entry));
      else if (response.statusCode >= 400) this.logger.warn(JSON.stringify(entry));
      else this.logger.log(JSON.stringify(entry));
    });
    next();
  }
}
