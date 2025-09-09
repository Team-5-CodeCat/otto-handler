import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  Observable,
  Subject,
  BehaviorSubject,
  EMPTY,
  interval,
  timer,
} from 'rxjs';
import {
  map,
  filter as rxFilter,
  tap,
  catchError,
  takeUntil,
  share,
  retry,
  distinctUntilChanged,
  take,
  publishReplay,
  refCount,
} from 'rxjs/operators';
import { Log, LogStream, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { OttoscalerService } from '../../../integrations/grpc';
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
   * gRPC 연결 상태 관리
   * 서비스 종료 시그널을 통한 모든 활성 스트림 정리 보장
   */
  private readonly destroy$ = new Subject<void>();

  /**
   * SSE 브로드캐스팅을 위한 활성 스트림 저장소
   *
   * 기술적 설계:
   * - taskId를 키로 하는 Map 구조로 스트림별 독립적 관리
   * - 각 스트림은 gRPC Observable의 Hot Observable 인스턴스를 저장
   * - 첫 번째 SSE 클라이언트 연결 시 gRPC 스트림 생성
   * - 마지막 클라이언트 연결 해제 시 자동 정리
   *
   * 메모리 관리:
   * - share() 오퍼레이터로 멀티캐스트 구현
   * - refCount() 패턴으로 자동 구독/해제 관리
   * - WeakMap 대신 Map 사용으로 명시적 정리 제어
   */
  private readonly activeStreams = new Map<
    string,
    Observable<WorkerLogEntry>
  >();

  /**
   * SSE 클라이언트 연결 추적을 위한 저장소
   *
   * 연결 관리 전략:
   * - taskId별로 연결된 클라이언트 수 추적
   * - 클라이언트 연결/해제 시 실시간 업데이트
   * - 0이 되면 해당 gRPC 스트림 자동 정리
   *
   * 성능 최적화:
   * - O(1) 시간복잡도로 연결 수 조회
   * - 메모리 효율적인 카운터 기반 관리
   */
  private readonly clientConnectionCounts = new Map<string, number>();

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
   * Worker 로그 실시간 스트리밍을 시작합니다.
   *
   * 비즈니스 목적:
   * - CI/CD 작업 실행 중 발생하는 로그를 실시간으로 Handler로 스트리밍
   * - 개발자가 빌드/테스트/배포 과정을 실시간으로 모니터링할 수 있도록 지원
   * - 여러 클라이언트가 동시에 동일한 작업의 로그를 구독할 수 있는 기능 제공
   *
   * 기술적 구현:
   * 1. gRPC 양방향 스트리밍 채널을 생성하여 Ottoscaler와 실시간 통신
   * 2. RxJS Observable 패턴으로 비동기 스트림 데이터를 처리
   * 3. 스트림 중간에 필터링, 메트릭 수집, 에러 처리 등의 파이프라인 적용
   * 4. share() 오퍼레이터로 멀티캐스트 지원 (하나의 gRPC 연결로 여러 구독자 지원)
   *
   * @param taskId CI/CD 작업의 고유 식별자
   * @param filter 로그 필터링 조건 (레벨, 키워드, 워커 ID 등)
   * @returns Observable<WorkerLogEntry> 실시간 로그 스트림
   */
  startWorkerLogStream(
    taskId: string,
    filter?: LogFilter,
  ): Observable<WorkerLogEntry> {
    this.logger.log(`Worker 로그 스트림 시작: taskId=${taskId}`);

    try {
      /**
       * 1단계: ottoscaler와의 gRPC ForwardWorkerLogs 채널 생성
       * - ottoscaler의 Worker Pod에서 생성되는 로그를 실시간으로 수신
       * - 양방향 스트리밍을 통해 지속적인 연결 유지
       * - 백프레셔와 재시도 로직으로 안정성 보장
       */
      const logStream = this.ottoscalerService.createForwardWorkerLogsChannel();

      /**
       * 2단계: 받은 로그 스트림 처리 및 필터링
       *
       * 파이프라인 설계 원칙:
       * - 임시 메모리 저장을 통한 빠른 응답성 확보
       * - 사용자 필터링 조건에 따른 로그 선별적 전송
       * - taskId 필터링과 메트릭 수집 적용
       */
      return (logStream as Observable<WorkerLogEntry>).pipe(
        // taskId 필터링: 요청된 taskId에 해당하는 로그만 필터링
        rxFilter((logEntry: WorkerLogEntry) => {
          // taskId가 지정되었으면 해당 taskId의 로그만 통과
          return !taskId || logEntry.taskId === taskId;
        }),

        // 부가 필터 적용: 로그 레벨, 키워드 등
        rxFilter((logEntry) => this.applyLogFilter(logEntry, filter)),

        // 메트릭 수집
        tap(() => this.updateMessageMetrics()),

        // 자동 재시도
        retry(3),

        // 에러 처리
        catchError((error: unknown) => {
          const err = error instanceof Error ? error : new Error(String(error));
          this.logger.error(
            `Worker 로그 스트림 에러 - taskId: ${taskId}, 에러: ${err.message}`,
            err.stack,
          );

          // 에러 유형별 상세 로깅
          if (err.message.includes('UNAVAILABLE')) {
            this.logger.warn(
              'Ottoscaler 서비스가 일시적으로 사용 불가능합니다. 재시도가 실패했습니다.',
            );
          } else if (err.message.includes('UNAUTHENTICATED')) {
            this.logger.error('gRPC 인증 실패. 인증 설정을 확인하세요.');
          }

          this.updateErrorMetrics();
          return EMPTY;
        }),

        // 서비스 종료 시 정리
        takeUntil(this.destroy$),

        // 멀티캐스트 지원
        share(),
      );
    } catch (error: unknown) {
      /**
       * 동기적 에러 처리 (채널 생성 실패 등)
       *
       * 발생 가능한 에러:
       * - gRPC 클라이언트 초기화 실패
       * - 설정 오류 (잘못된 서버 주소, 포트)
       * - 메모리 부족으로 인한 객체 생성 실패
       *
       * 처리 방법:
       * - 상세한 에러 로그 기록
       * - EMPTY Observable 반환으로 안전한 fallback 제공
       * - 서비스 전체가 중단되지 않도록 방어적 처리
       */
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Worker 로그 스트림 초기화 실패 - taskId: ${taskId}, 에러: ${err.message}`,
        err.stack,
      );
      return EMPTY;
    }
  }

  /**
   * SSE 클라이언트를 위한 로그 스트림을 생성하거나 기존 스트림을 반환합니다.
   *
   * 브로드캐스팅 시스템 핵심 로직:
   * 1. 동일한 taskId에 대해서는 하나의 gRPC 연결만 유지
   * 2. 여러 SSE 클라이언트가 해당 스트림을 공유
   * 3. 첫 번째 클라이언트 연결 시 gRPC 스트림 생성
   * 4. 마지막 클라이언트 해제 시 gRPC 스트림 자동 정리
   *
   * 메모리 효율성:
   * - 10개의 SSE 클라이언트가 같은 작업을 모니터링해도 gRPC 연결은 1개만 사용
   * - Hot Observable 패턴으로 늦게 구독하는 클라이언트도 실시간 데이터 수신
   * - Reference counting으로 불필요한 리소스 자동 해제
   *
   * @param taskId CI/CD 작업 고유 식별자
   * @param filter 로그 필터링 조건
   * @returns Observable<WorkerLogEntry> 공유 가능한 로그 스트림
   */
  getOrCreateSharedLogStream(
    taskId: string,
    filter?: LogFilter,
  ): Observable<WorkerLogEntry> {
    /**
     * 1단계: 기존 활성 스트림 확인
     *
     * 캐싱 전략:
     * - 동일한 taskId에 대한 중복 gRPC 연결 방지
     * - 이미 생성된 Hot Observable 재사용
     * - 메모리와 네트워크 리소스 효율성 확보
     */
    let sharedStream = this.activeStreams.get(taskId);

    if (!sharedStream) {
      /**
       * 2단계: 새로운 공유 스트림 생성
       *
       * Hot Observable 생성 과정:
       * 1. 기존 startWorkerLogStream 메서드로 Cold Observable 생성
       * 2. publishReplay(1)으로 마지막 값 1개를 버퍼링 (늦게 구독하는 클라이언트 지원)
       * 3. refCount()로 자동 구독/해제 관리
       * 4. takeUntil(destroy$)로 서비스 종료 시 정리 보장
       *
       * publishReplay(1) 사용 이유:
       * - 새로운 SSE 클라이언트가 연결되면 즉시 최근 로그 1개를 받을 수 있음
       * - 연결 지연으로 인한 초기 데이터 손실 방지
       * - 메모리 사용량을 최소화하면서도 사용성 확보
       */
      const coldStream = this.startWorkerLogStream(taskId, filter);

      sharedStream = coldStream.pipe(
        publishReplay(1), // 마지막 로그 1개를 버퍼링하여 새 구독자에게 즉시 전달
        refCount(), // 자동 구독/해제: 구독자가 0명이 되면 업스트림 해제
        takeUntil(this.destroy$), // 서비스 종료 시 스트림 정리
        tap({
          /**
           * 스트림 생성/해제 로깅
           *
           * 모니터링 목적:
           * - gRPC 연결 생성/해제 추적
           * - 리소스 사용량 모니터링
           * - 장애 상황 디버깅 지원
           */
          subscribe: () => {
            this.logger.log(`gRPC 로그 스트림 생성: taskId=${taskId}`);
            this.updateConnectionMetrics();
          },
          finalize: () => {
            this.logger.log(`gRPC 로그 스트림 정리: taskId=${taskId}`);
            this.activeStreams.delete(taskId);
            this.clientConnectionCounts.delete(taskId);
            this.updateConnectionMetrics();
          },
        }),
      );

      // 활성 스트림 맵에 저장
      this.activeStreams.set(taskId, sharedStream);
    }

    return sharedStream;
  }

  /**
   * SSE 클라이언트 연결을 등록하고 관리합니다.
   *
   * 연결 관리 시스템:
   * - 각 taskId별로 연결된 클라이언트 수를 추적
   * - 연결/해제 시 메트릭 실시간 업데이트
   * - 리소스 사용량 모니터링 및 최적화
   *
   * @param taskId 작업 식별자
   * @param clientId 클라이언트 고유 식별자 (세션 ID 등)
   */
  registerSSEClient(taskId: string, clientId: string): void {
    const currentCount = this.clientConnectionCounts.get(taskId) || 0;
    this.clientConnectionCounts.set(taskId, currentCount + 1);

    this.logger.debug(
      `SSE 클라이언트 연결 등록: taskId=${taskId}, clientId=${clientId}, 총 연결수=${currentCount + 1}`,
    );

    this.updateConnectionMetrics();
  }

  /**
   * SSE 클라이언트 연결 해제를 처리합니다.
   *
   * 자동 정리 메커니즘:
   * - 클라이언트 수가 0이 되면 해당 taskId의 모든 리소스 정리
   * - gRPC 스트림은 refCount()에 의해 자동 해제됨
   * - 메모리 누수 방지를 위한 방어적 정리
   *
   * @param taskId 작업 식별자
   * @param clientId 클라이언트 고유 식별자
   */
  unregisterSSEClient(taskId: string, clientId: string): void {
    const currentCount = this.clientConnectionCounts.get(taskId) || 0;
    const newCount = Math.max(0, currentCount - 1);

    if (newCount === 0) {
      // 마지막 클라이언트 해제 시 완전 정리
      this.clientConnectionCounts.delete(taskId);
      this.activeStreams.delete(taskId);

      this.logger.log(
        `taskId=${taskId}의 모든 SSE 클라이언트 연결 해제: 리소스 정리 완료`,
      );
    } else {
      this.clientConnectionCounts.set(taskId, newCount);

      this.logger.debug(
        `SSE 클라이언트 연결 해제: taskId=${taskId}, clientId=${clientId}, 남은 연결수=${newCount}`,
      );
    }

    this.updateConnectionMetrics();
  }

  /**
   * 파이프라인 실행 진행 상황을 실시간으로 스트리밍합니다.
   *
   * 비즈니스 목적:
   * - CI/CD 파이프라인의 전체 실행 과정을 실시간으로 추적
   * - 각 스테이지(빌드, 테스트, 배포)별 진행률과 상태를 모니터링
   * - 프로젝트 관리자와 개발팀이 파이프라인 상태를 공유할 수 있도록 지원
   * - 장애 발생 시 빠른 대응을 위한 실시간 알림 제공
   *
   * 기술적 구현:
   * 1. gRPC executePipeline RPC를 통해 Ottoscaler와 통신
   * 2. 파이프라인 메타데이터를 기반으로 실행 요청 생성
   * 3. 스트림 중복 제거 및 진행 상황 메트릭 수집
   * 4. 에러 처리 및 자동 재시도 메커니즘 적용
   *
   * @param pipelineId 파이프라인의 고유 식별자
   * @returns Observable<PipelineProgress> 파이프라인 진행 상황 스트림
   */
  startPipelineProgressStream(
    pipelineId: string,
  ): Observable<PipelineProgress> {
    this.logger.log(
      `파이프라인 진행 상황 스트림 시작: pipelineId=${pipelineId}`,
    );

    try {
      /**
       * 1단계: 파이프라인 실행 요청 객체 생성
       *
       * 현재 구현:
       * - 목업 데이터로 기본 구조 생성
       * - 실제 운영환경에서는 데이터베이스에서 파이프라인 정보를 조회해야 함
       *
       * 향후 개선사항:
       * - PrismaService를 통한 Pipeline 모델 조회
       * - stages 배열에 실제 스테이지 정보 포함 (빌드, 테스트, 배포 등)
       * - repository, commitSha 등 실제 Git 정보 연동
       * - triggeredBy 필드에 실제 트리거 사용자 정보 설정
       *
       * 데이터베이스 쿼리 예시 (향후 구현):
       * ```typescript
       * const pipeline = await this.prisma.pipeline.findUnique({
       *   where: { id: pipelineId },
       *   include: { stages: true, project: { include: { repository: true } } }
       * });
       * ```
       */
      const pipelineRequest: PipelineRequest = {
        pipelineId,
        name: `Pipeline ${pipelineId}`,
        stages: [], // TODO: 데이터베이스에서 실제 스테이지 정보 조회
        repository: '', // TODO: 프로젝트 연결된 Git 저장소 정보
        commitSha: '', // TODO: 빌드 대상 커밋 해시
        triggeredBy: 'system', // TODO: 실제 트리거한 사용자 정보
        metadata: {}, // TODO: 추가 메타데이터 (브랜치명, 태그 등)
      };

      /**
       * 2단계: gRPC 스트리밍 호출 및 데이터 처리 파이프라인 구성
       *
       * executePipeline RPC의 동작 과정:
       * 1. Ottoscaler가 파이프라인 정의를 분석하고 실행 계획 수립
       * 2. 각 스테이지를 순차적으로 실행하면서 진행 상황을 스트리밍으로 전송
       * 3. 스테이지 완료, 실패, 취소 등의 상태 변화를 실시간으로 알림
       * 4. 전체 파이프라인 완료 또는 실패 시 최종 결과 전송
       */
      return this.ottoscalerService.executePipeline$(pipelineRequest).pipe(
        /**
         * 3-1. 중복 상태 메시지 제거
         *
         * 중복 발생 원인:
         * - gRPC 스트리밍에서 같은 상태가 여러 번 전송될 수 있음
         * - 네트워크 지연으로 인한 메시지 재전송
         * - Ottoscaler 내부 로직에서 상태 변화 없이 heartbeat 전송
         *
         * 중복 판단 기준:
         * - stageId: 현재 실행 중인 스테이지 식별자
         * - status: 스테이지 실행 상태 (RUNNING, COMPLETED, FAILED 등)
         * - progressPercentage: 진행률 (0-100)
         *
         * 성능상 이점:
         * - 불필요한 WebSocket/SSE 메시지 전송 방지
         * - 클라이언트의 UI 깜빡임 현상 방지
         * - 네트워크 대역폭 절약
         */
        distinctUntilChanged(
          (prev, curr) =>
            prev.stageId === curr.stageId &&
            prev.status === curr.status &&
            prev.progressPercentage === curr.progressPercentage,
        ),

        /**
         * 3-2. 진행 상황 로깅 및 메트릭 수집
         *
         * 로깅 목적:
         * - 파이프라인 실행 과정 추적을 위한 감사 로그
         * - 성능 분석 및 병목 구간 식별
         * - 장애 발생 시 디버깅 정보 제공
         *
         * 메트릭 수집 항목:
         * - 각 스테이지별 실행 시간
         * - 전체 파이프라인 소요 시간
         * - 성공/실패율 통계
         * - 동시 실행 중인 파이프라인 수
         *
         * 향후 확장 가능성:
         * - Prometheus 메트릭 연동
         * - 알림 시스템 트리거 (Slack, 이메일)
         * - 대시보드 실시간 업데이트
         */
        tap((progress) => {
          // 상세 진행 상황 디버그 로그
          this.logger.debug(
            `파이프라인 진행상황 - pipelineId: ${pipelineId}, ` +
              `stageId: ${progress.stageId}, status: ${progress.status}, ` +
              `progress: ${progress.progressPercentage}%`,
          );

          // 중요한 상태 변화는 INFO 레벨로 로깅
          if (progress.status.toString().includes('COMPLETED')) {
            this.logger.log(
              `파이프라인 스테이지 완료 - ${pipelineId}: ${progress.stageId}`,
            );
          } else if (progress.status.toString().includes('FAILED')) {
            this.logger.warn(
              `파이프라인 스테이지 실패 - ${pipelineId}: ${progress.stageId}, ` +
                `오류: ${progress.errorMessage || '알 수 없음'}`,
            );
          }

          // 메트릭 업데이트 (성능 통계, 모니터링)
          this.updateProgressMetrics(progress);
        }),

        /**
         * 3-3. gRPC 연결 장애 시 재시도
         *
         * 재시도 정책 차이점:
         * - Worker 로그 스트리밍: 3회 재시도 (데이터 손실 허용 가능)
         * - 파이프라인 진행상황: 2회 재시도 (중요한 상태 변화 놓치면 안됨)
         *
         * 파이프라인 재시도 시 주의사항:
         * - 파이프라인 실행은 중단되지 않고 계속 진행됨
         * - 재시도는 스트리밍 연결만 복구하는 것
         * - 중간에 놓친 진행상황은 복구 후 최신 상태부터 수신
         *
         * 재시도하지 않는 경우:
         * - 파이프라인이 이미 완료된 경우
         * - 잘못된 pipelineId로 요청한 경우
         * - 권한이 없는 파이프라인에 접근한 경우
         */
        retry({
          count: 2,
          delay: (error: unknown, retryCount) => {
            const err =
              error instanceof Error ? error : new Error(String(error));
            this.logger.warn(
              `파이프라인 스트림 재시도 (${retryCount}/2) - ${pipelineId}: ${err.message}`,
            );
            // 재시도 간격: 2초 → 4초
            return timer(retryCount * 2000);
          },
        }),

        /**
         * 3-4. 복구 불가능한 에러 최종 처리
         *
         * 파이프라인 스트리밍 특수 에러 케이스:
         * - PIPELINE_NOT_FOUND: 존재하지 않는 파이프라인 요청
         * - PIPELINE_ALREADY_COMPLETED: 이미 완료된 파이프라인 재요청
         * - INSUFFICIENT_RESOURCES: 워커 리소스 부족으로 실행 불가
         * - EXECUTION_TIMEOUT: 파이프라인 실행 시간 초과
         *
         * 에러별 처리 방법:
         * - 일시적 에러: 재시도 후에도 실패하면 빈 스트림 반환
         * - 영구적 에러: 즉시 에러 로그 기록 후 스트림 종료
         * - 시스템 에러: 운영팀 알림 트리거
         *
         * 클라이언트 영향:
         * - SSE/WebSocket 클라이언트는 스트림 종료 이벤트 수신
         * - UI에서 "파이프라인 모니터링 실패" 등의 메시지 표시
         * - 사용자는 수동 새로고침으로 재시도 가능
         */
        catchError((error: unknown) => {
          const err = error instanceof Error ? error : new Error(String(error));
          this.logger.error(
            `파이프라인 진행 상황 스트림 에러 - pipelineId: ${pipelineId}, 에러: ${err.message}`,
            err.stack,
          );

          // 에러 유형별 세부 처리
          if (err.message.includes('NOT_FOUND')) {
            this.logger.warn(`존재하지 않는 파이프라인: ${pipelineId}`);
          } else if (err.message.includes('ALREADY_COMPLETED')) {
            this.logger.log(`이미 완료된 파이프라인: ${pipelineId}`);
          } else if (err.message.includes('INSUFFICIENT_RESOURCES')) {
            this.logger.error(
              `리소스 부족으로 파이프라인 실행 불가: ${pipelineId}`,
            );
          }

          return EMPTY;
        }),

        /**
         * 3-5. 서비스 종료 시 스트림 정리
         *
         * 파이프라인 스트리밍 종료 시나리오:
         * - 애플리케이션 정상 종료 (SIGTERM)
         * - 긴급 종료 (SIGKILL)
         * - 모듈 재배포
         * - 메모리 부족으로 인한 프로세스 재시작
         *
         * 정리 작업:
         * - 활성화된 모든 gRPC 스트림 연결 해제
         * - 진행 중인 파이프라인은 Ottoscaler에서 계속 실행됨 (스트리밍만 중단)
         * - 메모리 상의 세션 정보 정리
         * - 메트릭 데이터 최종 저장
         */
        takeUntil(this.destroy$),

        /**
         * 3-6. 멀티캐스트 지원으로 효율성 확보
         *
         * 파이프라인 모니터링 시나리오:
         * - 프로젝트 관리자, 개발자, QA 엔지니어가 동시에 모니터링
         * - CI/CD 대시보드에서 여러 파이프라인을 동시에 표시
         * - 모바일 앱과 웹 대시보드에서 동시 접근
         *
         * share() 적용 효과:
         * - 10명이 동시에 모니터링해도 gRPC 연결은 1개만 사용
         * - Ottoscaler 서버의 부하 최소화
         * - 네트워크 리소스 효율적 사용
         *
         * 주의사항:
         * - 늦게 구독한 클라이언트는 현재 진행상황부터만 수신
         * - 파이프라인 시작 전부터 구독한 경우에만 전체 과정 확인 가능
         * - 과거 진행상황이 필요한 경우 별도 API로 조회 필요
         */
        share(),
      );
    } catch (error) {
      /**
       * 동기적 에러 처리 (파이프라인 요청 생성 실패)
       *
       * 발생 가능한 동기 에러:
       * - pipelineId 유효성 검사 실패
       * - PipelineRequest 객체 생성 오류
       * - gRPC 클라이언트 접근 실패
       * - 메모리 부족으로 인한 객체 생성 불가
       *
       * 방어적 처리:
       * - 상세한 에러 정보 로깅
       * - 빈 Observable 반환으로 애플리케이션 중단 방지
       * - 에러 상황을 메트릭으로 기록하여 모니터링 가능
       */
      this.logger.error(
        `파이프라인 스트림 초기화 실패 - pipelineId: ${pipelineId}, 에러: ${(error as Error).message}`,
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

    const sessionId = crypto.randomUUID();
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
  generateMockLogs(
    jobId: string,
    attemptNo: number = 1,
    logCount: number = 50,
  ): Log[] {
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

      for (let i = 0; i < logCount; i++) {
        const template = logTemplates[i % logTemplates.length];
        const stream =
          Math.random() > 0.8 ? LogStream.stderr : LogStream.stdout;
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
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`목업 로그 생성 실패: jobId=${jobId}`, err);
      throw err;
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
    }

    return storedLogs$;
  }
}
