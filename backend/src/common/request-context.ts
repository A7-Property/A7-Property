import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

const safeRequestId = /^[A-Za-z0-9._-]{8,128}$/;

export interface RequestContext {
  requestId: string;
  ip: string | null;
  userAgent: string | null;
}

/** Only accept an inbound correlation id when it is short and safe to echo into logs. */
export function inboundRequestId(value: unknown) {
  return typeof value === "string" && safeRequestId.test(value) ? value : null;
}

/**
 * Stamps every request with a correlation id. Installed as the first Express
 * middleware so that failures raised during body parsing — which happens before
 * Nest's own middleware runs — still carry an id in the response and the log.
 */
export function assignRequestId(request: Request, response: Response, next: NextFunction) {
  const existing = (request as Request & { requestId?: string }).requestId;
  const id = existing ?? inboundRequestId(request.headers["x-request-id"]) ?? randomUUID();
  (request as Request & { requestId?: string }).requestId = id;
  if (!response.headersSent) response.setHeader("X-Request-Id", id);
  next();
}

export function requestId(request: Request) {
  return (request as Request & { requestId?: string }).requestId ?? null;
}

/** Client address, honouring only the proxy hops Express is configured to trust. */
export function clientIp(request: Request) {
  return request.ip ?? request.socket?.remoteAddress ?? null;
}

export function userAgent(request: Request) {
  const value = request.headers["user-agent"];
  return typeof value === "string" ? value.slice(0, 500) : null;
}

export function requestContext(request: Request): RequestContext {
  return { requestId: requestId(request) ?? "unknown", ip: clientIp(request), userAgent: userAgent(request) };
}
