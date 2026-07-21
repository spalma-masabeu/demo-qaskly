import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Redis } from "ioredis";

interface TokenBucketOptions {
  capacity: number;
  refillIntervalMs: number;
  ttlSeconds: number;
  nowMs?: number;
}

const TOKEN_BUCKET_SCRIPT = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillIntervalMs = tonumber(ARGV[2])
local nowMs = tonumber(ARGV[3])
local ttlSeconds = tonumber(ARGV[4])

local tokens = capacity
local updatedAt = nowMs
local raw = redis.call("GET", key)

if raw then
  local separator = string.find(raw, ":")
  if separator then
    tokens = tonumber(string.sub(raw, 1, separator - 1)) or capacity
    updatedAt = tonumber(string.sub(raw, separator + 1)) or nowMs
  end

  local elapsed = nowMs - updatedAt
  if elapsed < 0 then
    elapsed = 0
  end

  local refill = math.floor(elapsed / refillIntervalMs)
  if refill > 0 then
    tokens = math.min(capacity, tokens + refill)
    updatedAt = updatedAt + (refill * refillIntervalMs)
  end
end

local allowed = 0
if tokens > 0 then
  tokens = tokens - 1
  allowed = 1
end

redis.call("SET", key, tostring(tokens) .. ":" .. tostring(updatedAt), "EX", ttlSeconds)
return allowed
`;

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
    this.client = new Redis(redisUrl);
  }

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string): Promise<"OK"> {
    return this.client.set(key, value);
  }

  async setWithTtl(
    key: string,
    value: string,
    ttlSeconds: number
  ): Promise<"OK"> {
    return this.client.set(key, value, "EX", ttlSeconds);
  }

  async increment(key: string, ttlSeconds?: number): Promise<number> {
    const value = await this.client.incr(key);
    if (ttlSeconds !== undefined && value === 1) {
      await this.client.expire(key, ttlSeconds);
    }
    return value;
  }

  async consumeTokenBucket(
    key: string,
    options: TokenBucketOptions
  ): Promise<boolean> {
    const result = await this.client.eval(
      TOKEN_BUCKET_SCRIPT,
      1,
      key,
      String(options.capacity),
      String(options.refillIntervalMs),
      String(options.nowMs ?? Date.now()),
      String(options.ttlSeconds)
    );
    return Number(result) === 1;
  }

  async delete(key: string): Promise<number> {
    return this.client.del(key);
  }

  buildKey(...parts: Array<string | number>): string {
    return parts.map((part) => String(part)).join(":");
  }

  sessionStateKey(sessionId: string): string {
    return this.buildKey("session", sessionId, "state");
  }

  sessionCodeKey(code: string): string {
    return this.buildKey("session-code", code.toUpperCase());
  }

  participantTokenKey(sessionId: string, tokenHash: string): string {
    return this.buildKey("session", sessionId, "participant", tokenHash);
  }

  audiencePresenceKey(sessionId: string): string {
    return this.buildKey("session", sessionId, "audience", "presence");
  }

  responseThrottleKey(sessionId: string, participantId: string): string {
    return this.buildKey("throttle", "response", sessionId, participantId);
  }

  reactionThrottleKey(sessionId: string, participantId: string): string {
    return this.buildKey("throttle", "reaction", sessionId, participantId);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
