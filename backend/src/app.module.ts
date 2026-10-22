import { MiddlewareConsumer, Module, NestModule, type DynamicModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthGuard } from "./common/auth.guard";
import { validateEnvironment } from "./common/config";
import { HttpExceptionFilter } from "./common/http-exception.filter";
import { RedisThrottlerStorage } from "./common/redis-throttler.storage";
import { RequestLoggerMiddleware } from "./common/request-logger.middleware";
import { ResponseInterceptor } from "./common/response.interceptor";
import { PrismaModule } from "./prisma/prisma.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { PropertiesModule } from "./properties/properties.module";
import { UsersModule } from "./users/users.module";
import { SavedModule } from "./saved/saved.module";
import { SavedSearchesModule } from "./saved-searches/saved-searches.module";
import { InquiriesModule } from "./inquiries/inquiries.module";
import { MessagesModule } from "./messages/messages.module";
import { ViewingsModule } from "./viewings/viewings.module";
import { UploadsModule } from "./uploads/uploads.module";
import { AdminModule } from "./admin/admin.module";
import { MailModule } from "./mail/mail.module";
import { HealthModule } from "./health/health.module";
import { MaintenanceModule } from "./maintenance/maintenance.module";

/**
 * Rate-limit counters live in Redis when REDIS_URL is set. Without it the
 * default per-process storage is used, which only enforces the quota correctly
 * on a single replica.
 */
function throttlerModule(): DynamicModule {
  const limit = Number(process.env.THROTTLE_LIMIT ?? 60);
  const ttl = Number(process.env.THROTTLE_TTL_SECONDS ?? 60) * 1_000;
  const redisUrl = process.env.REDIS_URL;
  return ThrottlerModule.forRoot({
    throttlers: [{ ttl, limit }],
    ...(redisUrl ? { storage: new RedisThrottlerStorage(redisUrl) } : {}),
  });
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    throttlerModule(),
    JwtModule.register({ global: true }),
    PrismaModule,
    AuditModule,
    AuthModule,
    PropertiesModule,
    UsersModule,
    SavedModule,
    SavedSearchesModule,
    InquiriesModule,
    MessagesModule,
    ViewingsModule,
    UploadsModule,
    AdminModule,
    MailModule,
    HealthModule,
    MaintenanceModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes("{*path}");
  }
}
