import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CodeBuildClient,
  CreateProjectCommand,
  StartBuildCommand,
  BatchGetBuildsCommand,
  StopBuildCommand,
  ListBuildsForProjectCommand,
  Build,
} from '@aws-sdk/client-codebuild';
import {
  CODEBUILD_CONSTANTS,
  PROJECT_NAMING,
  COMPUTE_TYPE_BY_PIPELINE,
  DEFAULT_ENVIRONMENT_VARIABLES,
  DEFAULT_BUILDSPEC_TEMPLATE,
  CODEBUILD_ERROR_MESSAGES,
} from '../constants/codebuild.constants';
import type {
  CodeBuildProjectConfig,
  EnvironmentVariable,
} from '../types/codebuild.types';
import type { CreateProjectRequestDto } from '../dtos/request/create-project-request.dto';
import type { StartBuildRequestDto } from '../dtos/request/start-build-request.dto';
import type { CreateProjectResponseDto } from '../dtos/response/create-project-response.dto';
import type { BuildResponseDto } from '../dtos/response/build-response.dto';
import type { BuildStatusResponseDto } from '../dtos/response/build-status-response.dto';

@Injectable()
export class CodeBuildService {
  private readonly logger = new Logger(CodeBuildService.name);
  private readonly codeBuildClient: CodeBuildClient;

  constructor(private readonly configService: ConfigService) {
    // AWS SDK 클라이언트 초기화
    this.codeBuildClient = new CodeBuildClient({
      region: this.configService.get('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID')!,
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY')!,
      },
    });

    this.logger.log('CodeBuild 클라이언트가 초기화되었습니다');
  }

  /**
   * CodeBuild 프로젝트 생성
   */
  async createProject(
    request: CreateProjectRequestDto,
  ): Promise<CreateProjectResponseDto> {
    try {
      const projectName =
        request.projectName ||
        PROJECT_NAMING.generateProjectName(request.userId, request.projectId);

      this.logger.log(`CodeBuild 프로젝트 생성 시작: ${projectName}`);

      const config: CodeBuildProjectConfig = {
        name: projectName,
        description:
          request.description ||
          `Otto Handler project for ${request.userId}/${request.projectId}`,
        sourceType: 'GITHUB',
        sourceLocation: request.sourceLocation,
        buildspec: request.buildspec || DEFAULT_BUILDSPEC_TEMPLATE,
        serviceRole: this.configService.get('AWS_CODEBUILD_SERVICE_ROLE')!,
        artifactsBucket:
          request.artifactsBucket ||
          this.configService.get('CODEBUILD_ARTIFACTS_BUCKET'),
      };

      const command = new CreateProjectCommand({
        name: config.name,
        description: config.description,
        source: {
          type: config.sourceType,
          location: config.sourceLocation,
          buildspec: config.buildspec,
          gitCloneDepth: 1,
          reportBuildStatus: true,
        },
        artifacts: {
          type: config.artifactsBucket ? 'S3' : 'NO_ARTIFACTS',
          location: config.artifactsBucket,
          name: config.name,
          packaging: 'ZIP',
        },
        environment: {
          type: CODEBUILD_CONSTANTS.ENVIRONMENT_TYPE,
          image: CODEBUILD_CONSTANTS.DEFAULT_IMAGE,
          computeType: CODEBUILD_CONSTANTS.DEFAULT_COMPUTE_TYPE,
          environmentVariables: DEFAULT_ENVIRONMENT_VARIABLES.map((env) => ({
            name: env.name,
            value: env.value,
            type: env.type,
          })),
        },
        serviceRole: config.serviceRole,
        timeoutInMinutes: CODEBUILD_CONSTANTS.DEFAULT_TIMEOUT_MINUTES,
        badgeEnabled: true,
        logsConfig: {
          cloudWatchLogs: {
            status: 'ENABLED',
            groupName: `/aws/codebuild/${config.name}`,
          },
        },
      });

      const response = await this.codeBuildClient.send(command);

      if (!response.project) {
        throw new BadRequestException(
          CODEBUILD_ERROR_MESSAGES.PROJECT_NOT_FOUND,
        );
      }

      this.logger.log(`CodeBuild 프로젝트 생성 완료: ${projectName}`);

      return {
        projectName: response.project.name!,
        arn: response.project.arn!,
        description: response.project.description,
        sourceLocation: response.project.source?.location,
        serviceRole: response.project.serviceRole!,
        created: response.project.created!,
        userId: request.userId,
        projectId: request.projectId,
      };
    } catch (error) {
      this.logger.error('CodeBuild 프로젝트 생성 실패', error);
      this.handleAWSError(error);
      throw error;
    }
  }

  /**
   * 파이프라인 빌드 시작 (오버라이드 활용)
   */
  async startBuild(request: StartBuildRequestDto): Promise<BuildResponseDto> {
    try {
      this.logger.log(
        `빌드 시작: ${request.projectName}, Pipeline: ${request.pipelineId}`,
      );

      // 파이프라인 정보를 환경변수로 변환
      const pipelineEnvVars: EnvironmentVariable[] = [
        { name: 'PIPELINE_ID', value: request.pipelineId },
        {
          name: 'PIPELINE_NAME',
          value: request.pipelineName || request.pipelineId,
        },
        { name: 'PIPELINE_TYPE', value: request.pipelineType },
        { name: 'ENVIRONMENT', value: request.environment },
        { name: 'BUILD_TIMESTAMP', value: new Date().toISOString() },
      ];

      // 커스텀 환경변수 추가
      if (request.customEnvironmentVariables) {
        pipelineEnvVars.push(...request.customEnvironmentVariables);
      }

      // 파이프라인 타입에 따른 최적 컴퓨팅 타입 결정
      const computeType =
        request.computeType ||
        COMPUTE_TYPE_BY_PIPELINE[request.pipelineType] ||
        CODEBUILD_CONSTANTS.DEFAULT_COMPUTE_TYPE;

      const command = new StartBuildCommand({
        projectName: request.projectName,
        sourceVersion: request.sourceVersion,

        // 환경 오버라이드
        computeTypeOverride: computeType,
        imageOverride: request.image || CODEBUILD_CONSTANTS.DEFAULT_IMAGE,
        timeoutInMinutesOverride:
          request.timeoutInMinutes ||
          CODEBUILD_CONSTANTS.DEFAULT_TIMEOUT_MINUTES,

        // 환경변수 오버라이드
        environmentVariablesOverride: pipelineEnvVars.map((env) => ({
          name: env.name,
          value: env.value,
          type: env.type || 'PLAINTEXT',
        })),

        // buildspec 오버라이드 (선택)
        buildspecOverride: request.buildspecOverride,
      });

      const response = await this.codeBuildClient.send(command);

      if (!response.build) {
        throw new BadRequestException(
          CODEBUILD_ERROR_MESSAGES.BUILD_START_FAILED,
        );
      }

      this.logger.log(
        `빌드 시작됨: ${response.build.id}, Status: ${response.build.buildStatus}`,
      );

      return {
        buildId: response.build.id!,
        status: response.build.buildStatus!,
        projectName: response.build.projectName!,
        pipelineId: request.pipelineId,
        pipelineType: request.pipelineType,
        environment: request.environment,
        sourceVersion: response.build.sourceVersion,
        startTime: response.build.startTime,
        endTime: response.build.endTime,
        logGroup: response.build.logs?.cloudWatchLogs?.groupName,
        logStream: response.build.logs?.cloudWatchLogs?.streamName,
      };
    } catch (error) {
      this.logger.error('빌드 시작 실패', error);
      this.handleAWSError(error);
      throw error;
    }
  }

  /**
   * 빌드 상태 조회
   */
  async getBuildStatus(buildId: string): Promise<BuildStatusResponseDto> {
    try {
      this.logger.log(`빌드 상태 조회: ${buildId}`);

      const command = new BatchGetBuildsCommand({
        ids: [buildId],
      });

      const response = await this.codeBuildClient.send(command);

      if (!response.builds || response.builds.length === 0) {
        throw new NotFoundException(CODEBUILD_ERROR_MESSAGES.BUILD_NOT_FOUND);
      }

      const build = response.builds[0];

      // 환경변수에서 파이프라인 정보 추출
      const pipelineId =
        this.extractEnvironmentVariable(build, 'PIPELINE_ID') || 'unknown';
      const pipelineType =
        this.extractEnvironmentVariable(build, 'PIPELINE_TYPE') || 'unknown';
      const environment =
        this.extractEnvironmentVariable(build, 'ENVIRONMENT') || 'unknown';

      // 진행률 계산 (간단한 로직)
      const progressPercent = this.calculateProgress(build.buildStatus!);

      return {
        buildId: build.id!,
        status: build.buildStatus!,
        currentPhase: build.currentPhase,
        progressPercent,
        projectName: build.projectName!,
        pipelineInfo: {
          pipelineId,
          pipelineType,
          environment,
        },
        sourceInfo: build.source
          ? {
              version: build.sourceVersion || 'unknown',
              type: build.source.type || 'GITHUB',
              location: build.source.location,
            }
          : undefined,
        timeInfo: {
          startTime: build.startTime,
          endTime: build.endTime,
          durationInSeconds: this.calculateDuration(
            build.startTime,
            build.endTime,
          ),
        },
        logInfo: build.logs?.cloudWatchLogs
          ? {
              groupName: build.logs.cloudWatchLogs.groupName!,
              streamName: build.logs.cloudWatchLogs.streamName!,
            }
          : undefined,
        artifacts: build.artifacts
          ? [
              {
                location: build.artifacts.location || '',
                type: 'S3',
              },
            ]
          : undefined,
        errorInfo:
          build.buildStatus === 'FAILED'
            ? {
                message: '빌드가 실패했습니다',
                type: 'BUILD_FAILED',
              }
            : undefined,
      };
    } catch (error) {
      this.logger.error('빌드 상태 조회 실패', error);
      this.handleAWSError(error);
      throw error;
    }
  }

  /**
   * 빌드 중단
   */
  async stopBuild(
    buildId: string,
  ): Promise<{ buildId: string; status: string }> {
    try {
      this.logger.log(`빌드 중단: ${buildId}`);

      const command = new StopBuildCommand({
        id: buildId,
      });

      const response = await this.codeBuildClient.send(command);

      if (!response.build) {
        throw new BadRequestException(
          CODEBUILD_ERROR_MESSAGES.BUILD_STOP_FAILED,
        );
      }

      this.logger.log(
        `빌드 중단됨: ${buildId}, Status: ${response.build.buildStatus}`,
      );

      return {
        buildId: response.build.id!,
        status: response.build.buildStatus!,
      };
    } catch (error) {
      this.logger.error('빌드 중단 실패', error);
      this.handleAWSError(error);
      throw error;
    }
  }

  /**
   * 프로젝트의 빌드 목록 조회
   */
  async getBuildsForProject(
    projectName: string,
    limit: number = 10,
  ): Promise<string[]> {
    try {
      const command = new ListBuildsForProjectCommand({
        projectName,
        sortOrder: 'DESCENDING',
      });

      const response = await this.codeBuildClient.send(command);
      return response.ids?.slice(0, limit) || [];
    } catch (error) {
      this.logger.error('프로젝트 빌드 목록 조회 실패', error);
      this.handleAWSError(error);
      throw error;
    }
  }

  /**
   * AWS 에러 핸들링
   */
  private handleAWSError(error: unknown): void {
    const awsError = error as { name?: string };
    if (awsError.name === 'ResourceNotFoundException') {
      throw new NotFoundException(CODEBUILD_ERROR_MESSAGES.PROJECT_NOT_FOUND);
    }
    if (awsError.name === 'InvalidInputException') {
      throw new BadRequestException(
        CODEBUILD_ERROR_MESSAGES.INVALID_PARAMETERS,
      );
    }
    if (
      awsError.name === 'UnauthorizedException' ||
      awsError.name === 'AccessDeniedException'
    ) {
      throw new BadRequestException(CODEBUILD_ERROR_MESSAGES.PERMISSION_DENIED);
    }
  }

  /**
   * 빌드에서 환경변수 추출
   */
  private extractEnvironmentVariable(
    build: Build,
    name: string,
  ): string | undefined {
    return build.environment?.environmentVariables?.find(
      (env) => env.name === name,
    )?.value;
  }

  /**
   * 빌드 진행률 계산
   */
  private calculateProgress(status: string): number {
    const progressMap: Record<string, number> = {
      SUBMITTED: 10,
      QUEUED: 20,
      PROVISIONING: 30,
      DOWNLOAD_SOURCE: 40,
      INSTALL: 50,
      PRE_BUILD: 60,
      BUILD: 70,
      POST_BUILD: 80,
      UPLOAD_ARTIFACTS: 90,
      FINALIZING: 95,
      SUCCEEDED: 100,
      FAILED: 100,
      FAULT: 100,
      TIMED_OUT: 100,
      IN_PROGRESS: 50,
      STOPPED: 100,
    };

    return progressMap[status] || 0;
  }

  /**
   * 빌드 소요시간 계산
   */
  private calculateDuration(
    startTime?: Date,
    endTime?: Date,
  ): number | undefined {
    if (!startTime) return undefined;
    const end = endTime || new Date();
    return Math.floor((end.getTime() - startTime.getTime()) / 1000);
  }
}
