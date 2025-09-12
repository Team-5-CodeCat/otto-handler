import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  CreatePipelineRequestDto,
  UpdatePipelineRequestDto,
  PipelineResponseDto,
  PipelineDetailResponseDto,
  PipelineListResponseDto,
} from '../dto';
import type { PipelineFlowData } from '../dto/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class PipelineService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * JsonValue를 PipelineFlowData로 안전하게 변환
   */
  private safeParsePipelineData(
    jsonValue: Prisma.JsonValue,
  ): PipelineFlowData | null {
    if (!jsonValue || typeof jsonValue !== 'object') {
      return null;
    }

    try {
      // 기본 구조 검증
      const data = jsonValue as Record<string, unknown>;
      if (
        data &&
        typeof data === 'object' &&
        Array.isArray(data.nodes) &&
        Array.isArray(data.edges)
      ) {
        return data as unknown as PipelineFlowData;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 파이프라인 생성
   */
  async create(
    userId: string,
    createPipelineDto: CreatePipelineRequestDto,
  ): Promise<PipelineResponseDto> {
    // 프로젝트 소유권 확인
    const project = await this.prisma.project.findFirst({
      where: {
        projectId: createPipelineDto.projectId,
        userId: userId,
        isActive: true,
      },
    });

    if (!project) {
      throw new NotFoundException(
        '프로젝트를 찾을 수 없거나 접근 권한이 없습니다.',
      );
    }

    // 동일한 프로젝트 내에서 파이프라인 이름 중복 확인
    const existingPipeline = await this.prisma.pipeline.findFirst({
      where: {
        projectId: createPipelineDto.projectId,
        name: createPipelineDto.name,
      },
    });

    if (existingPipeline) {
      throw new BadRequestException(
        '동일한 프로젝트 내에 같은 이름의 파이프라인이 이미 존재합니다.',
      );
    }

    const pipeline = await this.prisma.pipeline.create({
      data: {
        name: createPipelineDto.name,
        description: createPipelineDto.description || null,
        projectId: createPipelineDto.projectId,
        pipelineData:
          createPipelineDto.pipelineData as unknown as Prisma.InputJsonValue,
        isActive: createPipelineDto.isActive ?? true,
      },
    });

    return this.mapToPipelineResponse(pipeline);
  }

  /**
   * 사용자의 파이프라인 목록 조회 (페이징)
   */
  async findAllByUser(
    userId: string,
    page: number = 1,
    limit: number = 20,
    projectId?: string,
  ): Promise<PipelineListResponseDto> {
    const offset = (page - 1) * limit;

    const whereClause = {
      project: {
        userId: userId,
        isActive: true,
      },
      isActive: true,
      ...(projectId && { projectId }),
    };

    const [pipelines, total] = await Promise.all([
      this.prisma.pipeline.findMany({
        where: whereClause,
        include: {
          project: {
            select: {
              projectId: true,
              name: true,
              githubRepoName: true,
              githubOwner: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip: offset,
        take: limit,
      }),
      this.prisma.pipeline.count({
        where: whereClause,
      }),
    ]);

    return {
      pipelines: pipelines.map((p) => this.mapToPipelineResponse(p)),
      total,
      page,
      limit,
    };
  }

  /**
   * 파이프라인 상세 조회
   */
  async findOne(
    userId: string,
    pipelineId: string,
  ): Promise<PipelineDetailResponseDto> {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: {
        pipelineId,
        project: {
          userId: userId,
          isActive: true,
        },
        isActive: true,
      },
      include: {
        project: {
          select: {
            projectId: true,
            name: true,
            githubRepoName: true,
            githubOwner: true,
          },
        },
        executions: {
          select: {
            executionId: true,
            status: true,
            startedAt: true,
            completedAt: true,
            duration: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
      },
    });

    if (!pipeline) {
      throw new NotFoundException(
        '파이프라인을 찾을 수 없거나 접근 권한이 없습니다.',
      );
    }

    return {
      ...this.mapToPipelineResponse(pipeline),
      project: (pipeline as any).project || null,
      recentExecutions: (pipeline as any).executions || [],
    };
  }

  /**
   * 파이프라인 수정
   */
  async update(
    userId: string,
    pipelineId: string,
    updatePipelineDto: UpdatePipelineRequestDto,
  ): Promise<PipelineResponseDto> {
    // 파이프라인 소유권 확인
    const existingPipeline = await this.prisma.pipeline.findFirst({
      where: {
        pipelineId,
        project: {
          userId: userId,
          isActive: true,
        },
        isActive: true,
      },
      include: {
        project: true,
      },
    });

    if (!existingPipeline) {
      throw new NotFoundException(
        '파이프라인을 찾을 수 없거나 접근 권한이 없습니다.',
      );
    }

    // 이름 변경 시 중복 확인
    if (
      updatePipelineDto.name &&
      updatePipelineDto.name !== existingPipeline.name
    ) {
      const duplicatePipeline = await this.prisma.pipeline.findFirst({
        where: {
          projectId: existingPipeline.projectId,
          name: updatePipelineDto.name,
          pipelineId: {
            not: pipelineId,
          },
        },
      });

      if (duplicatePipeline) {
        throw new BadRequestException(
          '동일한 프로젝트 내에 같은 이름의 파이프라인이 이미 존재합니다.',
        );
      }
    }

    const updatedPipeline = await this.prisma.pipeline.update({
      where: { pipelineId },
      data: {
        ...(updatePipelineDto.name && { name: updatePipelineDto.name }),
        ...(updatePipelineDto.description !== undefined && {
          description: updatePipelineDto.description,
        }),
        ...(updatePipelineDto.pipelineData !== undefined && {
          pipelineData:
            updatePipelineDto.pipelineData as unknown as Prisma.InputJsonValue,
        }),
        ...(updatePipelineDto.isActive !== undefined && {
          isActive: updatePipelineDto.isActive,
        }),
      },
    });

    return this.mapToPipelineResponse(updatedPipeline);
  }

  /**
   * 파이프라인 삭제 (소프트 삭제)
   */
  async remove(
    userId: string,
    pipelineId: string,
  ): Promise<{ message: string }> {
    // 파이프라인 소유권 확인
    const pipeline = await this.prisma.pipeline.findFirst({
      where: {
        pipelineId,
        project: {
          userId: userId,
          isActive: true,
        },
        isActive: true,
      },
    });

    if (!pipeline) {
      throw new NotFoundException(
        '파이프라인을 찾을 수 없거나 접근 권한이 없습니다.',
      );
    }

    // 실행 중인 파이프라인이 있는지 확인
    const runningExecution = await this.prisma.pipelineExecution.findFirst({
      where: {
        pipelineId,
        status: {
          in: ['PENDING', 'QUEUED', 'RUNNING'],
        },
      },
    });

    if (runningExecution) {
      throw new BadRequestException(
        '실행 중인 파이프라인은 삭제할 수 없습니다.',
      );
    }

    // 소프트 삭제 (isActive = false)
    await this.prisma.pipeline.update({
      where: { pipelineId },
      data: { isActive: false },
    });

    return { message: '파이프라인이 성공적으로 삭제되었습니다.' };
  }

  /**
   * 파이프라인 활성화/비활성화 토글
   */
  async toggleActive(
    userId: string,
    pipelineId: string,
  ): Promise<PipelineResponseDto> {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: {
        pipelineId,
        project: {
          userId: userId,
          isActive: true,
        },
      },
    });

    if (!pipeline) {
      throw new NotFoundException(
        '파이프라인을 찾을 수 없거나 접근 권한이 없습니다.',
      );
    }

    const updatedPipeline = await this.prisma.pipeline.update({
      where: { pipelineId },
      data: { isActive: !pipeline.isActive },
    });

    return this.mapToPipelineResponse(updatedPipeline);
  }

  /**
   * 프로젝트의 활성 파이프라인 개수 조회
   */
  async countByProject(userId: string, projectId: string): Promise<number> {
    // 프로젝트 소유권 확인
    const project = await this.prisma.project.findFirst({
      where: {
        projectId,
        userId: userId,
        isActive: true,
      },
    });

    if (!project) {
      throw new NotFoundException(
        '프로젝트를 찾을 수 없거나 접근 권한이 없습니다.',
      );
    }

    return this.prisma.pipeline.count({
      where: {
        projectId,
        isActive: true,
      },
    });
  }

  /**
   * Prisma Pipeline 객체를 PipelineResponseDto로 변환
   */
  private mapToPipelineResponse(pipeline: any): PipelineResponseDto {
    return {
      pipelineId: pipeline.pipelineId,
      name: pipeline.name,
      description: pipeline.description,
      isActive: pipeline.isActive,
      projectId: pipeline.projectId,
      pipelineData: this.safeParsePipelineData(pipeline.pipelineData || pipeline.visualConfig || null),
      createdAt: pipeline.createdAt,
      updatedAt: pipeline.updatedAt,
    };
  }
}
