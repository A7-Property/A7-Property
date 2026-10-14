import { BadRequestException, ForbiddenException, HttpStatus, NotFoundException } from "@nestjs/common";
import type { ArgumentsHost } from "@nestjs/common";
import { Prisma } from "../src/generated/prisma/client";
import { HttpExceptionFilter } from "../src/common/http-exception.filter";

interface Captured { status?: number; body?: Record<string, unknown>; destroyed?: boolean }

function hostFor(captured: Captured, options: { headersSent?: boolean } = {}): ArgumentsHost {
  const response = {
    headersSent: options.headersSent ?? false,
    status(code: number) { captured.status = code; return this; },
    json(body: Record<string, unknown>) { captured.body = body; return this; },
    destroy() { captured.destroyed = true; },
  };
  const request = { method: "POST", path: "/api/v1/properties", requestId: "req-123" };
  return { switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }) } as unknown as ArgumentsHost;
}

describe("HttpExceptionFilter", () => {
  const filter = new HttpExceptionFilter();

  it("keeps the status and message of a Nest exception and adds the request id", () => {
    const captured: Captured = {};
    filter.catch(new NotFoundException("Property not found"), hostFor(captured));
    expect(captured.status).toBe(HttpStatus.NOT_FOUND);
    expect(captured.body).toEqual({ statusCode: 404, error: "Not Found", message: "Property not found", requestId: "req-123" });
  });

  it("uses a consistent reason phrase whatever raised the failure", () => {
    const fromNest: Captured = {};
    filter.catch(new BadRequestException("Bad input"), hostFor(fromNest));
    const fromForbidden: Captured = {};
    filter.catch(new ForbiddenException(), hostFor(fromForbidden));
    expect(fromNest.body?.error).toBe("Bad Request");
    expect(fromForbidden.body?.error).toBe("Forbidden");
  });

  it("preserves the field list from a validation failure", () => {
    const captured: Captured = {};
    filter.catch(new BadRequestException(["price must be a number", "title should not be empty"]), hostFor(captured));
    expect(captured.body?.message).toEqual(["price must be a number", "title should not be empty"]);
  });

  it("maps a unique-constraint violation to 409 without leaking the query", () => {
    const captured: Captured = {};
    const error = new Prisma.PrismaClientKnownRequestError("Unique constraint failed on the fields: (`email`)", { code: "P2002", clientVersion: "7.10.0" });
    filter.catch(error, hostFor(captured));
    expect(captured.status).toBe(HttpStatus.CONFLICT);
    expect(captured.body?.message).toBe("That record already exists");
    expect(JSON.stringify(captured.body)).not.toContain("Unique constraint");
  });

  it("maps a missing record to 404 and an unknown driver code to a safe 400", () => {
    const missing: Captured = {};
    filter.catch(new Prisma.PrismaClientKnownRequestError("not found", { code: "P2025", clientVersion: "7.10.0" }), hostFor(missing));
    expect(missing.status).toBe(HttpStatus.NOT_FOUND);

    const unknown: Captured = {};
    filter.catch(new Prisma.PrismaClientKnownRequestError("internal detail", { code: "P9999", clientVersion: "7.10.0" }), hostFor(unknown));
    expect(unknown.status).toBe(HttpStatus.BAD_REQUEST);
    expect(unknown.body?.message).toBe("The request could not be completed");
  });

  it("reports an unreachable database as unavailable rather than a client error", () => {
    // P1001 is raised when the database host cannot be reached. A 400 here would
    // tell monitoring the caller was at fault and stop clients retrying.
    const captured: Captured = {};
    filter.catch(new Prisma.PrismaClientKnownRequestError("Can't reach database server at db:5432", { code: "P1001", clientVersion: "7.10.0" }), hostFor(captured));
    expect(captured.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(captured.body?.message).toBe("The service is temporarily unavailable");
    expect(JSON.stringify(captured.body)).not.toContain("db:5432");
  });

  it("reports a connection timeout as unavailable too", () => {
    const captured: Captured = {};
    filter.catch(new Prisma.PrismaClientKnownRequestError("Timed out", { code: "P1008", clientVersion: "7.10.0" }), hostFor(captured));
    expect(captured.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
  });

  it("reports a database that will not connect as unavailable, not as a bad request", () => {
    const captured: Captured = {};
    filter.catch(new Prisma.PrismaClientInitializationError("Can't reach database server at db:5432", "7.10.0"), hostFor(captured));
    expect(captured.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(JSON.stringify(captured.body)).not.toContain("db:5432");
  });

  it("hides the details of an unexpected error behind a 500", () => {
    const captured: Captured = {};
    filter.catch(new Error("DATABASE_URL=postgres://user:secret@host/db failed"), hostFor(captured));
    expect(captured.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(captured.body?.message).toBe("Something went wrong");
    expect(JSON.stringify(captured.body)).not.toContain("secret");
  });

  it("maps an oversized body to 413 with a stable message", () => {
    const captured: Captured = {};
    filter.catch(Object.assign(new Error("request entity too large"), { status: 413, type: "entity.too.large", expose: true }), hostFor(captured));
    expect(captured.status).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
    expect(captured.body).toMatchObject({ error: "Payload Too Large", message: "Request body is too large" });
  });

  it("does not try to write a second response once headers are sent", () => {
    const captured: Captured = {};
    filter.catch(new Error("late failure"), hostFor(captured, { headersSent: true }));
    expect(captured.status).toBeUndefined();
    expect(captured.destroyed).toBe(true);
  });
});
