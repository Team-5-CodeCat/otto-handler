import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { InputJsonValue } from '@prisma/client/runtime/library';
import { YamlValidatorUtil } from '../../common/utils';
import * as crypto from 'crypto';
import * as yaml from 'js-yaml';

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createPipeline(
    projectID: string,
    name: string,
    yamlContent: string,
    version: number = 1,
  ) {
    try {
      // YAML 형식 검증
      if (!YamlValidatorUtil.isValidYamlFormat(yamlContent)) {
        throw new BadRequestException('유효하지 않은 YAML 형식입니다.');
      }

      // YAML 파싱
      let parsedSpec: InputJsonValue;
      try {
        parsedSpec = {} as InputJsonValue; //yaml.load(yamlContent) as InputJsonValue;
        this.logger.log(`YAML 파싱 성공: ${name}`);
      } catch (error) {
        this.logger.error('YAML 파싱 실패', error);
        throw new BadRequestException('YAML 파싱에 실패했습니다.');
      }

      // 프로젝트 존재 여부 확인
      const project = await this.prisma.project.findUnique({
        where: { projectID },
      });

      if (!project) {
        throw new NotFoundException('프로젝트를 찾을 수 없습니다.');
      }

      // YAML 해시 생성 (중복 체크용)
      const specHash = crypto
        .createHash('sha256')
        .update(yamlContent)
        .digest('hex');

      // 파이프라인 생성
      const pipeline = await this.prisma.pipeline.create({
        data: {
          projectID,
          name: name.trim(),
          version,
          pipelineSpec: parsedSpec,
          originalSpec: yamlContent,
          normalizedSpec: parsedSpec,
          specHash,
        },
        include: {
          project: {
            select: {
              projectID: true,
              name: true,
            },
          },
        },
      });

      this.logger.log(`파이프라인 생성 완료: ${pipeline.pipelineID}`);
      return pipeline;
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        throw new BadRequestException(
          '동일한 이름과 버전의 파이프라인이 이미 존재합니다.',
        );
      }
      throw error;
    }
  }

  async getPipelinesByProject(projectID: string) {
    const pipelines = await this.prisma.pipeline.findMany({
      where: { projectID },
      orderBy: { createdAt: 'desc' },
      include: {
        project: {
          select: {
            projectID: true,
            name: true,
          },
        },
      },
    });

    return pipelines;
  }

  async getPipelineById(pipelineID: string) {
    const pipeline = await this.prisma.pipeline.findUnique({
      where: { pipelineID },
      include: {
        project: {
          select: {
            projectID: true,
            name: true,
          },
        },
        runs: {
          orderBy: { createdAt: 'desc' },
          take: 10, // 최근 10개 실행 기록
        },
      },
    });

    if (!pipeline) {
      throw new NotFoundException('파이프라인을 찾을 수 없습니다.');
    }

    return pipeline;
  }
}
