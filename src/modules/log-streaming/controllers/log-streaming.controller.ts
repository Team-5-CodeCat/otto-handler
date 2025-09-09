import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  HttpStatus,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { map, catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';

import { LogStreamingService } from '../services/log-streaming.service';
import type { ILogStreamingController } from '../interfaces/log-streaming.interface';
import type { SSEMessage, LogFilter } from '../types/log-streaming.types';
import type { WorkerLogEntry, PipelineProgress } from '../../../generated/otto';

/**
 * 🌐 LogStreamingController
 *
 * 📋 목적:
 * - HTTP 기반 Server-Sent Events(SSE) API 제공
 * - 웹 브라우저에서 EventSource API로 실시간 로그 수신
 * - RESTful API 설계 원칙을 따른 로그 스트리밍 엔드포인트
 *
 * 🏗 아키텍처 패턴:
 * 1. Controller-Service Pattern: 비즈니스 로직과 HTTP 처리 분리
 * 2. SSE (Server-Sent Events): 단방향 실시간 통신
 * 3. Observable to SSE: RxJS Observable → HTTP 스트림 변환
 * 4. Error Boundary: HTTP 에러 상태 코드 매핑
 *
 * 💼 비즈니스 가치:
 * - 웹 개발자가 별도 라이브러리 없이 표준 웹 기술로 실시간 로그 수신
 * - CI/CD 대시보드, 모니터링 도구 등 웹 인터페이스 구축 지원
 * - 크로스 브라우저 호환성 (모든 모던 브라우저에서 EventSource 지원)
 *
 * 🔧 기술적 특징:
 * - Fastify Response Stream 활용
 * - HTTP/1.1 Chunked Transfer Encoding
 * - Content-Type: text/event-stream
 * - CORS 지원으로 다양한 프론트엔드 도메인에서 접근 가능
 */
@Controller('log-streaming')
export class LogStreamingController implements ILogStreamingController {
  private readonly logger = new Logger(LogStreamingController.name);

  constructor(private readonly logStreamingService: LogStreamingService) {}

  /**
   * 📡 SSE 로그 스트림 엔드포인트
   *
   * 🌐 HTTP API:
   * GET /api/v1/log-streaming/logs/:taskId/stream
   *
   * 💼 비즈니스 프로세스:
   * 1. 클라이언트(웹 브라우저)가 EventSource로 연결
   * 2. 지정된 CI/CD 작업의 실시간 로그를 SSE 형식으로 스트리밍
   * 3. 필터 조건에 따라 선별적 로그 전송 (레벨, 키워드 등)
   * 4. 연결 종료 시 리소스 자동 정리
   *
   * 📝 사용 예시 (프론트엔드):
   * ```javascript
   * const eventSource = new EventSource('/api/v1/log-streaming/logs/task123/stream?level=ERROR');
   * eventSource.onmessage = (event) => {
   *   const logData = JSON.parse(event.data);
   *   console.log('새 로그:', logData);
   * };
   * ```
   *
   * 🔧 기술적 구현:
   * - HTTP Response를 무한 스트림으로 유지
   * - SSE 표준 형식: "data: {JSON}\n\n"
   * - Keep-alive로 연결 유지
   * - 클라이언트 연결 종료 감지 및 리소스 정리
   *
   * @param taskId CI/CD 작업 고유 ID
   * @param level 로그 레벨 필터 (INFO, ERROR, DEBUG, WARN)
   * @param keywords 키워드 필터 (쉼표로 구분된 문자열)
   * @param workerId Worker Pod ID 필터
   * @param response Fastify Response 객체
   */
  @Get('logs/:taskId/stream')
  streamLogs(
    @Param('taskId') taskId: string,
    @Res() response: FastifyReply,
    @Query('level') level?: string,
    @Query('keywords') keywords?: string,
    @Query('workerId') workerId?: string,
  ): void {
    // ✅ 입력 유효성 검사
    if (!taskId || taskId.trim().length === 0) {
      throw new BadRequestException('taskId는 필수 파라미터입니다');
    }

    this.logger.log(
      `SSE 로그 스트림 시작: taskId=${taskId}, level=${level}, workerId=${workerId}`,
    );

    try {
      // 🎛 필터 조건 구성
      const filter: LogFilter = {};
      if (level) filter.levels = [level];
      if (keywords) filter.keywords = keywords.split(',').map((k) => k.trim());
      if (workerId) filter.workerIds = [workerId];
      filter.taskIds = [taskId];

      // 📡 SSE 헤더 설정
      this.setupSSEHeaders(response);

      /**
       * SSE 클라이언트 연결 관리 및 공유 스트림 구독
       * 
       * 브로드캐스팅 시스템 통합:
       * 1. 고유한 클라이언트 ID 생성 (연결 추적용)
       * 2. SSE 클라이언트 연결 등록
       * 3. 공유 로그 스트림 구독 (gRPC 연결 재사용)
       * 4. 연결 해제 시 자동 정리
       */
      const clientId = `sse-${Date.now()}-${Math.random().toString(36).substring(2)}`;
      
      // 클라이언트 연결 등록
      this.logStreamingService.registerSSEClient(taskId, clientId);

      // 공유 로그 스트림 구독 (멀티캐스팅)
      const logStream$ = this.logStreamingService
        .getOrCreateSharedLogStream(taskId, filter)
        .pipe(
          // WorkerLogEntry → SSEMessage 변환
          map((logEntry: WorkerLogEntry) =>
            this.createSSEMessage('log', logEntry),
          ),

          /**
           * Circuit Breaker 패턴 일관성 유지
           * 
           * 에러 처리 전략:
           * 1. gRPC 연결 에러는 이미 startWorkerLogStream에서 처리됨
           * 2. 여기서는 SSE 특화 에러만 처리 (변환 에러, 네트워크 에러 등)
           * 3. 다른 클라이언트에게 영향 주지 않도록 로컬 에러 처리
           */
          catchError((error) => {
            this.logger.error(
              `SSE 스트림 변환 에러 - taskId: ${taskId}, clientId: ${clientId}, 에러: ${(error as Error).message}`,
              (error as Error).stack,
            );
            
            // 클라이언트에게 에러 알림
            const errorMessage = this.createSSEMessage('error', {
              message: 'SSE 스트림 처리 중 에러가 발생했습니다',
              details: (error as Error).message,
              timestamp: new Date().toISOString(),
              clientId, // 디버깅을 위한 클라이언트 식별자
            });
            
            response.raw.write(this.formatSSEMessage(errorMessage));
            return EMPTY; // 에러 후 스트림 종료
          }),
        );

      // 📨 SSE 메시지 전송 시작
      const subscription = logStream$.subscribe({
        // ✅ 정상 로그 데이터 전송
        next: (sseMessage: SSEMessage) => {
          const formattedMessage = this.formatSSEMessage(sseMessage);
          response.raw.write(formattedMessage);

          // 🐛 디버그 모드에서 상세 로그 출력
          if (process.env.NODE_ENV === 'development') {
            this.logger.debug(
              `SSE 메시지 전송: ${JSON.stringify(sseMessage).substring(0, 100)}...`,
            );
          }
        },

        /**
         * SSE 구독 에러 처리
         * 
         * 에러 발생 시나리오:
         * - 네트워크 연결 끊김
         * - 클라이언트 브라우저 종료
         * - 서버 리소스 부족
         * 
         * 처리 방법:
         * - 해당 클라이언트만 연결 종료 (다른 클라이언트 영향 없음)
         * - 클라이언트 연결 해제 등록
         * - 정리 작업 수행
         */
        error: (error) => {
          this.logger.error(`SSE 구독 에러 - taskId: ${taskId}, clientId: ${clientId}, 에러: ${(error as Error).message}`);
          
          // 에러 메시지 전송 시도 (연결이 살아있다면)
          if (!response.raw.destroyed) {
            const errorMessage = this.createSSEMessage('error', {
              message: 'SSE 연결 에러',
              timestamp: new Date().toISOString(),
              clientId,
            });
            response.raw.write(this.formatSSEMessage(errorMessage));
          }
          
          // 클라이언트 연결 해제 및 정리
          this.logStreamingService.unregisterSSEClient(taskId, clientId);
          response.raw.end();
        },

        /**
         * 정상적인 스트림 완료 처리
         * 
         * 완료 시나리오:
         * - CI/CD 작업 완료
         * - gRPC 스트림 종료
         * - 서버 측 스트림 완료
         */
        complete: () => {
          this.logger.log(`SSE 스트림 완료 - taskId: ${taskId}, clientId: ${clientId}`);
          
          const completeMessage = this.createSSEMessage('complete', {
            message: '로그 스트림이 완료되었습니다',
            timestamp: new Date().toISOString(),
            clientId,
          });
          response.raw.write(this.formatSSEMessage(completeMessage));
          
          // 클라이언트 연결 해제 등록
          this.logStreamingService.unregisterSSEClient(taskId, clientId);
          response.raw.end();
        },
      });

      /**
       * 클라이언트 연결 종료 이벤트 처리
       * 
       * 브라우저 연결 종료 감지:
       * - 사용자가 브라우저 탭 닫기
       * - 페이지 새로고침
       * - 네트워크 연결 끊김
       * 
       * 자동 정리 작업:
       * - Observable 구독 해제
       * - 클라이언트 연결 카운트 감소
       * - 필요 시 gRPC 스트림 정리 (마지막 클라이언트인 경우)
       */
      response.raw.on('close', () => {
        this.logger.debug(`SSE 클라이언트 연결 종료 - taskId: ${taskId}, clientId: ${clientId}`);
        
        // Observable 구독 해제
        subscription.unsubscribe();
        
        // 클라이언트 연결 해제 등록 (브로드캐스팅 시스템에서 자동 정리)
        this.logStreamingService.unregisterSSEClient(taskId, clientId);
      });

      // ❤️ 연결 유지를 위한 heartbeat (30초마다)
      const heartbeatInterval = setInterval(() => {
        if (!response.raw.destroyed) {
          const heartbeat = this.createSSEMessage('heartbeat', {
            timestamp: new Date().toISOString(),
          });
          response.raw.write(this.formatSSEMessage(heartbeat));
        } else {
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // 🧹 heartbeat 정리
      response.raw.on('close', () => {
        clearInterval(heartbeatInterval);
      });
    } catch (error) {
      this.logger.error(
        `SSE 로그 스트림 초기화 실패: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        '로그 스트림을 시작할 수 없습니다',
      );
    }
  }

  /**
   * 📊 SSE 파이프라인 진행 상황 스트림 엔드포인트
   *
   * 🌐 HTTP API:
   * GET /api/v1/log-streaming/pipelines/:pipelineId/progress
   *
   * 💼 비즈니스 프로세스:
   * 1. CI/CD 파이프라인의 전체 진행 상황을 실시간으로 스트리밍
   * 2. 각 스테이지별 상태 변화 (대기→실행→완료→실패) 추적
   * 3. 진행률 정보로 대시보드 UI의 프로그레스 바 업데이트
   * 4. 완료/실패 시 최종 결과 전송 후 스트림 종료
   *
   * 📝 사용 예시 (프론트엔드):
   * ```javascript
   * const progressSource = new EventSource('/api/v1/log-streaming/pipelines/pipeline123/progress');
   * progressSource.addEventListener('progress', (event) => {
   *   const progressData = JSON.parse(event.data);
   *   updateProgressBar(progressData.progressPercentage);
   * });
   * ```
   */
  @Get('pipelines/:pipelineId/progress')
  streamPipelineProgress(
    @Param('pipelineId') pipelineId: string,
    @Res() response: FastifyReply,
  ): void {
    if (!pipelineId || pipelineId.trim().length === 0) {
      throw new BadRequestException('pipelineId는 필수 파라미터입니다');
    }

    this.logger.log(
      `SSE 파이프라인 진행 상황 스트림 시작: pipelineId=${pipelineId}`,
    );

    try {
      // 📡 SSE 헤더 설정
      this.setupSSEHeaders(response);

      // 📊 파이프라인 진행 상황 스트림 시작
      const progressStream$ = this.logStreamingService
        .startPipelineProgressStream(pipelineId)
        .pipe(
          map((progress: PipelineProgress) =>
            this.createSSEMessage('progress', {
              pipelineId: progress.pipelineId,
              stageId: progress.stageId,
              status: progress.status,
              progressPercentage: progress.progressPercentage,
              message: progress.message,
              timestamp: progress.timestamp,
              startedAt: progress.startedAt,
              completedAt: progress.completedAt,
              workerPodNames: progress.workerPodNames,
              errorMessage: progress.errorMessage,
            }),
          ),

          catchError((error) => {
            this.logger.error(
              `파이프라인 진행 상황 스트림 에러: ${(error as Error).message}`,
              (error as Error).stack,
            );
            const errorMessage = this.createSSEMessage('error', {
              message: '파이프라인 진행 상황 수신 에러',
              details: (error as Error).message,
              timestamp: new Date().toISOString(),
            });
            response.raw.write(this.formatSSEMessage(errorMessage));
            response.raw.end();
            throw error;
          }),
        );

      // 📨 진행 상황 전송
      const subscription = progressStream$.subscribe({
        next: (sseMessage: SSEMessage) => {
          response.raw.write(this.formatSSEMessage(sseMessage));
        },
        error: (error) => {
          this.logger.error(
            `파이프라인 SSE 스트림 에러: ${(error as Error).message}`,
          );
          response.raw.end();
        },
        complete: () => {
          this.logger.log(
            `파이프라인 SSE 스트림 완료: pipelineId=${pipelineId}`,
          );
          response.raw.end();
        },
      });

      // 🧹 클라이언트 연결 종료 시 정리
      response.raw.on('close', () => {
        this.logger.log(
          `파이프라인 클라이언트 연결 종료: pipelineId=${pipelineId}`,
        );
        subscription.unsubscribe();
      });
    } catch (error) {
      this.logger.error(
        `파이프라인 SSE 스트림 초기화 실패: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        '파이프라인 진행 상황 스트림을 시작할 수 없습니다',
      );
    }
  }

  /**
   * 🏥 헬스체크 엔드포인트
   *
   * 🌐 HTTP API:
   * GET /api/v1/log-streaming/health
   *
   * 💼 비즈니스 목적:
   * - 로드밸런서, 모니터링 시스템에서 서비스 상태 확인
   * - 장애 발생 시 자동 복구 시스템 연동
   * - 서비스 배포 후 정상 동작 여부 검증
   *
   * 📊 응답 정보:
   * - 서비스 상태 (healthy/unhealthy)
   * - 현재 활성 연결 수
   * - 타임스탬프
   */
  @Get('health')
  async getHealth(): Promise<{
    status: string;
    timestamp: Date;
    activeConnections: number;
  }> {
    try {
      const metrics = await this.logStreamingService.getMetrics();

      return {
        status: 'healthy',
        timestamp: new Date(),
        activeConnections: metrics.activeConnections,
      };
    } catch (error) {
      this.logger.error(
        `헬스체크 실패: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException('서비스 상태 확인 실패');
    }
  }

  /**
   * 🧪 목업 데이터 생성 테스트 엔드포인트
   * 개발/테스트 환경에서 목업 로그 데이터 생성 확인
   */
  @Get('test/mock-logs/:jobId')
  async testMockLogs(
    @Param('jobId') jobId: string,
    @Query('count') count = '10',
  ) {
    try {
      // UUID 형식 검증 - 실제 Job과 연결하지 않고 임시로 UUID 생성
      let validJobId = jobId;
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (!uuidRegex.test(jobId)) {
        // UUID가 아니면 임시로 생성 (실제 연결 없이 테스트)
        const { randomUUID } = await import('crypto');
        validJobId = randomUUID();
        this.logger.log(
          `UUID가 아닌 jobId를 UUID로 변환: ${jobId} -> ${validJobId}`,
        );
      }

      const logCount = parseInt(count, 10);
      const logs = await this.logStreamingService.generateMockLogs(
        validJobId,
        1,
        logCount,
      );
      return {
        success: true,
        message: `${logs.length}개의 목업 로그가 생성되었습니다`,
        originalJobId: jobId,
        generatedJobId: validJobId,
        logs: logs.map((log) => ({
          logID: log.logID,
          jobID: log.jobID,
          stream: log.stream,
          content: (log.content || '').substring(0, 100) + '...',
        })),
      };
    } catch (error) {
      this.logger.error('목업 로그 생성 실패:', error);
      throw new InternalServerErrorException('목업 로그 생성에 실패했습니다');
    }
  }

  // ========================================
  // 🔧 Private Helper Methods (내부 구현)
  // ========================================

  /**
   * 📡 SSE 응답 헤더 설정
   *
   * 🔧 기술적 구현:
   * - Content-Type: text/event-stream (SSE 표준)
   * - Cache-Control: no-cache (캐싱 방지)
   * - Connection: keep-alive (연결 유지)
   * - CORS 헤더 설정 (크로스 오리진 요청 허용)
   */
  private setupSSEHeaders(response: FastifyReply): void {
    response.raw.writeHead(HttpStatus.OK, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    });
  }

  /**
   * 📨 SSE 메시지 객체 생성
   *
   * 🔧 기술적 구현:
   * - 이벤트 타입과 데이터를 포함한 구조화된 메시지
   * - 클라이언트에서 event.type으로 메시지 유형 구분 가능
   * - JSON 직렬화 가능한 데이터만 포함
   */
  private createSSEMessage(event: string, data: unknown): SSEMessage {
    return {
      event,
      data,
      id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
    };
  }

  /**
   * 📝 SSE 표준 형식으로 메시지 포맷팅
   *
   * 🔧 기술적 구현:
   * - SSE 표준: "event: {type}\ndata: {JSON}\nid: {id}\n\n"
   * - 각 줄은 \n으로 구분, 메시지 끝은 \n\n
   * - JSON.stringify를 통한 안전한 데이터 직렬화
   */
  private formatSSEMessage(sseMessage: SSEMessage): string {
    let formatted = '';

    if (sseMessage.event) {
      formatted += `event: ${sseMessage.event}\n`;
    }

    if (sseMessage.data) {
      formatted += `data: ${JSON.stringify(sseMessage.data)}\n`;
    }

    if (sseMessage.id) {
      formatted += `id: ${sseMessage.id}\n`;
    }

    if (sseMessage.retry) {
      formatted += `retry: ${sseMessage.retry}\n`;
    }

    formatted += '\n'; // 메시지 종료 표시

    return formatted;
  }
}
