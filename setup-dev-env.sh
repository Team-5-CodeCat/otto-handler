#!/bin/bash

# Otto Handler 개발환경 설정 스크립트
echo "🚀 Otto Handler 개발환경 설정을 시작합니다..."

# 개발자 이름 입력받기
read -p "개발자 이름을 입력하세요 (한진우/장준영/이지윤/고민지/김보아/유호준): " DEV_NAME

# 개발자 이름 검증 및 번호 매핑
case "$DEV_NAME" in
    "한진우")
        DEV_NUM=1
        DEV_ID="hanjinwoo"
        ;;
    "장준영")
        DEV_NUM=2
        DEV_ID="jangjunyeong"
        ;;
    "이지윤")
        DEV_NUM=3
        DEV_ID="leejiyun"
        ;;
    "고민지")
        DEV_NUM=4
        DEV_ID="gominji"
        ;;
    "김보아")
        DEV_NUM=5
        DEV_ID="kimboa"
        ;;
    "유호준")
        DEV_NUM=6
        DEV_ID="yoohojun"
        ;;
    *)
        echo "❌ 오류: 올바른 개발자 이름을 입력해주세요."
        echo "   입력 가능한 이름: 한진우, 장준영, 이지윤, 고민지, 김보아, 유호준"
        exit 1
        ;;
esac

# 포트 계산
POSTGRES_PORT=$((5431 + $DEV_NUM))
REDIS_PORT=$((6378 + $DEV_NUM))
APP_PORT=$((3999 + $DEV_NUM))

echo "📋 $DEV_NAME 개발환경 설정:"
echo "   - PostgreSQL: $POSTGRES_PORT"
echo "   - Redis: $REDIS_PORT"
echo "   - NestJS: $APP_PORT"
echo ""

# 기존 컨테이너 상태 확인
echo "🔍 기존 컨테이너 상태를 확인합니다..."

# PostgreSQL 컨테이너 상태 확인
POSTGRES_CONTAINER_ID=$(docker ps -aq -f name="postgres-$DEV_ID")
if [ ! -z "$POSTGRES_CONTAINER_ID" ]; then
    POSTGRES_STATUS=$(docker inspect -f '{{.State.Status}}' "$POSTGRES_CONTAINER_ID")
    if [ "$POSTGRES_STATUS" = "running" ]; then
        echo "✅ PostgreSQL 컨테이너가 이미 실행 중입니다 (포트: $POSTGRES_PORT)"
        POSTGRES_RUNNING=true
    else
        echo "⚠️  PostgreSQL 컨테이너가 존재하지만 중지되어 있습니다. 재시작합니다..."
        docker start "$POSTGRES_CONTAINER_ID"
        if [ $? -eq 0 ]; then
            echo "✅ PostgreSQL 컨테이너 재시작 완료 (포트: $POSTGRES_PORT)"
            POSTGRES_RUNNING=true
        else
            echo "❌ PostgreSQL 컨테이너 재시작 실패, 기존 컨테이너를 삭제하고 새로 생성합니다..."
            docker rm -f "$POSTGRES_CONTAINER_ID"
            POSTGRES_RUNNING=false
        fi
    fi
else
    echo "📦 PostgreSQL 컨테이너가 존재하지 않습니다. 새로 생성합니다..."
    POSTGRES_RUNNING=false
fi

# Redis 컨테이너 상태 확인 (otto-handler와 ottoscaler에서 공유)
REDIS_CONTAINER_NAME="redis-$DEV_ID"
OTTOSCALER_REDIS_NAME="ottoscaler-redis-$DEV_ID"
echo "🔍 Redis 컨테이너 상태 확인 중... ($REDIS_CONTAINER_NAME 또는 $OTTOSCALER_REDIS_NAME)"

# otto-handler용 Redis 컨테이너 확인
if docker ps --filter "name=$REDIS_CONTAINER_NAME" --filter "status=running" -q | grep -q .; then
    echo "✅ otto-handler Redis 컨테이너가 이미 실행 중입니다 (포트: $REDIS_PORT)"
    REDIS_RUNNING=true
    REDIS_CONTAINER_NAME="$REDIS_CONTAINER_NAME"
# ottoscaler Redis 컨테이너 확인 (포트가 같은 경우 재사용)
elif docker ps --filter "name=$OTTOSCALER_REDIS_NAME" --filter "status=running" -q | grep -q .; then
    # ottoscaler Redis의 포트 확인
    EXISTING_PORT=$(docker port "$OTTOSCALER_REDIS_NAME" 6379/tcp | cut -d: -f2)
    if [ "$EXISTING_PORT" = "$REDIS_PORT" ]; then
        echo "✅ ottoscaler Redis 컨테이너를 재사용합니다 (포트: $REDIS_PORT)"
        echo "   → otto-handler와 ottoscaler에서 공유하여 사용합니다"
        REDIS_RUNNING=true
        REDIS_CONTAINER_NAME="$OTTOSCALER_REDIS_NAME"
    else
        echo "⚠️  ottoscaler Redis가 다른 포트($EXISTING_PORT)를 사용하고 있습니다."
        echo "   → otto-handler 전용 Redis 컨테이너를 새로 생성합니다..."
        REDIS_RUNNING=false
    fi
# 중지된 otto-handler Redis 컨테이너 확인 및 재시작
elif docker ps -a --filter "name=$REDIS_CONTAINER_NAME" -q | grep -q .; then
    echo "⚠️  otto-handler Redis 컨테이너가 중지되어 있습니다. 재시작을 시도합니다..."
    docker start "$REDIS_CONTAINER_NAME"
    if [ $? -eq 0 ]; then
        echo "✅ Redis 컨테이너 재시작 완료 (포트: $REDIS_PORT)"
        REDIS_RUNNING=true
        REDIS_CONTAINER_NAME="$REDIS_CONTAINER_NAME"
    else
        echo "❌ Redis 컨테이너 재시작 실패 (포트 충돌 가능성), 기존 컨테이너를 삭제하고 새로 생성합니다..."
        docker rm -f "$REDIS_CONTAINER_NAME"
        REDIS_RUNNING=false
    fi
else
    echo "📦 Redis 컨테이너가 존재하지 않습니다. 새로 생성합니다..."
    REDIS_RUNNING=false
fi

echo ""

# Docker 컨테이너 실행 결정
if [ "$POSTGRES_RUNNING" = true ] && [ "$REDIS_RUNNING" = true ]; then
    echo "✅ $DEV_NAME 개발자의 모든 컨테이너가 이미 실행 중입니다."
    echo "   → 컨테이너 생성 단계를 건너뛰고 .env.dev 파일 생성으로 진행합니다."
    SKIP_CONTAINER_SETUP=true
else
    echo "🐳 $DEV_NAME 개발자의 필요한 Docker 컨테이너를 실행합니다..."
    SKIP_CONTAINER_SETUP=false
fi

# PostgreSQL 컨테이너 생성 (필요한 경우에만)
if [ "$SKIP_CONTAINER_SETUP" = false ] && [ "$POSTGRES_RUNNING" = false ]; then
    echo "🐘 PostgreSQL 컨테이너를 생성합니다..."
    docker run -d \
        --name "postgres-$DEV_ID" \
        -p "$POSTGRES_PORT:5432" \
        -e POSTGRES_PASSWORD=password \
        -e POSTGRES_DB=otto_handler \
        postgres:15

    if [ $? -eq 0 ]; then
        echo "✅ PostgreSQL 컨테이너 실행 완료 (포트: $POSTGRES_PORT)"
        # 컨테이너가 완전히 시작될 때까지 잠시 대기
        echo "⏳ PostgreSQL 초기화를 위해 5초 대기합니다..."
        sleep 5
    else
        echo "❌ PostgreSQL 컨테이너 실행 실패"
        exit 1
    fi
elif [ "$POSTGRES_RUNNING" = true ]; then
    echo "⏭️  PostgreSQL 컨테이너는 이미 실행 중이므로 건너뜁니다."
fi

# Redis 컨테이너 생성 (필요한 경우에만)
if [ "$SKIP_CONTAINER_SETUP" = false ] && [ "$REDIS_RUNNING" = false ]; then
    echo "🔴 Redis 컨테이너를 생성합니다..."
    echo "   → otto-handler와 ottoscaler에서 공유하여 사용됩니다"
    docker run -d \
        --name "$REDIS_CONTAINER_NAME" \
        -p "$REDIS_PORT:6379" \
        redis:7-alpine redis-server --appendonly yes

    if [ $? -eq 0 ]; then
        echo "✅ Redis 컨테이너 실행 완료 (포트: $REDIS_PORT)"
        echo "   → 다른 프로젝트(ottoscaler)에서도 이 Redis를 사용할 수 있습니다"
        # 컨테이너가 완전히 시작될 때까지 잠시 대기
        echo "⏳ Redis 초기화를 위해 3초 대기합니다..."
        sleep 3
    else
        echo "❌ Redis 컨테이너 실행 실패"
        exit 1
    fi
elif [ "$REDIS_RUNNING" = true ]; then
    echo "⏭️  Redis 컨테이너는 이미 실행 중이므로 건너뜁니다."
fi

# .env.dev 파일 생성
echo "📝 .env.dev 파일을 생성합니다..."

# .env.example 파일이 존재하는지 확인
if [ ! -f .env.example ]; then
    echo "❌ .env.example 파일이 존재하지 않습니다."
    exit 1
fi

# .env.example 파일을 복사하여 .env.dev 생성
cp .env.example .env.dev

# sed를 사용하여 개발자별 설정으로 값 변경
sed -i "s/PORT=4000/PORT=$APP_PORT/" .env.dev
sed -i "s/COOKIE_SECRET=your-cookie-secret-key/COOKIE_SECRET=$DEV_ID-cookie-secret-key-for-development/" .env.dev
sed -i "s|DATABASE_URL=postgresql://postgres:password@localhost:5432/otto_handler|DATABASE_URL=\"postgresql://postgres:password@localhost:$POSTGRES_PORT/otto_handler?schema=public\"|" .env.dev
sed -i "s|REDIS_URL=redis://localhost:6379|REDIS_URL=redis://localhost:$REDIS_PORT|" .env.dev

# 개발자별 Frontend URL 설정 (Frontend 포트 계산)
FRONTEND_PORT=$((2999 + $DEV_NUM))
sed -i "s|FRONTEND_URL=http://localhost:3000|FRONTEND_URL=http://localhost:$FRONTEND_PORT|" .env.dev

# JWT 관련 개발자별 설정
sed -i "s/JWT_SECRET=jwt-secret-example/JWT_SECRET=$DEV_ID-jwt-secret-for-development/" .env.dev

# OTTOSCALER gRPC URL 설정 (개발자별 포트)
GRPC_PORT=$((50050 + $DEV_NUM))
sed -i "s|OTTOSCALER_GRPC_URL=localhost:50051|OTTOSCALER_GRPC_URL=localhost:$GRPC_PORT|" .env.dev

# GitHub 관련 설정 (개발자별 webhook secret)
sed -i "s/OTTO_GITHUB_WEBHOOK_SECRET=otto-github-webhook-secret-example/OTTO_GITHUB_WEBHOOK_SECRET=$DEV_ID-github-webhook-secret/" .env.dev

# 개발자 이름을 주석에 추가
sed -i "1i# $DEV_NAME Environment Configuration" .env.dev

echo "✅ .env.dev 파일 생성 완료 (.env.example 기반)"

# 최종 컨테이너 상태 확인
echo ""
echo "🔍 최종 컨테이너 상태 확인..."

# PostgreSQL 연결 테스트 (새로 생성된 경우에만 대기 시간 필요)
echo -n "🐘 PostgreSQL 연결 테스트: "
if [ "$POSTGRES_RUNNING" = true ]; then
    # 이미 실행 중이던 컨테이너는 즉시 테스트
    timeout 3 docker exec "postgres-$DEV_ID" pg_isready -h localhost -p 5432 >/dev/null 2>&1
else
    # 새로 생성된 컨테이너는 좀 더 시간을 줌
    timeout 10 docker exec "postgres-$DEV_ID" pg_isready -h localhost -p 5432 >/dev/null 2>&1
fi
if [ $? -eq 0 ]; then
    echo "✅ 성공"
else
    echo "❌ 실패 (컨테이너가 아직 초기화 중일 수 있습니다)"
fi

# Redis 연결 테스트
echo -n "🔴 Redis 연결 테스트: "
timeout 5 docker exec "$REDIS_CONTAINER_NAME" redis-cli ping >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ 성공 (otto-handler와 ottoscaler에서 공유)"
else
    echo "❌ 실패"
fi

echo ""
echo "🎉 개발환경 설정이 완료되었습니다!"
echo ""
echo "다음 단계:"
echo "1. pnpm install"
echo "2. pnpm prisma migrate dev"
echo "3. pnpm run start:dev"
echo ""
echo "🌐 애플리케이션 URL: http://localhost:$APP_PORT"
echo "📚 Swagger 문서: http://localhost:$APP_PORT/docs"
echo ""
echo "컨테이너 관리 명령어:"
echo "  상태 확인: docker ps -f name=$DEV_ID"
echo "  중지: docker stop postgres-$DEV_ID $REDIS_CONTAINER_NAME"
echo "  재시작: docker restart postgres-$DEV_ID $REDIS_CONTAINER_NAME"
echo "  삭제: docker rm postgres-$DEV_ID $REDIS_CONTAINER_NAME"
echo ""
echo "⚠️  Redis 주의사항:"
echo "  - Redis 컨테이너($REDIS_CONTAINER_NAME)는 ottoscaler에서도 사용됩니다"
echo "  - 삭제 시 ottoscaler 개발환경에도 영향을 줄 수 있습니다"