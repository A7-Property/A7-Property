import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { ThrottlerRequest } from "@nestjs/throttler/dist/throttler.guard.interface";
import type { AuthIdentity } from "../common/auth";

/** Route guards run after the global IP limiter and AuthGuard. */
@Injectable()
export class PropertyImageThrottlerGuard extends ThrottlerGuard {
  protected async getErrorMessage(): Promise<string> {
    return "Too many photo uploads. Please wait one minute before uploading more photos.";
  }

  protected async getTracker(request: { user?: AuthIdentity }): Promise<string> {
    // Trust only the identity populated by AuthGuard, never client headers or an unverified JWT.
    if (!request.user?.id) throw new UnauthorizedException();
    return `property-image-user:${request.user.id}`;
  }

  protected handleRequest(props: ThrottlerRequest): Promise<boolean> {
    return super.handleRequest({
      ...props,
      limit: 30,
      ttl: 60_000,
      blockDuration: 60_000,
      getTracker: (request) => this.getTracker(request),
    });
  }
}
