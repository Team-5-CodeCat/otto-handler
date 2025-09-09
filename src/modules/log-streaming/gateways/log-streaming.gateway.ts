/*
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

import { LogStreamingService } from '../services/log-streaming.service';
import type { ILogStreamingGateway } from '../interfaces/log-streaming.interface';
import type { LogFilter, LogStreamSession } from '../types/log-streaming.types';
import type { WorkerLogEntry, PipelineProgress } from '../../../generated/otto';

/!**
 * 🔌 LogStreamingGateway
 *
 * 📋 목적:
 * - WebSocket 기반 양방향 실시간 로그 스트리밍
 * - Socket.IO를 통한 고급 실시간 기능 제공
 * - 브라우저 ↔ 서버 간 양방향 통신 및 실시간 제어
 *
 * 🏗 아키텍처 패턴:
 * 1. Gateway Pattern: WebSocket 연결의 진입점
 * 2. Room-based Broadcasting: taskId별 그룹 통신
 * 3. Event-driven Architecture: 메시지 기반 비동기 처리
 * 4. Authentication: JWT 토큰 기반 연결 인증
 *
 * 💼 비즈니스 가치:
 * - 실시간 팀 협업: 여러 개발자가 동일한 빌드를 동시에 모니터링
 * - 양방향 제어: 클라이언트에서 실시간으로 필터 변경, 스트림 제어
 * - 알림 시스템: 빌드 실패/성공 시 즉시 알림
 * - 대화형 디버깅: 실시간으로 로그 레벨 조정, 키워드 검색
 *
 * 🔧 기술적 특징:
 * - Socket.IO: WebSocket + Polling Fallback
 * - Room 기반 브로드캐스트: 효율적인 메시지 배포
 * - 자동 재연결: 네트워크 장애 시 클라이언트 자동 복구
 * - 압축 지원: 대용량 로그 데이터 효율적 전송
 *!/
@WebSocketGateway({
  // 🌐 WebSocket 서버 설정
  port: 3001,
  namespace: '/log-streaming',

  // 🔗 CORS 설정: 다양한 프론트엔드 도메인에서 접근 허용
  cors: {
    origin: [
      'http://localhost:3000', // React 개발 서버
      'http://localhost:3001', // Next.js 개발 서버
      'https://!*.otto-ci.com', // 운영 도메인
    ],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Authorization'],
    credentials: true,
  },

  // ⚡ Socket.IO 최적화 설정
  transports: ['websocket', 'polling'],
  allowEIO3: true,

  // 📦 압축 설정: 로그 데이터 압축으로 대역폭 절약
  compression: true,

  // 🚫 최대 연결 수 제한으로 서버 리소스 보호
  maxHttpBufferSize: 1e6, // 1MB
  pingTimeout: 60000, // 60초
  pingInterval: 25000, // 25초
})
export class LogStreamingGateway
  implements
    ILogStreamingGateway,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect
{
  private readonly logger = new Logger(LogStreamingGateway.name);

  @WebSocketServer()
  server: Server;

  private formatError(err: unknown): { message: string; stack?: string } {
    if (err instanceof Error) return { message: err.message, stack: err.stack };
    try {
      return { message: JSON.stringify(err) };
    } catch {
      return { message: String(err) };
    }
  }

  /!**
   * 👥 클라이언트 세션 관리
   *
   * 🔧 기술적 구현:
   * - socketId → LogStreamSession 매핑
   * - 각 클라이언트별 구독 상태, 필터 설정 추적
   * - 메모리 기반 저장 (운영환경: Redis 권장)
   *!/
  private readonly clientSessions = new Map<
    string,
    {
      session: LogStreamSession;
      subscribedTasks: Set<string>;
      subscribedPipelines: Set<string>;
      userId?: string;
    }
  >();

  constructor(
    private readonly logStreamingService: LogStreamingService,
    private readonly jwtService: JwtService,
  ) {}

  /!**
   * 🚀 WebSocket 게이트웨이 초기화
   *
   * 💼 비즈니스 목적:
   * - 서버 시작 시 WebSocket 서버 준비 완료 로깅
   * - 연결 통계 초기화 및 모니터링 준비
   * - 필요시 외부 시스템과의 연동 초기화
   *!/
  afterInit(_server: Server) {
    this.logger.log('LogStreaming WebSocket 게이트웨이가 초기화되었습니다');
    this.logger.log(`WebSocket 서버가 포트 3001에서 실행 중입니다`);

    // 📊 서버 통계 정보 주기적 로깅 (개발환경에서만)
    if (process.env.NODE_ENV === 'development') {
      setInterval(() => {
        const connectedClients = this.server?.engine?.clientsCount || 0;
        this.logger.debug(`활성 WebSocket 연결: ${connectedClients}개`);
      }, 30000); // 30초마다
    }
  }

  /!**
   * 🤝 클라이언트 연결 이벤트 처리
   *
   * 💼 비즈니스 프로세스:
   * 1. 새로운 사용자가 실시간 로그 모니터링에 참여
   * 2. JWT 토큰을 통한 사용자 인증 및 권한 확인
   * 3. 사용자별 세션 초기화 및 환영 메시지 전송
   * 4. 연결 통계 업데이트 및 모니터링
   *
   * 🔧 기술적 구현:
   * - JWT 토큰 파싱 및 유효성 검사
   * - 클라이언트별 고유 세션 생성
   * - Socket.IO room 기반 그룹 관리 준비
   *!/
  async handleConnection(client: Socket, authToken?: string): Promise<void> {
    try {
      this.logger.log(`새 WebSocket 연결: ${client.id}`);

      // 🔐 JWT 인증 (선택적)
      let userId: string | undefined;
      const tokenCandidate =
        authToken ??
        (client.handshake.auth?.token as string | undefined) ??
        client.handshake.headers.authorization?.replace('Bearer ', '');
      const token =
        typeof tokenCandidate === 'string' ? tokenCandidate : undefined;

      if (token) {
        try {
          type JwtPayload = { sub?: string; userId?: string };
          const payload = this.jwtService.verify<JwtPayload>(token);
          userId = payload.sub ?? payload.userId;
          this.logger.debug(
            `인증된 사용자 연결: ${userId} (socket: ${client.id})`,
          );
        } catch (jwtError: unknown) {
          const { message } = this.formatError(jwtError);
          this.logger.warn(`JWT 인증 실패: ${message}, 비인증 사용자로 처리`);
          // 비인증 사용자도 허용 (읽기 전용 모니터링)
        }
      }

      // 👤 클라이언트 세션 생성
      const session = await this.logStreamingService.createSession();
      this.clientSessions.set(client.id, {
        session,
        subscribedTasks: new Set(),
        subscribedPipelines: new Set(),
        userId,
      });

      // 💬 환영 메시지 전송
      client.emit('connected', {
        sessionId: session.sessionId,
        message: '로그 스트리밍 서비스에 연결되었습니다',
        timestamp: new Date().toISOString(),
        features: [
          'real-time-logs', // 실시간 로그 스트리밍
          'pipeline-progress', // 파이프라인 진행 상황
          'log-filtering', // 로그 필터링
          'task-subscription', // 작업별 구독
        ],
      });

      this.logger.log(
        `클라이언트 세션 생성 완료: ${client.id} → ${session.sessionId}`,
      );
    } catch (error: unknown) {
      const { message, stack } = this.formatError(error);
      this.logger.error(`클라이언트 연결 처리 실패: ${message}`, stack);
      client.emit('connection_error', {
        message: '연결 처리 중 오류가 발생했습니다',
        details: message,
      });
      client.disconnect(true);
    }
  }

  /!**
   * 👋 클라이언트 연결 종료 이벤트 처리
   *
   * 💼 비즈니스 프로세스:
   * 1. 사용자가 브라우저를 닫거나 페이지를 벗어날 때 리소스 정리
   * 2. 구독 중이던 모든 로그 스트림에서 클라이언트 제거
   * 3. 서버 메모리에서 세션 정보 제거
   * 4. 연결 통계 업데이트
   *!/
  async handleDisconnect(client: Socket): Promise<void> {
    return this.handleDisconnection(client);
  }

  async handleDisconnection(client: Socket): Promise<void> {
    try {
      const clientSession = this.clientSessions.get(client.id);

      if (clientSession) {
        // 🧹 구독 중인 모든 room에서 제거
        clientSession.subscribedTasks.forEach((taskId) => {
          void client.leave(`task:${taskId}`);
        });

        clientSession.subscribedPipelines.forEach((pipelineId) => {
          void client.leave(`pipeline:${pipelineId}`);
        });

        // 🗑 세션 정리
        await this.logStreamingService.closeSession(
          clientSession.session.sessionId,
        );
        this.clientSessions.delete(client.id);

        this.logger.log(`클라이언트 연결 종료 및 정리 완료: ${client.id}`);
      } else {
        this.logger.warn(
          `연결 종료된 클라이언트의 세션을 찾을 수 없음: ${client.id}`,
        );
      }
    } catch (error: unknown) {
      const { message, stack } = this.formatError(error);
      this.logger.error(`클라이언트 연결 종료 처리 실패: ${message}`, stack);
    }
  }

  /!**
   * 📝 로그 구독 요청 처리
   *
   * 🌐 WebSocket 이벤트: 'subscribe-to-logs'
   *
   * 💼 비즈니스 프로세스:
   * 1. 클라이언트가 특정 CI/CD 작업의 로그 스트림을 요청
   * 2. 필터 조건에 따라 선별적 로그 수신 설정
   * 3. Socket.IO room에 참여하여 해당 작업의 모든 로그 수신
   * 4. 기존 구독이 있다면 업데이트
   *
   * 📨 클라이언트 사용 예시:
   * ```javascript
   * socket.emit('subscribe-to-logs', {
   *   taskId: 'task-123',
   *   filter: {
   *     levels: ['ERROR', 'WARN'],
   *     keywords: ['build', 'test']
   *   }
   * });
   * ```
   *!/
  @SubscribeMessage('subscribe-to-logs')
  async handleSubscribeToLogs(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      taskId: string;
      filter?: LogFilter;
    },
  ): Promise<void> {
    try {
      const { taskId, filter } = payload;

      // ✅ 입력 유효성 검사
      if (!taskId || taskId.trim().length === 0) {
        client.emit('subscription_error', {
          message: 'taskId는 필수 파라미터입니다',
          event: 'subscribe-to-logs',
        });
        return;
      }

      const clientSession = this.clientSessions.get(client.id);
      if (!clientSession) {
        client.emit('subscription_error', {
          message: '클라이언트 세션을 찾을 수 없습니다',
          event: 'subscribe-to-logs',
        });
        return;
      }

      this.logger.log(`로그 구독 요청: client=${client.id}, taskId=${taskId}`);

      // 🎛 세션 필터 업데이트
      if (filter) {
        await this.logStreamingService.updateSessionFilter(
          clientSession.session.sessionId,
          { ...filter, taskIds: [taskId] },
        );
      }

      // 🏠 task room에 참여
      const roomName = `task:${taskId}`;
      await client.join(roomName);
      clientSession.subscribedTasks.add(taskId);

      // ✅ 구독 성공 응답
      client.emit('subscription_success', {
        event: 'subscribe-to-logs',
        taskId,
        message: `작업 ${taskId}의 로그 구독이 시작되었습니다`,
        roomName,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(
        `로그 구독 완료: client=${client.id}, room=${roomName}`,
      );
    } catch (error: unknown) {
      const { message, stack } = this.formatError(error);
      this.logger.error(`로그 구독 처리 실패: ${message}`, stack);
      client.emit('subscription_error', {
        message: '로그 구독 처리 중 오류가 발생했습니다',
        details: message,
        event: 'subscribe-to-logs',
      });
    }
  }

  /!**
   * 🚫 로그 구독 해제 처리
   *
   * 🌐 WebSocket 이벤트: 'unsubscribe-from-logs'
   *
   * 💼 비즈니스 프로세스:
   * 1. 특정 작업의 로그 스트림 구독을 중단
   * 2. Socket.IO room에서 제거하여 더 이상 로그 수신하지 않음
   * 3. 불필요한 네트워크 트래픽 및 서버 리소스 절약
   * 4. 클라이언트 세션에서 구독 정보 제거
   *!/
  @SubscribeMessage('unsubscribe-from-logs')
  async handleUnsubscribeFromLogs(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      taskId: string;
    },
  ): Promise<void> {
    try {
      const { taskId } = payload;

      if (!taskId) {
        client.emit('unsubscription_error', {
          message: 'taskId는 필수 파라미터입니다',
          event: 'unsubscribe-from-logs',
        });
        return;
      }

      const clientSession = this.clientSessions.get(client.id);
      if (!clientSession) {
        client.emit('unsubscription_error', {
          message: '클라이언트 세션을 찾을 수 없습니다',
          event: 'unsubscribe-from-logs',
        });
        return;
      }

      this.logger.log(
        `로그 구독 해제 요청: client=${client.id}, taskId=${taskId}`,
      );

      // 🏠 task room에서 제거
      const roomName = `task:${taskId}`;
      await client.leave(roomName);
      clientSession.subscribedTasks.delete(taskId);

      // ✅ 구독 해제 성공 응답
      client.emit('unsubscription_success', {
        event: 'unsubscribe-from-logs',
        taskId,
        message: `작업 ${taskId}의 로그 구독이 해제되었습니다`,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(
        `로그 구독 해제 완료: client=${client.id}, room=${roomName}`,
      );
    } catch (error: unknown) {
      const { message, stack } = this.formatError(error);
      this.logger.error(`로그 구독 해제 처리 실패: ${message}`, stack);
      client.emit('unsubscription_error', {
        message: '로그 구독 해제 처리 중 오류가 발생했습니다',
        details: message,
        event: 'unsubscribe-from-logs',
      });
    }
  }

  /!**
   * 🎛 실시간 필터 업데이트 처리
   *
   * 🌐 WebSocket 이벤트: 'update-log-filter'
   *
   * 💼 비즈니스 프로세스:
   * 1. 사용자가 실시간으로 로그 필터 조건을 변경
   * 2. 로그 레벨, 키워드, Worker ID 등을 동적으로 수정
   * 3. 기존 구독을 유지하면서 새로운 필터만 적용
   * 4. 변경된 필터로 향후 로그부터 영향
   *!/
  @SubscribeMessage('update-log-filter')
  async handleUpdateLogFilter(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      taskId: string;
      filter: LogFilter;
    },
  ): Promise<void> {
    try {
      const { taskId, filter } = payload;

      const clientSession = this.clientSessions.get(client.id);
      if (!clientSession) {
        client.emit('filter_update_error', {
          message: '클라이언트 세션을 찾을 수 없습니다',
          event: 'update-log-filter',
        });
        return;
      }

      this.logger.log(
        `로그 필터 업데이트 요청: client=${client.id}, taskId=${taskId}`,
      );

      // 🎯 필터 업데이트
      await this.logStreamingService.updateSessionFilter(
        clientSession.session.sessionId,
        { ...filter, taskIds: [taskId] },
      );

      // ✅ 필터 업데이트 성공 응답
      client.emit('filter_update_success', {
        event: 'update-log-filter',
        taskId,
        filter,
        message: '로그 필터가 업데이트되었습니다',
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(
        `로그 필터 업데이트 완료: client=${client.id}, taskId=${taskId}`,
      );
    } catch (error: unknown) {
      const { message, stack } = this.formatError(error);
      this.logger.error(`로그 필터 업데이트 실패: ${message}`, stack);
      client.emit('filter_update_error', {
        message: '로그 필터 업데이트 중 오류가 발생했습니다',
        details: message,
        event: 'update-log-filter',
      });
    }
  }

  /!**
   * 📡 실시간 로그 브로드캐스트
   *
   * 💼 비즈니스 프로세스:
   * 1. 새로운 로그가 도착했을 때 구독 중인 모든 클라이언트에게 전송
   * 2. Room 기반 브로드캐스트: taskId별로 그룹핑된 클라이언트만 수신
   * 3. 팀 단위 협업: 여러 개발자가 동일한 빌드를 동시에 모니터링
   * 4. 클라이언트별 필터 적용: 각자의 관심사에 맞는 로그만 수신
   *
   * 🔧 기술적 구현:
   * - Socket.IO to().emit() 을 통한 room 브로드캐스트
   * - 비동기 처리로 성능 최적화
   * - 에러 발생 시에도 다른 클라이언트에게 영향 없음
   *!/
  broadcastLog(taskId: string, logEntry: WorkerLogEntry): void {
    try {
      const roomName = `task:${taskId}`;

      // 📡 해당 task를 구독하는 모든 클라이언트에게 브로드캐스트
      this.server.to(roomName).emit('log-entry', {
        taskId,
        workerId: logEntry.workerId,
        timestamp: logEntry.timestamp,
        level: logEntry.level,
        source: logEntry.source,
        message: logEntry.message,
        metadata: logEntry.metadata,
        podMetadata: logEntry.podMetadata,
      });

      // 🐛 디버그 모드에서 브로드캐스트 통계 로깅
      if (process.env.NODE_ENV === 'development') {
        const roomSize =
          this.server.sockets.adapter.rooms.get(roomName)?.size || 0;
        this.logger.debug(
          `로그 브로드캐스트: room=${roomName}, clients=${roomSize}, level=${logEntry.level}`,
        );
      }
    } catch (error: unknown) {
      const { message, stack } = this.formatError(error);
      this.logger.error(
        `로그 브로드캐스트 실패: taskId=${taskId}, error=${message}`,
        stack,
      );
    }
  }

  /!**
   * 📊 파이프라인 상태 브로드캐스트
   *
   * 💼 비즈니스 프로세스:
   * 1. 파이프라인 진행 상황 변화를 모든 관련 사용자에게 실시간 알림
   * 2. 프로젝트 관리자, 개발팀이 빌드 상태를 실시간으로 공유
   * 3. 각 스테이지별 완료 상태, 진행률, 에러 정보 전파
   * 4. 대시보드 UI의 실시간 업데이트 지원
   *!/
  broadcastPipelineProgress(
    pipelineId: string,
    progress: PipelineProgress,
  ): void {
    try {
      const roomName = `pipeline:${pipelineId}`;

      // 📊 파이프라인을 구독하는 모든 클라이언트에게 진행 상황 브로드캐스트
      this.server.to(roomName).emit('pipeline-progress', {
        pipelineId: progress.pipelineId,
        stageId: progress.stageId,
        status: progress.status,
        message: progress.message,
        progressPercentage: progress.progressPercentage,
        timestamp: progress.timestamp,
        startedAt: progress.startedAt,
        completedAt: progress.completedAt,
        workerPodNames: progress.workerPodNames,
        errorMessage: progress.errorMessage,
        metrics: progress.metrics,
      });

      // 📝 중요한 상태 변화는 별도 로깅
      if (
        ['STAGE_COMPLETED', 'STAGE_FAILED', 'STAGE_CANCELLED'].includes(
          progress.status.toString(),
        )
      ) {
        this.logger.log(
          `파이프라인 상태 변화 브로드캐스트: ${pipelineId} → ${progress.status} (Stage: ${progress.stageId})`,
        );
      }
    } catch (error: unknown) {
      const { message, stack } = this.formatError(error);
      this.logger.error(
        `파이프라인 진행 상황 브로드캐스트 실패: pipelineId=${pipelineId}, error=${message}`,
        stack,
      );
    }
  }

  /!**
   * 📊 파이프라인 구독 요청 처리
   *
   * 🌐 WebSocket 이벤트: 'subscribe-to-pipeline'
   *
   * 💼 비즈니스 프로세스:
   * - 클라이언트가 특정 파이프라인의 진행 상황을 구독
   * - 대시보드에서 여러 파이프라인을 동시에 모니터링
   * - 파이프라인 완료 시까지 실시간 상태 업데이트 수신
   *!/
  @SubscribeMessage('subscribe-to-pipeline')
  async handleSubscribeToPipeline(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      pipelineId: string;
    },
  ): Promise<void> {
    try {
      const { pipelineId } = payload;

      if (!pipelineId) {
        client.emit('subscription_error', {
          message: 'pipelineId는 필수 파라미터입니다',
          event: 'subscribe-to-pipeline',
        });
        return;
      }

      const clientSession = this.clientSessions.get(client.id);
      if (!clientSession) {
        client.emit('subscription_error', {
          message: '클라이언트 세션을 찾을 수 없습니다',
          event: 'subscribe-to-pipeline',
        });
        return;
      }

      this.logger.log(
        `파이프라인 구독 요청: client=${client.id}, pipelineId=${pipelineId}`,
      );

      // 🏠 pipeline room에 참여
      const roomName = `pipeline:${pipelineId}`;
      await client.join(roomName);
      clientSession.subscribedPipelines.add(pipelineId);

      // ✅ 구독 성공 응답
      client.emit('subscription_success', {
        event: 'subscribe-to-pipeline',
        pipelineId,
        message: `파이프라인 ${pipelineId}의 진행 상황 구독이 시작되었습니다`,
        roomName,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const { message, stack } = this.formatError(error);
      this.logger.error(`파이프라인 구독 처리 실패: ${message}`, stack);
      client.emit('subscription_error', {
        message: '파이프라인 구독 처리 중 오류가 발생했습니다',
        details: message,
        event: 'subscribe-to-pipeline',
      });
    }
  }

  /!**
   * 📊 실시간 서버 통계 정보 제공
   *
   * 🌐 WebSocket 이벤트: 'get-server-stats'
   *
   * 💼 비즈니스 목적:
   * - 관리자가 서버 상태를 실시간으로 모니터링
   * - 현재 연결 수, 활성 구독 수 등 운영 지표 제공
   * - 성능 튜닝 및 용량 계획을 위한 데이터 수집
   *!/
  @SubscribeMessage('get-server-stats')
  async handleGetServerStats(@ConnectedSocket() client: Socket): Promise<void> {
    try {
      const metrics = await this.logStreamingService.getMetrics();
      const connectedClients = this.server?.engine?.clientsCount || 0;

      const stats = {
        connectedClients,
        activeConnections: metrics.activeConnections,
        messagesPerSecond: metrics.messagesPerSecond,
        averageLatency: metrics.averageLatency,
        memoryUsage: metrics.memoryUsage,
        timestamp: new Date().toISOString(),
      };

      client.emit('server-stats', stats);

      this.logger.debug(`서버 통계 정보 전송: client=${client.id}`);
    } catch (error: unknown) {
      const { message, stack } = this.formatError(error);
      this.logger.error(`서버 통계 정보 조회 실패: ${message}`, stack);
      client.emit('stats_error', {
        message: '서버 통계 정보 조회 중 오류가 발생했습니다',
        details: message,
      });
    }
  }
}
*/
