import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BuildSpecConverterService } from './buildspec-converter.service';
import type { PipelineFlowData } from '../dto/common';

describe('BuildSpecConverterService', () => {
  let service: BuildSpecConverterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BuildSpecConverterService],
    }).compile();

    service = module.get<BuildSpecConverterService>(BuildSpecConverterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('convertToBuildSpec', () => {
    it('should convert simple pipeline data to buildspec.yaml', () => {
      const pipelineData: PipelineFlowData = {
        nodes: [
          {
            id: 'build-1',
            type: 'custom',
            position: { x: 100, y: 100 },
            data: {
              label: 'Build Step',
              stepType: 'BUILD',
              commands: ['npm run build', 'npm test'],
            },
          },
        ],
        edges: [],
      };

      const result = service.convertToBuildSpec(pipelineData);

      expect(result).toContain("version: '0.2'");
      expect(result).toContain('phases:');
      expect(result).toContain('build:');
      expect(result).toContain('- npm run build');
      expect(result).toContain('- npm test');
    });

    it('should handle environment variables', () => {
      const pipelineData: PipelineFlowData = {
        nodes: [
          {
            id: 'env-1',
            type: 'custom',
            position: { x: 100, y: 100 },
            data: {
              label: 'Environment',
              stepType: 'ENV',
              env: {
                NODE_ENV: 'production',
                API_URL: 'https://api.example.com',
              },
            },
          },
        ],
        edges: [],
      };

      const result = service.convertToBuildSpec(pipelineData);

      expect(result).toContain('env:');
      expect(result).toContain('variables:');
      expect(result).toContain('NODE_ENV: production');
      expect(result).toContain('API_URL: https://api.example.com');
    });

    it('should handle artifacts configuration', () => {
      const pipelineData: PipelineFlowData = {
        nodes: [
          {
            id: 'artifacts-1',
            type: 'custom',
            position: { x: 100, y: 100 },
            data: {
              label: 'Artifacts',
              stepType: 'ARTIFACTS',
              artifacts: {
                files: ['dist/**/*', 'package.json'],
                name: 'MyArtifacts',
                baseDirectory: 'dist',
              },
            },
          },
        ],
        edges: [],
      };

      const result = service.convertToBuildSpec(pipelineData);

      expect(result).toContain('artifacts:');
      expect(result).toContain('files:');
      expect(result).toContain('- dist/**/*');
      expect(result).toContain('- package.json');
      expect(result).toContain('name: MyArtifacts');
      expect(result).toContain('base-directory: dist');
    });

    it('should throw error for empty pipeline data', () => {
      expect(() =>
        service.convertToBuildSpec({ nodes: [], edges: [] }),
      ).toThrow(BadRequestException);
    });

    it('should throw error for null pipeline data', () => {
      expect(() =>
        service.convertToBuildSpec(null as unknown as PipelineFlowData),
      ).toThrow(BadRequestException);
    });
  });

  describe('convertFromBuildSpec', () => {
    it('should convert buildspec.yaml to pipeline data', () => {
      const buildSpecYaml = `
version: '0.2'
env:
  variables:
    NODE_ENV: production
phases:
  install:
    commands:
      - npm install
  build:
    commands:
      - npm run build
artifacts:
  files:
    - 'dist/**/*'
  name: BuildOutput
      `;

      const result = service.convertFromBuildSpec(buildSpecYaml);

      expect(result.nodes).toBeDefined();
      expect(result.nodes.length).toBeGreaterThan(0);
      expect(result.edges).toBeDefined();

      // Check for ENV node
      const envNode = result.nodes.find(
        (node) => node.data?.stepType === 'ENV',
      );
      expect(envNode).toBeDefined();
      expect(envNode?.data?.env?.NODE_ENV).toBe('production');

      // Check for INSTALL node
      const installNode = result.nodes.find(
        (node) => node.data?.stepType === 'INSTALL',
      );
      expect(installNode).toBeDefined();
      expect(installNode?.data?.commands).toContain('npm install');

      // Check for BUILD node
      const buildNode = result.nodes.find(
        (node) => node.data?.stepType === 'BUILD',
      );
      expect(buildNode).toBeDefined();
      expect(buildNode?.data?.commands).toContain('npm run build');

      // Check for ARTIFACTS node
      const artifactsNode = result.nodes.find(
        (node) => node.data?.stepType === 'ARTIFACTS',
      );
      expect(artifactsNode).toBeDefined();
      expect(artifactsNode?.data?.artifacts?.files).toContain('dist/**/*');
      expect(artifactsNode?.data?.artifacts?.name).toBe('BuildOutput');
    });

    it('should throw error for invalid YAML', () => {
      const invalidYaml = 'invalid: yaml: content: [';

      expect(() => {
        service.convertFromBuildSpec(invalidYaml);
      }).toThrow(BadRequestException);
    });
  });
});
