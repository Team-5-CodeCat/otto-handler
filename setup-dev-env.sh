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

# Redis 컨테이너 상태 확인
REDIS_CONTAINER_ID=$(docker ps -aq -f name="redis-$DEV_ID")
if [ ! -z "$REDIS_CONTAINER_ID" ]; then
    REDIS_STATUS=$(docker inspect -f '{{.State.Status}}' "$REDIS_CONTAINER_ID")
    if [ "$REDIS_STATUS" = "running" ]; then
        echo "✅ Redis 컨테이너가 이미 실행 중입니다 (포트: $REDIS_PORT)"
        REDIS_RUNNING=true
    else
        echo "⚠️  Redis 컨테이너가 존재하지만 중지되어 있습니다. 재시작합니다..."
        docker start "$REDIS_CONTAINER_ID"
        if [ $? -eq 0 ]; then
            echo "✅ Redis 컨테이너 재시작 완료 (포트: $REDIS_PORT)"
            REDIS_RUNNING=true
        else
            echo "❌ Redis 컨테이너 재시작 실패, 기존 컨테이너를 삭제하고 새로 생성합니다..."
            docker rm -f "$REDIS_CONTAINER_ID"
            REDIS_RUNNING=false
        fi
    fi
else
    echo "📦 Redis 컨테이너가 존재하지 않습니다. 새로 생성합니다..."
    REDIS_RUNNING=false
fi

echo ""

# Docker 컨테이너 실행
if [ "$POSTGRES_RUNNING" = false ] || [ "$REDIS_RUNNING" = false ]; then
    echo "🐳 필요한 Docker 컨테이너를 실행합니다..."
else
    echo "✅ 모든 컨테이너가 이미 실행 중입니다."
fi

# PostgreSQL 컨테이너 생성 (필요한 경우에만)
if [ "$POSTGRES_RUNNING" = false ]; then
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
fi

# Redis 컨테이너 생성 (필요한 경우에만)
if [ "$REDIS_RUNNING" = false ]; then
    echo "🔴 Redis 컨테이너를 생성합니다..."
    docker run -d \
        --name "redis-$DEV_ID" \
        -p "$REDIS_PORT:6379" \
        redis:7-alpine

    if [ $? -eq 0 ]; then
        echo "✅ Redis 컨테이너 실행 완료 (포트: $REDIS_PORT)"
        # 컨테이너가 완전히 시작될 때까지 잠시 대기
        echo "⏳ Redis 초기화를 위해 3초 대기합니다..."
        sleep 3
    else
        echo "❌ Redis 컨테이너 실행 실패"
        exit 1
    fi
fi

# .env 파일 생성
echo "📝 .env 파일을 생성합니다..."

cat > .env << EOF
# $DEV_NAME Environment Configuration
PORT=$APP_PORT
NODE_ENV=development
COOKIE_SECRET=$DEV_ID-cookie-secret-key-for-development

# Database Configuration ($DEV_NAME PostgreSQL container)
DATABASE_URL="postgresql://postgres:password@localhost:$POSTGRES_PORT/otto_handler?schema=public"

# Redis Configuration ($DEV_NAME Redis container)
REDIS_URL=redis://localhost:$REDIS_PORT
EOF

echo "✅ .env 파일 생성 완료"

# 최종 컨테이너 상태 확인
echo ""
echo "🔍 최종 컨테이너 상태 확인..."

# PostgreSQL 연결 테스트
echo -n "🐘 PostgreSQL 연결 테스트: "
timeout 10 docker exec "postgres-$DEV_ID" pg_isready -h localhost -p 5432 >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ 성공"
else
    echo "❌ 실패 (컨테이너가 아직 초기화 중일 수 있습니다)"
fi

# Redis 연결 테스트  
echo -n "🔴 Redis 연결 테스트: "
timeout 5 docker exec "redis-$DEV_ID" redis-cli ping >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ 성공"
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
echo "  중지: docker stop postgres-$DEV_ID redis-$DEV_ID"
echo "  재시작: docker restart postgres-$DEV_ID redis-$DEV_ID"
echo "  삭제: docker rm postgres-$DEV_ID redis-$DEV_ID"