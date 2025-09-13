import type { PipelineFlowData } from '../common';

export interface PipelineResponseDto<T = Record<string, unknown>> {
  /**
   * 파이프라인 ID
   */
  pipelineId: string;

  /**
   * 파이프라인 이름
   */
  name: string;

  /**
   * 파이프라인 설명
   */
  description: string | null;

  /**
   * 활성화 여부
   */
  isActive: boolean;

  /**
   * 프로젝트 ID
   */
  projectId: string;

  /**
   * React Flow 파이프라인 데이터
   */
  pipelineData: PipelineFlowData<T> | null;

  /**
   * 생성일시
   */
  createdAt: Date;

  /**
   * 수정일시
   */
  updatedAt: Date;
}

export interface PipelineDetailResponseDto<T = Record<string, unknown>>
  extends PipelineResponseDto<T> {
  /**
   * 프로젝트 정보
   */
  project: {
    projectId: string;
    name: string;
    githubRepoName: string;
    githubOwner: string;
  };

  /**
   * 최근 실행 기록 (최대 5개)
   */
  recentExecutions: {
    executionId: string;
    status: string;
    startedAt: Date | null;
    completedAt: Date | null;
    duration: number | null;
  }[];
}

export interface PipelineListResponseDto<T = Record<string, unknown>> {
  /**
   * 파이프라인 목록
   */
  pipelines: PipelineResponseDto<T>[];

  /**
   * 전체 개수
   */
  total: number;

  /**
   * 페이지 정보
   */
  page: number;

  /**
   * 페이지 크기
   */
  limit: number;
}
