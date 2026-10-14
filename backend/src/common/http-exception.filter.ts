import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { Request, Response } from "express";
import { Prisma } from "../generated/prisma/client";
import { requestId } from "./request-context";

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  requestId: string | null;
}

/**
 * Body-parser rejections (oversized or malformed payloads) are `http-errors`
 * instances rather than Nest exceptions, so without this they would surface as
 * a 500 instead of the 413/400 the client should see.
 */
interface HttpErrorLike { status?: unknown; statusCode?: unknown; expose?: unknown; type?: unknown; message?: unknown }

function clientSideHttpError(exception: unknown): { status: number; message: string } | null {
  if (typeof exception !== "object" || exception === null) return null;
  const candidate = exception as HttpErrorLike;
  const status = Number(candidate.status ?? candidate.statusCode);
  if (!Number.isInteger(status) || status < 400 || status > 499) return null;
  if (candidate.expose !== true) return null;
  const messages: Record<string, string> = {
    "entity.too.large": "Request body is too large",
    "entity.parse.failed": "Request body is not valid JSON",
    "encoding.unsupported": "Unsupported content encoding",
  };
  return { status, message: messages[String(candidate.type)] ?? "The request could not be processed" };
}

/**
 * Canonical reason phrase for a status, so the `error` field reads the same
 * whether the failure came from a Nest exception, a driver error or a parser.
 * Nest's own exceptions carry "Bad Request" while `HttpStatus` spells it
 * "BAD_REQUEST"; clients should not have to handle both.
 */
function reasonPhrase(status: number) {
  const name = HttpStatus[status];
  if (!name) return "Error";
  return String(name).toLowerCase().split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

const prismaStatus: Record<string, { status: number; message: string }> = {
  P2002: { status: HttpStatus.CONFLICT, message: "That record already exists" },
  P2003: { status: HttpStatus.BAD_REQUEST, message: "Related record is missing" },
  P2025: { status: HttpStatus.NOT_FOUND, message: "Record not found" },
  P2000: { status: HttpStatus.BAD_REQUEST, message: "A value is too long for its field" },
  P2014: { status: HttpStatus.BAD_REQUEST, message: "That change would break a required relation" },
};

/**
 * Single error shape for every failure, so clients never have to branch on
 * Nest's default body vs a driver error. Database and runtime details stay in
 * the server log; the response only carries a safe message and the request id.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("Exception");

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const id = requestId(request);
    const body = this.toBody(exception, id);

    const context = `${request.method} ${request.path} -> ${body.statusCode} [${id ?? "no-request-id"}]`;
    if (body.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(context, exception instanceof Error ? exception.stack : String(exception));
    } else {
      this.logger.warn(`${context} ${JSON.stringify(body.message)}`);
    }

    if (response.headersSent) {
      response.destroy();
      return;
    }
    response.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown, id: string | null): ErrorBody {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const message = typeof payload === "string"
        ? payload
        : (payload as { message?: string | string[] }).message ?? exception.message;
      return { statusCode: status, error: reasonPhrase(status), message, requestId: id };
    }

    const httpError = clientSideHttpError(exception);
    if (httpError) {
      return { statusCode: httpError.status, error: reasonPhrase(httpError.status), message: httpError.message, requestId: id };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = prismaStatus[exception.code];
      if (mapped) return { statusCode: mapped.status, error: reasonPhrase(mapped.status), message: mapped.message, requestId: id };
      // P1xxx codes are connection and engine failures: the database is
      // unreachable, timed out or refused the credentials. Reporting those as a
      // client error would hide an outage from monitoring and stop clients retrying.
      if (exception.code.startsWith("P1")) {
        return { statusCode: HttpStatus.SERVICE_UNAVAILABLE, error: reasonPhrase(HttpStatus.SERVICE_UNAVAILABLE), message: "The service is temporarily unavailable", requestId: id };
      }
      return { statusCode: HttpStatus.BAD_REQUEST, error: reasonPhrase(HttpStatus.BAD_REQUEST), message: "The request could not be completed", requestId: id };
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return { statusCode: HttpStatus.BAD_REQUEST, error: reasonPhrase(HttpStatus.BAD_REQUEST), message: "The request could not be completed", requestId: id };
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      return { statusCode: HttpStatus.SERVICE_UNAVAILABLE, error: reasonPhrase(HttpStatus.SERVICE_UNAVAILABLE), message: "The service is temporarily unavailable", requestId: id };
    }

    return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, error: reasonPhrase(HttpStatus.INTERNAL_SERVER_ERROR), message: "Something went wrong", requestId: id };
  }
}
