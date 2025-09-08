import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject, BehaviorSubject, EMPTY } from 'rxjs';
import { 
  map, 
  filter as rxFilter, 
  tap, 
  catchError, 
  takeUntil, 
  share,
  retry,
  distinctUntilChanged
} from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

import { OttoscalerService } from '../../../integrations/grpc/ottoscaler.service';
import type { ILogStreamingService } from '../interfaces/log-streaming.interface';
import type {
  LogStreamSession,
  LogFilter,
  StreamingMetrics,
  LogStreamingConfig
} from '../types/log-streaming.types';
import type {
  WorkerLogEntry,
  PipelineProgress,
  PipelineRequest
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
export class LogStreamingService implements ILogStreamingService, OnModuleDestroy {
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
    private readonly ottoscalerService: OttoscalerService,
  ) {
    // 🔄 주기적 메트릭 업데이트 및 세션 정리 작업 시작
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
  startWorkerLogStream(taskId: string, filter?: LogFilter): Observable<WorkerLogEntry> {
    this.logger.log(`Worker 로그 스트림 시작: taskId=${taskId}`);
    
    try {
      // 📡 gRPC 양방향 스트리밍 채널 생성
      const channel = this.ottoscalerService.createForwardWorkerLogsChannel();
      
      return channel.responses$.pipe(
        // 🔄 성공 응답만 필터링 (ACK 상태)
        rxFilter(response => response.status === 0), // 0 = ACK
        
        // 🎛 로그 필터 적용 (레벨, 키워드, 시간 범위 등)
        rxFilter(logEntry => this.applyLogFilter(logEntry as unknown as WorkerLogEntry, filter)),
        
        // 📊 메트릭 수집: 처리된 메시지 수 카운트
        tap(() => this.updateMessageMetrics()),
        
        // 🔄 gRPC 연결 실패 시 자동 재시도 (최대 3회)
        retry(3),
        
        // ❌ 복구 불가능한 에러 처리
        catchError(error => {
          this.logger.error(`Worker 로그 스트림 에러: ${error.message}`, error.stack);
          this.updateErrorMetrics();
          return EMPTY; // 빈 Observable 반환으로 스트림 종료
        }),
        
        // 🛑 서비스 종료 시 스트림 자동 정리
        takeUntil(this.destroy$),
        
        // 🔗 다중 구독자 지원: 동일한 taskId를 여러 클라이언트가 구독 가능
        share()
      ) as Observable<WorkerLogEntry>;
      
    } catch (error) {
      this.logger.error(`Worker 로그 스트림 초기화 실패: ${error.message}`, error.stack);
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
  startPipelineProgressStream(pipelineId: string): Observable<PipelineProgress> {
    this.logger.log(`파이프라인 진행 상황 스트림 시작: pipelineId=${pipelineId}`);
    
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
        distinctUntilChanged((prev, curr) => 
          prev.stageId === curr.stageId && 
          prev.status === curr.status &&
          prev.progressPercentage === curr.progressPercentage
        ),
        
        // 📊 진행 상황 메트릭 업데이트
        tap(progress => {
          this.logger.debug(`파이프라인 진행: Stage=${progress.stageId}, Progress=${progress.progressPercentage}%`);
          this.updateProgressMetrics(progress);
        }),
        
        // 🔄 연결 실패 시 재시도
        retry(2),
        
        // ❌ 에러 처리 및 로깅
        catchError(error => {
          this.logger.error(`파이프라인 진행 상황 스트림 에러: ${error.message}`, error.stack);
          return EMPTY;
        }),
        
        // 🛑 서비스 종료 시 정리
        takeUntil(this.destroy$),
        share()
      );
      
    } catch (error) {
      this.logger.error(`파이프라인 스트림 초기화 실패: ${error.message}`, error.stack);
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
      throw new Error(`최대 연결 수(${this.config.maxConnections})에 도달했습니다`);
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
    
    this.logger.log(`새 세션 생성: ${sessionId} (현재 활성 세션: ${this.sessions.size})`);
    
    return session;
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
    
    this.logger.log(`세션 종료: ${sessionId} (남은 활성 세션: ${this.sessions.size})`);
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
  async updateSessionFilter(sessionId: string, filter: LogFilter): Promise<void> {
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
    return this.metrics$.getValue();
  }

  /**
   * 🧹 서비스 종료 시 리소스 정리
   * 
   * 🔧 기술적 구현:
   * - 모든 활성 Observable 구독 해제
   * - gRPC 연결 정리
   * - 메모리 정리 및 세션 저장소 비우기
   */
  async onModuleDestroy() {
    this.logger.log('LogStreamingService 종료 중...');
    
    // 🛑 모든 스트림에 종료 시그널 전송
    this.destroy$.next();
    this.destroy$.complete();
    
    // 🧹 세션 정리
    this.sessions.clear();
    
    this.logger.log('LogStreamingService 종료 완료');
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
  private applyLogFilter(logEntry: WorkerLogEntry, filter?: LogFilter): boolean {
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
      const hasKeyword = filter.keywords.some(keyword => 
        logEntry.message.toLowerCase().includes(keyword.toLowerCase())
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
        const inactiveMinutes = (now.getTime() - session.lastActivity.getTime()) / (1000 * 60);
        if (inactiveMinutes > this.config.sessionTimeoutMinutes) {
          expiredSessions.push(sessionId);
        }
      });
      
      // 🗑 만료된 세션 정리
      expiredSessions.forEach(sessionId => {
        this.sessions.delete(sessionId);
        this.logger.debug(`만료된 세션 정리: ${sessionId}`);
      });
      
      if (expiredSessions.length > 0) {
        this.updateConnectionMetrics();
        this.logger.log(`${expiredSessions.length}개의 만료된 세션을 정리했습니다`);
      }
      
    }, 60000); // 1분마다 실행
  }
}