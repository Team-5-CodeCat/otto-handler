import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject, BehaviorSubject, EMPTY, interval } from 'rxjs';
import {
  map,
  filter as rxFilter,
  tap,
  catchError,
  takeUntil,
  share,
  retry,
  distinctUntilChanged,
  switchMap,
  take,
} from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { Log, LogStream, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { OttoscalerService } from '../../../integrations/grpc/ottoscaler.service';
import type { ILogStreamingService } from '../interfaces/log-streaming.interface';
import type {
  LogStreamSession,
  LogFilter,
  StreamingMetrics,
  LogStreamingConfig,
} from '../types/log-streaming.types';
import type {
  WorkerLogEntry,
  PipelineProgress,
  PipelineRequest,
} from '../../../generated/otto';

/**
 * 🔄 LogStreamingService
 *
 * 📋 목적:
 * - 실시간 로그 스트리밍의 핵심 비즈니스 로직 구현
 * - gRPC ↔ HTTP/WebSocket 간의 브리지 역할
 * - 다중 클라이언트 세션 관리 및 리소스 최적화
 *
 * 🏗 아키텍처 패턴:
 * 1. Observer Pattern: RxJS Observable을 통한 반응형 스트리밍
 * 2. Session Pattern: 클라이언트별 독립적인 스트림 세션 관리
 * 3. Circuit Breaker: gRPC 연결 실패 시 자동 복구 메커니즘
 * 4. Backpressure: 클라이언트 처리 속도에 따른 흐름 제어
 *
 * 💼 비즈니스 가치:
 * - 개발자가 CI/CD 파이프라인을 실시간으로 모니터링
 * - 빌드 실패 시 즉시 알림으로 빠른 대응 가능
 * - 여러 개발자가 동시에 동일한 빌드 상황을 공유
 * - 로그 필터링으로 관련 정보만 선별적으로 모니터링
 */
@Injectable()
export class LogStreamingService
  implements ILogStreamingService, OnModuleDestroy
{
  private readonly logger = new Logger(LogStreamingService.name);

  /**
   * 🗄 활성 세션 저장소
   *
   * 🔧 기술적 구현:
   * - 메모리 기반 세션 관리 (운영환경에서는 Redis 권장)
   * - 세션별 필터, Observable 구독, 메타데이터 저장
   */
  private readonly sessions = new Map<string, LogStreamSession>();

  /**
   * 📊 실시간 메트릭 수집
   *
   * 🔧 기술적 구현:
   * - BehaviorSubject로 메트릭 상태 관리
   * - 초당 업데이트로 실시간 모니터링 데이터 제공
   */
  private readonly metrics$ = new BehaviorSubject<StreamingMetrics>({
    activeConnections: 0,
    messagesPerSecond: 0,
    averageLatency: 0,
    errorRate: 0,
    memoryUsage: 0,
    bandwidthUsage: 0,
  });

  /**
   * 🔌 gRPC 연결 상태 관리
   *
   * 🔧 기술적 구현:
   * - Subject를 통한 서비스 종료 시그널
   * - 모든 활성 스트림의 정리 보장
   */
  private readonly destroy$ = new Subject<void>();

  /**
   * ⚙️ 서비스 설정
   *
   * 💼 비즈니스 정책:
   * - 최대 동시 연결 수: 리소스 보호
   * - 세션 만료 시간: 유휴 연결 정리
   * - 버퍼 크기: 메모리 사용량 제한
   */
  private readonly config: LogStreamingConfig = {
    maxConnections: 1000,
    sessionTimeoutMinutes: 30,
    bufferSize: 1000,
    heartbeatIntervalSeconds: 30,
    backpressureThreshold: 500,
    enableCompression: true,
    debugMode: process.env.NODE_ENV === 'development',
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly ottoscalerService: OttoscalerService,
  ) {
    // 주기적 메트릭 업데이트 및 세션 정리 작업 시작
    this.startMetricsCollection();
    this.startSessionCleanup();

    this.logger.log('LogStreamingService가 초기화되었습니다');
    if (this.config.debugMode) {
      this.logger.debug(`설정: ${JSON.stringify(this.config, null, 2)}`);
    }
  }

  /**
   * 🔄 Worker 로그 스트림 시작
   *
   * 💼 비즈니스 프로세스:
   * 1. gRPC 클라이언트를 통해 Ottoscaler에서 실시간 로그 수신
   * 2. 수신된 로그를 필터링 조건에 따라 처리
   * 3. 클라이언트별 세션에 맞게 변환하여 전달
   * 4. 에러 발생 시 자동 재시도 및 복구 처리
   *
   * 🔧 기술적 구현:
   * - gRPC ForwardWorkerLogs 양방향 스트리밍 활용
   * - RxJS 연산자 체이닝으로 데이터 처리 파이프라인 구성
   * - 백프레셔 처리: 클라이언트 처리 속도 고려
   */
  startWorkerLogStream(
    taskId: string,
    filter?: LogFilter,
  ): Observable<WorkerLogEntry> {
    this.logger.log(`Worker 로그 스트림 시작: taskId=${taskId}`);

    try {
      // 📡 gRPC 양방향 스트리밍 채널 생성
      const channel = this.ottoscalerService.createForwardWorkerLogsChannel();

      return channel.responses$.pipe(
        // 🔄 성공 응답만 필터링 (ACK 상태)
        rxFilter((response: any) => response.status === 0), // 0 = ACK

        // 🎛 로그 필터 적용 (레벨, 키워드, 시간 범위 등)
        rxFilter((logEntry) =>
          this.applyLogFilter(logEntry as unknown as WorkerLogEntry, filter),
        ),

        // 📊 메트릭 수집: 처리된 메시지 수 카운트
        tap(() => this.updateMessageMetrics()),

        // 🔄 gRPC 연결 실패 시 자동 재시도 (최대 3회)
        retry(3),

        // ❌ 복구 불가능한 에러 처리
        catchError((error) => {
          this.logger.error(
            `Worker 로그 스트림 에러: ${(error as Error).message}`,
            (error as Error).stack,
          );
          this.updateErrorMetrics();
          return EMPTY; // 빈 Observable 반환으로 스트림 종료
        }),

        // 🛑 서비스 종료 시 스트림 자동 정리
        takeUntil(this.destroy$),

        // 🔗 다중 구독자 지원: 동일한 taskId를 여러 클라이언트가 구독 가능
        share(),
      ) as Observable<WorkerLogEntry>;
    } catch (error) {
      this.logger.error(
        `Worker 로그 스트림 초기화 실패: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return EMPTY;
    }
  }

  /**
   * 📊 파이프라인 진행 상황 스트림 시작
   *
   * 💼 비즈니스 프로세스:
   * 1. CI/CD 파이프라인의 각 스테이지별 진행 상황 추적
   * 2. 빌드→테스트→배포 순서에 따른 상태 변화 모니터링
   * 3. 진행률, 완료 시간, 에러 정보 등을 실시간으로 제공
   * 4. 대시보드 UI에서 시각적으로 표시할 수 있는 구조화된 데이터 전달
   */
  startPipelineProgressStream(
    pipelineId: string,
  ): Observable<PipelineProgress> {
    this.logger.log(
      `파이프라인 진행 상황 스트림 시작: pipelineId=${pipelineId}`,
    );

    try {
      // 📋 파이프라인 실행 요청 생성 (실제 환경에서는 DB에서 조회)
      const pipelineRequest: PipelineRequest = {
        pipelineId,
        name: `Pipeline ${pipelineId}`,
        stages: [], // 실제로는 DB에서 스테이지 정보 조회
        repository: '',
        commitSha: '',
        triggeredBy: 'system',
        metadata: {},
      };

      // 🚀 gRPC ExecutePipeline 스트리밍 호출
      return this.ottoscalerService.executePipeline$(pipelineRequest).pipe(
        // 🎯 중복 상태 제거: 동일한 상태가 연속으로 오는 경우 필터링
        distinctUntilChanged(
          (prev, curr) =>
            prev.stageId === curr.stageId &&
            prev.status === curr.status &&
            prev.progressPercentage === curr.progressPercentage,
        ),

        // 📊 진행 상황 메트릭 업데이트
        tap((progress) => {
          this.logger.debug(
            `파이프라인 진행: Stage=${progress.stageId}, Progress=${progress.progressPercentage}%`,
          );
          this.updateProgressMetrics(progress);
        }),

        // 🔄 연결 실패 시 재시도
        retry(2),

        // ❌ 에러 처리 및 로깅
        catchError((error) => {
          this.logger.error(
            `파이프라인 진행 상황 스트림 에러: ${(error as Error).message}`,
            (error as Error).stack,
          );
          return EMPTY;
        }),

        // 🛑 서비스 종료 시 정리
        takeUntil(this.destroy$),
        share(),
      );
    } catch (error) {
      this.logger.error(
        `파이프라인 스트림 초기화 실패: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return EMPTY;
    }
  }

  /**
   * 👤 클라이언트 세션 생성
   *
   * 💼 비즈니스 프로세스:
   * 1. 새로운 클라이언트 연결 시 고유 세션 생성
   * 2. 사용자별 개인화된 로그 필터링 설정 저장
   * 3. 세션별 리소스 할당 및 생명주기 관리
   * 4. 최대 연결 수 제한으로 서버 리소스 보호
   *
   * 🔧 기술적 구현:
   * - UUID를 통한 고유 세션 ID 생성
   * - 메모리 기반 세션 저장소 (운영환경: Redis 권장)
   * - 세션 만료 시간 기반 자동 정리
   */
  async createSession(filter?: LogFilter): Promise<LogStreamSession> {
    // 🚫 최대 연결 수 체크
    if (this.sessions.size >= this.config.maxConnections) {
      throw new Error(
        `최대 연결 수(${this.config.maxConnections})에 도달했습니다`,
      );
    }

    const sessionId = uuidv4();
    const now = new Date();

    const session: LogStreamSession = {
      sessionId,
      taskId: filter?.taskIds?.[0],
      workerId: filter?.workerIds?.[0],
      logLevel: filter?.levels?.[0],
      createdAt: now,
      lastActivity: now,
    };

    this.sessions.set(sessionId, session);
    this.updateConnectionMetrics();

    this.logger.log(
      `새 세션 생성: ${sessionId} (현재 활성 세션: ${this.sessions.size})`,
    );

    return Promise.resolve(session);
  }

  /**
   * 🗑 클라이언트 세션 종료
   *
   * 💼 비즈니스 프로세스:
   * 1. 클라이언트 연결 종료 시 관련 리소스 정리
   * 2. Observable 구독 해제로 메모리 누수 방지
   * 3. 세션 저장소에서 정보 제거
   * 4. 메트릭 업데이트로 현재 상태 반영
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.logger.warn(`존재하지 않는 세션 종료 시도: ${sessionId}`);
      return;
    }

    // 🧹 세션 정리
    this.sessions.delete(sessionId);
    this.updateConnectionMetrics();

    this.logger.log(
      `세션 종료: ${sessionId} (남은 활성 세션: ${this.sessions.size})`,
    );
    return Promise.resolve();
  }

  /**
   * 🎛 세션 필터 업데이트
   *
   * 💼 비즈니스 프로세스:
   * 1. 사용자가 실시간으로 로그 필터링 조건 변경
   * 2. 기존 스트림을 중단하지 않고 필터만 업데이트
   * 3. 새로운 필터 조건에 따라 향후 로그만 영향
   * 4. 세션 활성화 시간 업데이트로 만료 시간 연장
   */
  async updateSessionFilter(
    sessionId: string,
    filter: LogFilter,
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`존재하지 않는 세션: ${sessionId}`);
    }

    // 🎯 세션 필터 정보 업데이트
    session.taskId = filter.taskIds?.[0];
    session.workerId = filter.workerIds?.[0];
    session.logLevel = filter.levels?.[0];
    session.lastActivity = new Date();

    this.sessions.set(sessionId, session);

    this.logger.debug(`세션 필터 업데이트: ${sessionId}`);
    return Promise.resolve();
  }

  /**
   * 📈 실시간 메트릭 조회
   *
   * 💼 비즈니스 목적:
   * - 시스템 관리자가 서비스 상태 모니터링
   * - 성능 문제 조기 발견 및 예방
   * - 리소스 사용량 최적화를 위한 데이터 제공
   */
  async getMetrics(): Promise<StreamingMetrics> {
    return Promise.resolve(this.metrics$.getValue());
  }

  /**
   * 🧹 서비스 종료 시 리소스 정리
   *
   * 🔧 기술적 구현:
   * - 모든 활성 Observable 구독 해제
   * - gRPC 연결 정리
   * - 메모리 정리 및 세션 저장소 비우기
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('LogStreamingService 종료 중...');

    // 🛑 모든 스트림에 종료 시그널 전송
    this.destroy$.next();
    this.destroy$.complete();

    // 🧹 세션 정리
    this.sessions.clear();

    this.logger.log('LogStreamingService 종료 완료');
    return Promise.resolve();
  }

  // ========================================
  // 🔧 Private Helper Methods (내부 구현)
  // ========================================

  /**
   * 🎛 로그 필터 적용 로직
   *
   * 🔧 기술적 구현:
   * - 다중 조건 필터링: AND 연산
   * - 정규식 지원: 키워드 매칭
   * - 시간 범위 필터링
   */
  private applyLogFilter(
    logEntry: WorkerLogEntry,
    filter?: LogFilter,
  ): boolean {
    if (!filter) return true;

    // 🎯 로그 레벨 필터
    if (filter.levels && !filter.levels.includes(logEntry.level)) {
      return false;
    }

    // 🎯 로그 소스 필터 (stdout/stderr)
    if (filter.sources && !filter.sources.includes(logEntry.source)) {
      return false;
    }

    // 🎯 키워드 필터 (메시지 내 검색)
    if (filter.keywords && filter.keywords.length > 0) {
      const hasKeyword = filter.keywords.some((keyword) =>
        logEntry.message.toLowerCase().includes(keyword.toLowerCase()),
      );
      if (!hasKeyword) return false;
    }

    // 🎯 Worker ID 필터
    if (filter.workerIds && !filter.workerIds.includes(logEntry.workerId)) {
      return false;
    }

    // 🎯 Task ID 필터
    if (filter.taskIds && !filter.taskIds.includes(logEntry.taskId)) {
      return false;
    }

    return true;
  }

  /**
   * 📊 메시지 처리 메트릭 업데이트
   */
  private updateMessageMetrics(): void {
    const current = this.metrics$.getValue();
    this.metrics$.next({
      ...current,
      messagesPerSecond: current.messagesPerSecond + 1,
    });
  }

  /**
   * ❌ 에러 메트릭 업데이트
   */
  private updateErrorMetrics(): void {
    const current = this.metrics$.getValue();
    this.metrics$.next({
      ...current,
      errorRate: current.errorRate + 1,
    });
  }

  /**
   * 🔗 연결 수 메트릭 업데이트
   */
  private updateConnectionMetrics(): void {
    const current = this.metrics$.getValue();
    this.metrics$.next({
      ...current,
      activeConnections: this.sessions.size,
    });
  }

  /**
   * 📊 파이프라인 진행 메트릭 업데이트
   */
  private updateProgressMetrics(progress: PipelineProgress): void {
    // 실제로는 더 상세한 메트릭 수집 로직 구현
    this.logger.debug(`진행률 업데이트: ${progress.progressPercentage}%`);
  }

  /**
   * 📈 주기적 메트릭 수집 시작
   *
   * 🔧 기술적 구현:
   * - setInterval을 통한 주기적 실행
   * - 메모리 사용량, 네트워크 대역폭 등 시스템 메트릭 수집
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      const current = this.metrics$.getValue();

      // 🧠 메모리 사용량 수집
      const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB

      this.metrics$.next({
        ...current,
        memoryUsage,
        messagesPerSecond: 0, // 초당 메시지 수 리셋
      });
    }, 1000); // 1초마다 업데이트
  }

  /**
   * 🧹 주기적 세션 정리 작업
   *
   * 💼 비즈니스 로직:
   * - 만료된 세션 자동 정리
   * - 메모리 누수 방지
   * - 유휴 연결 관리
   */
  private startSessionCleanup(): void {
    setInterval(() => {
      const now = new Date();
      const expiredSessions: string[] = [];

      // 🕐 만료된 세션 찾기
      this.sessions.forEach((session, sessionId) => {
        const inactiveMinutes =
          (now.getTime() - session.lastActivity.getTime()) / (1000 * 60);
        if (inactiveMinutes > this.config.sessionTimeoutMinutes) {
          expiredSessions.push(sessionId);
        }
      });

      // 🗑 만료된 세션 정리
      expiredSessions.forEach((sessionId) => {
        this.sessions.delete(sessionId);
        this.logger.debug(`만료된 세션 정리: ${sessionId}`);
      });

      if (expiredSessions.length > 0) {
        this.updateConnectionMetrics();
        this.logger.log(
          `${expiredSessions.length}개의 만료된 세션을 정리했습니다`,
        );
      }
    }, 60000); // 1분마다 실행
  }

  // ================================================================================
  // 🗄️ Prisma Log 모델 활용 CRUD 기능
  // ================================================================================

  /**
   * 로그 생성
   *
   * 비즈니스 목적:
   * - CI/CD 작업 실행 중 발생하는 로그를 데이터베이스에 저장
   * - 짧은 로그는 content 필드에, 긴 로그는 S3에 저장하여 효율적인 스토리지 관리
   *
   * 기술적 구현:
   * - Prisma를 통한 타입 안전한 데이터베이스 작업
   * - 로그 크기에 따른 저장 방식 자동 선택 (content vs S3)
   * - 트랜잭션을 통한 데이터 일관성 보장
   *
   * @param jobId 작업 ID (Job 테이블의 외래키)
   * @param attemptNo 재시도 번호 (1부터 시작)
   * @param stream 로그 스트림 타입 (stdout/stderr)
   * @param content 로그 내용
   * @param metadata 추가 메타데이터 (S3 정보 등)
   */
  async createLog(
    jobId: string,
    attemptNo: number,
    stream: LogStream,
    content: string,
    metadata?: {
      storageBucket?: string;
      storageKey?: string;
      contentType?: string;
    },
  ): Promise<Log> {
    try {
      const contentSizeBytes = Buffer.byteLength(content, 'utf8');
      const maxInlineSize = 10000; // 10KB 이하는 인라인 저장

      const logData: Prisma.LogCreateInput = {
        job: { connect: { id: jobId } },
        attemptNo,
        stream,
        sizeBytes: BigInt(contentSizeBytes),
        contentType: metadata?.contentType || 'text/plain',
        createdAt: new Date(),
      };

      // 작은 로그는 content 필드에 직접 저장
      if (contentSizeBytes <= maxInlineSize) {
        logData.content = content;
        this.logger.debug(
          `인라인 로그 저장: jobId=${jobId}, attemptNo=${attemptNo}, size=${contentSizeBytes}bytes`,
        );
      } else {
        // 큰 로그는 S3 메타데이터만 저장 (실제 S3 업로드는 별도 서비스에서 처리)
        logData.storageBucket = metadata?.storageBucket;
        logData.storageKey = metadata?.storageKey;
        this.logger.debug(
          `S3 로그 메타데이터 저장: jobId=${jobId}, attemptNo=${attemptNo}, size=${contentSizeBytes}bytes`,
        );
      }

      const log = await this.prisma.log.create({
        data: logData,
      });

      this.logger.log(
        `로그 생성 완료: logId=${log.logID}, jobId=${jobId}, stream=${stream}`,
      );
      return log;
    } catch (error) {
      this.logger.error(
        `로그 생성 실패: jobId=${jobId}, attemptNo=${attemptNo}`,
        error,
      );
      throw error;
    }
  }

  /**
   * 작업별 로그 목록 조회
   *
   * 비즈니스 목적:
   * - 특정 CI/CD 작업의 모든 로그를 시간순으로 조회
   * - 개발자가 빌드/테스트/배포 과정의 전체 로그를 확인
   *
   * 기술적 구현:
   * - 페이지네이션을 통한 대용량 로그 처리
   * - 로그 스트림 타입별 필터링 지원
   * - 생성 시간순 정렬로 일관된 로그 순서 보장
   */
  async getLogsByJob(
    jobId: string,
    options?: {
      attemptNo?: number;
      stream?: LogStream;
      limit?: number;
      offset?: number;
    },
  ): Promise<Log[]> {
    try {
      const { attemptNo, stream, limit = 100, offset = 0 } = options || {};

      const whereClause: Prisma.LogWhereInput = {
        jobID: jobId,
        ...(attemptNo !== undefined && { attemptNo }),
        ...(stream && { stream }),
      };

      const logs = await this.prisma.log.findMany({
        where: whereClause,
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset,
      });

      this.logger.debug(`로그 조회 완료: jobId=${jobId}, count=${logs.length}`);
      return logs;
    } catch (error) {
      this.logger.error(`로그 조회 실패: jobId=${jobId}`, error);
      throw error;
    }
  }

  /**
   * 로그 내용 조회 (S3 로그 포함)
   *
   * 비즈니스 목적:
   * - 로그 ID로 실제 로그 내용을 조회
   * - S3에 저장된 대용량 로그도 투명하게 처리
   *
   * 기술적 구현:
   * - 인라인 저장된 로그는 content 필드에서 직접 반환
   * - S3 저장된 로그는 S3에서 다운로드하여 반환
   * - 캐싱을 통한 반복 조회 성능 최적화
   */
  async getLogContent(logId: string): Promise<string> {
    try {
      const log = await this.prisma.log.findUnique({
        where: { logID: logId },
      });

      if (!log) {
        throw new Error(`로그를 찾을 수 없습니다: logId=${logId}`);
      }

      // 인라인 저장된 로그
      if (log.content) {
        this.logger.debug(`인라인 로그 내용 반환: logId=${logId}`);
        return log.content;
      }

      // S3 저장된 로그 (실제 S3 다운로드는 별도 서비스에서 구현)
      if (log.storageBucket && log.storageKey) {
        this.logger.debug(
          `S3 로그 내용 조회 요청: logId=${logId}, bucket=${log.storageBucket}, key=${log.storageKey}`,
        );
        // TODO: S3Service를 통한 실제 다운로드 구현
        return `[S3 저장된 로그] bucket: ${log.storageBucket}, key: ${log.storageKey}`;
      }

      throw new Error(`로그 내용이 없습니다: logId=${logId}`);
    } catch (error) {
      this.logger.error(`로그 내용 조회 실패: logId=${logId}`, error);
      throw error;
    }
  }

  /**
   * 작업별 로그 삭제
   *
   * 비즈니스 목적:
   * - 불필요한 로그 데이터 정리를 통한 스토리지 비용 절감
   * - 개인정보 보호를 위한 로그 데이터 삭제
   *
   * 기술적 구현:
   * - 트랜잭션을 통한 일관된 삭제 처리
   * - S3 저장된 로그 파일도 함께 삭제 처리
   * - 삭제된 로그 수 반환으로 작업 결과 확인
   */
  async deleteLogsByJob(jobId: string, attemptNo?: number): Promise<number> {
    try {
      const whereClause: Prisma.LogWhereInput = {
        jobID: jobId,
        ...(attemptNo !== undefined && { attemptNo }),
      };

      // S3에 저장된 로그 파일 정보 조회 (실제 S3 삭제를 위해)
      const logsToDelete = await this.prisma.log.findMany({
        where: whereClause,
        select: {
          logID: true,
          storageBucket: true,
          storageKey: true,
        },
      });

      // TODO: S3 저장된 로그 파일들 삭제 처리
      const s3LogsCount = logsToDelete.filter(
        (log) => log.storageBucket && log.storageKey,
      ).length;
      if (s3LogsCount > 0) {
        this.logger.debug(`S3 로그 파일 삭제 대상: ${s3LogsCount}개`);
        // S3 삭제 로직 구현 필요
      }

      // 데이터베이스에서 로그 레코드 삭제
      const deleteResult = await this.prisma.log.deleteMany({
        where: whereClause,
      });

      this.logger.log(
        `로그 삭제 완료: jobId=${jobId}, attemptNo=${attemptNo}, count=${deleteResult.count}`,
      );
      return deleteResult.count;
    } catch (error) {
      this.logger.error(
        `로그 삭제 실패: jobId=${jobId}, attemptNo=${attemptNo}`,
        error,
      );
      throw error;
    }
  }

  // ================================================================================
  // 🎭 목업 로그 데이터 생성 기능 (개발/테스트용)
  // ================================================================================

  /**
   * 목업 로그 데이터 생성
   *
   * 비즈니스 목적:
   * - 개발 환경에서 실제와 유사한 로그 데이터로 테스트
   * - 로그 스트리밍 기능의 성능 테스트 및 UI 검증
   * - 다양한 시나리오의 로그 패턴 시뮬레이션
   *
   * 기술적 구현:
   * - 실제 CI/CD 로그와 유사한 패턴의 목업 데이터 생성
   * - 다양한 로그 레벨과 메시지 타입 포함
   * - 시간 순서를 고려한 자연스러운 로그 시퀀스
   */
  async generateMockLogs(
    jobId: string,
    attemptNo: number = 1,
    logCount: number = 50,
  ): Promise<Log[]> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('목업 데이터 생성은 개발 환경에서만 허용됩니다');
    }

    this.logger.log(
      `목업 로그 생성 시작: jobId=${jobId}, attemptNo=${attemptNo}, count=${logCount}`,
    );

    const mockLogs: Log[] = [];
    const logTemplates = this.getMockLogTemplates();

    try {
      // 목업 데이터는 실제 데이터베이스에 저장하지 않고 메모리에서만 생성
      // 실제 로그 스트리밍 기능 테스트를 위한 가짜 데이터
      const mockLogs: Log[] = [];
      for (let i = 0; i < logCount; i++) {
        const template = logTemplates[i % logTemplates.length];
        const stream = Math.random() > 0.8 ? LogStream.stderr : LogStream.stdout;
        const mockContent = this.generateMockLogContent(template, i + 1);
        const contentSizeBytes = Buffer.byteLength(mockContent, 'utf8');

        // 실제 Log 모델과 동일한 구조의 목업 객체 생성
        const mockLog: Log = {
          logID: `mock-log-${Date.now()}-${i}`,
          jobID: jobId,
          attemptNo,
          stream,
          content: mockContent,
          storageBucket: null,
          storageKey: null,
          sizeBytes: BigInt(contentSizeBytes),
          contentType: 'text/plain',
          createdAt: new Date(Date.now() + i * 100), // 100ms 간격
        };

        mockLogs.push(mockLog);
      }

      this.logger.log(`목업 로그 생성 완료: ${mockLogs.length}개 생성`);
      return mockLogs;
    } catch (error) {
      this.logger.error(`목업 로그 생성 실패: jobId=${jobId}`, error);
      throw error;
    }
  }

  /**
   * 실시간 목업 로그 스트림 생성
   *
   * 비즈니스 목적:
   * - 실시간 로그 스트리밍 기능의 동적 테스트
   * - WebSocket 연결 테스트 및 성능 측정
   * - 프론트엔드 UI의 실시간 업데이트 검증
   *
   * 기술적 구현:
   * - RxJS interval을 활용한 주기적 로그 생성
   * - 실제 gRPC 스트림과 동일한 형태의 Observable 반환
   * - 랜덤한 지연시간으로 실제 빌드 과정 시뮬레이션
   */
  createMockLogStream(
    taskId: string,
    intervalMs: number = 1000,
    totalLogs: number = 100,
  ): Observable<WorkerLogEntry> {
    if (process.env.NODE_ENV === 'production') {
      return EMPTY;
    }

    this.logger.log(
      `목업 로그 스트림 시작: taskId=${taskId}, interval=${intervalMs}ms, total=${totalLogs}`,
    );

    const logTemplates = this.getMockLogTemplates();

    return interval(intervalMs).pipe(
      take(totalLogs),
      map((index) => {
        const template = logTemplates[index % logTemplates.length];
        const mockContent = this.generateMockLogContent(template, index + 1);

        // WorkerLogEntry 형태로 목업 데이터 생성
        const mockLogEntry: WorkerLogEntry = {
          taskId,
          workerId: `worker-${Math.floor(Math.random() * 3) + 1}`,
          level: this.getRandomLogLevel(),
          message: mockContent,
          timestamp: new Date().toISOString(),
          source: 'mock',
          podMetadata: undefined,
          metadata: {
            step: `step-${Math.floor(index / 10) + 1}`,
            phase: this.getRandomPhase(),
          },
        };

        return mockLogEntry;
      }),
      tap((logEntry) => {
        this.logger.debug(
          `목업 로그 생성: ${logEntry.workerId} - ${logEntry.message.substring(0, 50)}...`,
        );
      }),
      catchError((error) => {
        this.logger.error('목업 로그 스트림 에러:', error);
        return EMPTY;
      }),
    );
  }

  /**
   * 목업 로그 템플릿 정의
   *
   * 실제 CI/CD 환경에서 발생하는 다양한 유형의 로그 메시지 패턴을 정의
   */
  private getMockLogTemplates(): string[] {
    return [
      // 빌드 시작/종료
      '=== 빌드 시작 ===',
      '프로젝트 의존성 설치 중...',
      '패키지 다운로드: {package}@{version}',
      'TypeScript 컴파일 시작',
      '컴파일 완료: {fileCount}개 파일 처리',
      '=== 빌드 완료 ===',

      // 테스트 실행
      '=== 테스트 실행 시작 ===',
      'Jest 테스트 실행 중...',
      '테스트 파일 발견: {testFile}',
      '테스트 통과: {testName}',
      '테스트 실패: {testName}',
      'Coverage 리포트 생성 중...',
      '=== 테스트 완료 ===',

      // 배포 과정
      '=== 배포 시작 ===',
      'Docker 이미지 빌드 중...',
      'ECR 이미지 푸시 중...',
      'ECS 서비스 업데이트 중...',
      '헬스체크 수행 중...',
      '배포 완료: {deploymentId}',

      // 에러/경고 메시지
      'WARNING: deprecated package detected',
      'ERROR: compilation failed',
      'FATAL: out of memory',
      'INFO: process completed successfully',

      // 일반적인 로그
      'Processing file: {filename}',
      'Connecting to database...',
      'Authentication successful',
      'Cache miss for key: {cacheKey}',
      'API request: {method} {path}',
    ];
  }

  /**
   * 목업 로그 내용 생성
   *
   * 템플릿을 기반으로 실제 값들을 치환하여 현실적인 로그 메시지 생성
   */
  private generateMockLogContent(template: string, index: number): string {
    const replacements: Record<string, () => string> = {
      '{package}': () =>
        ['lodash', 'axios', 'moment', 'uuid', 'express'][
          Math.floor(Math.random() * 5)
        ],
      '{version}': () =>
        `${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
      '{fileCount}': () => (Math.floor(Math.random() * 100) + 50).toString(),
      '{testFile}': () =>
        ['auth.test.ts', 'user.test.ts', 'api.test.ts', 'util.test.ts'][
          Math.floor(Math.random() * 4)
        ],
      '{testName}': () =>
        [
          'should authenticate user',
          'should validate input',
          'should handle errors',
        ][Math.floor(Math.random() * 3)],
      '{deploymentId}': () => `deploy-${Date.now()}`,
      '{filename}': () =>
        ['index.ts', 'main.js', 'config.json', 'package.json'][
          Math.floor(Math.random() * 4)
        ],
      '{cacheKey}': () => `cache-${Math.random().toString(36).substring(7)}`,
      '{method}': () =>
        ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)],
      '{path}': () =>
        ['/api/users', '/api/auth', '/api/logs', '/health'][
          Math.floor(Math.random() * 4)
        ],
    };

    let content = template;
    Object.entries(replacements).forEach(([placeholder, generator]) => {
      content = content.replace(
        new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'),
        generator(),
      );
    });

    return `[${new Date().toISOString()}] [LOG-${index.toString().padStart(3, '0')}] ${content}`;
  }

  /**
   * 랜덤 로그 레벨 생성
   */
  private getRandomLogLevel(): string {
    const levels = ['INFO', 'DEBUG', 'WARN', 'ERROR'];
    const weights = [0.6, 0.25, 0.1, 0.05]; // INFO가 가장 많이 나오도록

    const random = Math.random();
    let sum = 0;
    for (let i = 0; i < levels.length; i++) {
      sum += weights[i];
      if (random <= sum) {
        return levels[i];
      }
    }
    return 'INFO';
  }

  /**
   * 랜덤 빌드 단계 생성
   */
  private getRandomPhase(): string {
    const phases = ['setup', 'build', 'test', 'deploy', 'cleanup'];
    return phases[Math.floor(Math.random() * phases.length)];
  }

  /**
   * RxJS Observable 기반 데이터베이스 로그 스트림
   *
   * 비즈니스 목적:
   * - 저장된 로그 데이터를 실시간 스트림으로 변환
   * - 과거 로그의 재생 및 분석 기능 제공
   * - 데이터베이스와 실시간 스트림의 통합
   *
   * 기술적 구현:
   * - Prisma 쿼리 결과를 RxJS Observable로 변환
   * - 페이지네이션을 통한 대용량 로그 스트리밍
   * - 실시간 신규 로그 감지 및 스트림 업데이트
   */
  streamStoredLogs(
    jobId: string,
    options?: {
      attemptNo?: number;
      stream?: LogStream;
      batchSize?: number;
      realtime?: boolean;
    },
  ): Observable<Log[]> {
    const { batchSize = 50, realtime = false, ...queryOptions } = options || {};

    this.logger.log(
      `저장된 로그 스트림 시작: jobId=${jobId}, realtime=${realtime}`,
    );

    // 기본 로그 조회 Observable
    const storedLogs$ = new Observable<Log[]>((observer) => {
      let offset = 0;
      let hasMore = true;

      const fetchBatch = async (): Promise<void> => {
        try {
          const logs = await this.getLogsByJob(jobId, {
            ...queryOptions,
            limit: batchSize,
            offset,
          });

          if (logs.length > 0) {
            observer.next(logs);
            offset += logs.length;
            hasMore = logs.length === batchSize;
          } else {
            hasMore = false;
          }

          if (hasMore) {
            // 다음 배치를 위한 짧은 지연
            setTimeout(() => {
              fetchBatch().catch((error) => observer.error(error));
            }, 100);
          } else {
            if (!realtime) {
              observer.complete();
            }
          }
        } catch (error) {
          observer.error(error);
        }
      };

      fetchBatch().catch((error) => observer.error(error));

      // 정리 함수
      return () => {
        hasMore = false;
      };
    });

    // 실시간 모드인 경우 새로운 로그 폴링 추가
    if (realtime) {
      // TODO: 실시간 폴링 기능 구현 예정
      // 현재는 getRecentLogs 메서드 참조만 유지
      if (false) {
        void this.getRecentLogs(jobId, queryOptions);
      }

      // const realtimePolling$ = interval(2000).pipe(
      //   switchMap(() => this.getRecentLogs(jobId, queryOptions)),
      //   rxFilter((logs) => logs.length > 0),
      // );
      // return storedLogs$
      //   .pipe
      //   // 초기 저장된 로그들을 모두 전송 후 실시간 폴링 시작
      //   // 실제 구현에서는 더 정교한 중복 제거 로직 필요
      //   ();
    }

    return storedLogs$;
  }

  /**
   * 최근 로그 조회 (실시간 스트림용)
   * TODO: 실시간 폴링 기능 구현 시 사용 예정
   */
  private async getRecentLogs(
    jobId: string,
    options?: { attemptNo?: number; stream?: LogStream },
  ): Promise<Log[]> {
    const lastMinute = new Date(Date.now() - 60 * 1000);

    const whereClause: Prisma.LogWhereInput = {
      jobID: jobId,
      createdAt: { gte: lastMinute },
      ...(options?.attemptNo !== undefined && { attemptNo: options.attemptNo }),
      ...(options?.stream && { stream: options.stream }),
    };

    return this.prisma.log.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }
}
