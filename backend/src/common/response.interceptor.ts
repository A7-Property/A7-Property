import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from "@nestjs/common";
import { map, Observable } from "rxjs";

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((result) => result instanceof StreamableFile ? result : result && typeof result === "object" && "data" in result ? result : { data: result ?? null }));
  }
}
