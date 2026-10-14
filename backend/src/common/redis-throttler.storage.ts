import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import type { ThrottlerStorage } from "@nestjs/throttler";
import type { ThrottlerStorageRecord } from "@nestjs/throttler/dist/throttler-storage-record.interface";
import Redis from "ioredis";

/**
 * Shared rate-limit counters for multi-replica deployments. Nest's default
 * storage is per-process, so N replicas would each allow the full quota.
 * If Redis is unreachable the request is allowed through rather than failing
 * closed on an auxiliary service; the error is logged once per occurrence.
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage, OnModuleDestroy {
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private readonly redis: Redis;

  constructor(url: string) {
    this.redis = new Redis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
      connectTimeout: 2_000,
    });
    this.redis.on("error", (error) => this.logger.error(`Redis rate-limit backend error: ${error.message}`));
  }

  async increment(key: string, ttl: number, limit: number, blockDuration: number, throttlerName: string): Promise<ThrottlerStorageRecord> {
    const hitsKey = `throttle:${throttlerName}:${key}`;
    const blockKey = `${hitsKey}:blocked`;
    try {
      const blockedTtl = await this.redis.pttl(blockKey);
      if (blockedTtl > 0) {
        return { totalHits: limit + 1, timeToExpire: Math.ceil(blockedTtl / 1000), isBlocked: true, timeToBlockExpire: Math.ceil(blockedTtl / 1000) };
      }
      const pipeline = this.redis.multi();
      pipeline.incr(hitsKey);
      pipeline.pttl(hitsKey);
      const result = await pipeline.exec();
      const totalHits = Number(result?.[0]?.[1] ?? 1);
      let remainingMs = Number(result?.[1]?.[1] ?? -1);
      if (remainingMs < 0) {
        await this.redis.pexpire(hitsKey, ttl);
        remainingMs = ttl;
      }
      if (totalHits > limit && blockDuration > 0) {
        await this.redis.set(blockKey, "1", "PX", blockDuration);
        return { totalHits, timeToExpire: Math.ceil(blockDuration / 1000), isBlocked: true, timeToBlockExpire: Math.ceil(blockDuration / 1000) };
      }
      return { totalHits, timeToExpire: Math.ceil(remainingMs / 1000), isBlocked: false, timeToBlockExpire: 0 };
    } catch (error) {
      this.logger.error(`Rate limit check failed, allowing request: ${error instanceof Error ? error.message : String(error)}`);
      return { totalHits: 0, timeToExpire: Math.ceil(ttl / 1000), isBlocked: false, timeToBlockExpire: 0 };
    }
  }

  async onModuleDestroy() {
    await this.redis.quit().catch(() => this.redis.disconnect());
  }
}
