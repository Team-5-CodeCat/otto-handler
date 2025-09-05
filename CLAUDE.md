# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development Workflow
```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma generate

# Run database migrations
pnpm prisma migrate dev

# Start development server with hot reload
pnpm run start:dev
```

### Building and Testing
```bash
# Build the application
pnpm run build

# Run linting
pnpm run lint

# Format code
pnpm run format

# Run tests
pnpm test
pnpm test:watch
pnpm test:cov
pnpm test:e2e

# Run specific test
jest path/to/test.spec.ts
```

### Database Operations
```bash
# Generate Prisma client (runs automatically on postinstall)
pnpm prisma generate

# Apply database migrations
pnpm prisma migrate dev

# View database in Prisma Studio
pnpm prisma studio

# Reset database (caution: deletes all data)
pnpm prisma migrate reset
```

### Package Management
```bash
# Install new package
pnpm add package-name

# Install dev dependency
pnpm add -D package-name
```

## Architecture Overview

This is a NestJS-based CI/CD automation platform called Otto Handler, designed for teams and developers who want simple, efficient build pipelines.

### Core Architecture Patterns

- **Framework**: NestJS with Fastify adapter for performance
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with refresh tokens, bcrypt for passwords
- **API Documentation**: Nestia for type-safe SDK generation and Swagger
- **Containerization**: Docker with Docker Compose for development
- **Type Safety**: TypeScript with typia for runtime validation

### Module Structure

The application follows NestJS modular architecture with domain-driven design:

- `auth/` - User authentication (JWT, bcrypt, refresh tokens)
- `user/` - User management 
- `projects/` - Project management and GitHub repository integration
- `pipelines/` - CI/CD pipeline definition and execution
- `environments/` - Environment configuration (language, deployment settings)
- `integrations/` - External service integrations (GitHub, AWS S3)
- `database/` - Prisma database configuration
- `common/` - Shared utilities, guards, interceptors, pipes

### Data Model Hierarchy

The database schema follows this hierarchy:
```
User -> Project -> Pipeline -> PipelineRun -> Job -> Log/Error/StatusEvent
```

Key entities:
- **User**: Authentication and project ownership
- **Project**: GitHub repository connections with webhook URLs
- **Pipeline**: Build/test/deploy workflow definitions (supports both YAML and block-based PaB approach)
- **Job**: Individual tasks (BUILD/TEST/DEPLOYMENT) with retry logic
- **Environment**: Language and deployment configuration

### Key Technologies Integration

- **Nestia**: Used for type-safe API client generation (`nestia.config.ts`)
- **Prisma**: Database schema with comprehensive enums for job status, languages, deployment environments
- **Docker**: Multi-stage development setup with volume mounting for hot reload
- **TypeScript**: Modern configuration with Nestia and typia transformers for runtime validation

### Development Environment

The project runs directly on EC2 instance:
- Direct Node.js execution with hot reload
- Local or external PostgreSQL for data persistence
- Optional Redis for caching/sessions
- Direct pnpm package management

### Pipeline Execution Flow

1. **Project Creation**: Link GitHub repositories to projects
2. **Pipeline Configuration**: Define build/test/deploy steps (YAML or block-based)
3. **Execution**: Trigger via webhook or manual execution
4. **Job Processing**: Build -> Test -> Deploy with comprehensive logging
5. **Artifact Storage**: S3 integration for build artifacts and logs

### Type Safety & Validation

- Runtime type validation using typia transformers
- Nestia generates type-safe SDK for frontend consumption
- Comprehensive DTOs for request/response validation
- Database schema-first approach with Prisma

## Development Notes

- The app runs on port 4000 (configurable via PORT env variable)
- Configure DATABASE_URL in .env for PostgreSQL connection
- Uses pnpm for package management (required Node.js 22+, pnpm 9+)
- Automatic Prisma client generation on install via postinstall script
- Global API prefix: `/api/v1` (excludes /health and /docs)
- Swagger documentation available at `/docs` in development mode
- Direct execution on EC2 instance without Docker containerization