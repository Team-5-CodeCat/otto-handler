import { Injectable } from '@nestjs/common';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { Redis } from 'ioredis';

@Injectable()
export class AppService {
  private readonly redis: Redis;

  constructor(private readonly redisService: RedisService) {
    this.redis = this.redisService.getOrThrow();
  }

  getHello(): string {
    return 'Hello World!';
  }

  /**
   * Redis 연결 상태를 확인하는 ping 메서드
   * @returns Redis ping 결과 (일반적으로 "PONG")
   */
  async pingRedis(): Promise<string> {
    try {
      const result = await this.redis.ping();
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Redis ping failed: ${errorMessage}`);
    }
  }

  /**
   * 사용자 정의 메시지와 함께 ping을 보내는 메서드
   * @param message 사용자 정의 메시지
   * @returns 전송한 메시지가 그대로 반환됨
   */
  async pingRedisWithMessage(message: string): Promise<string> {
    try {
      const result = await this.redis.ping(message);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Redis ping with message failed: ${errorMessage}`);
    }
  }

  /**
   * 애플리케이션 시작 시 Redis 연결을 확인하는 메서드
   * @returns Redis 연결 성공 여부
   */
  async checkRedisConnection(): Promise<boolean> {
    try {
      await this.redis.ping();
      console.log('✅ Redis connection successful');
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Redis connection failed: ${errorMessage}`);
      return false;
    }
  }
}
