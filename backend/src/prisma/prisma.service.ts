import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required");
    // A bounded pool and a server-side statement timeout keep one slow query
    // from exhausting database connections for every other request.
    const statementTimeout = Number(process.env.DATABASE_STATEMENT_TIMEOUT_MS ?? 15_000);
    super({
      adapter: new PrismaPg({
        connectionString,
        max: Number(process.env.DATABASE_POOL_MAX ?? 10),
        connectionTimeoutMillis: 10_000,
        idleTimeoutMillis: 30_000,
        statement_timeout: statementTimeout,
        query_timeout: statementTimeout,
        application_name: "a7-property-api",
      }),
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log("Database connection pool ready");
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
