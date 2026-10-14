import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { Public } from "../common/auth";
import { PrismaService } from "../prisma/prisma.service";

const startedAt = new Date();

@ApiTags("Health")
@Public()
@SkipThrottle()
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness: answers as long as the process can serve traffic. Never touches the database. */
  @Get("live")
  live() {
    return {
      status: "ok",
      version: process.env.APP_VERSION ?? "unknown",
      startedAt: startedAt.toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    };
  }

  /** Readiness: fails while dependencies are down so the platform stops routing to this replica. */
  @Get("ready")
  async ready() {
    const checks: Record<string, "ok" | "failed"> = { database: "ok" };
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      checks.database = "failed";
    }
    if (Object.values(checks).includes("failed")) throw new ServiceUnavailableException({ status: "unavailable", checks });
    return { status: "ok", checks, version: process.env.APP_VERSION ?? "unknown" };
  }
}
