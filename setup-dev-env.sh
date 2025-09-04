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
        DEV_ID="leejiyoon"
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

# Docker 컨테이너 실행
echo "🐳 Docker 컨테이너를 실행합니다..."

# PostgreSQL 컨테이너
docker run -d \
    --name "postgres-$DEV_ID" \
    -p "$POSTGRES_PORT:5432" \
    -e POSTGRES_PASSWORD=password \
    -e POSTGRES_DB=otto_handler \
    postgres:15

if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL 컨테이너 실행 완료 (포트: $POSTGRES_PORT)"
else
    echo "❌ PostgreSQL 컨테이너 실행 실패"
fi

# Redis 컨테이너
docker run -d \
    --name "redis-$DEV_ID" \
    -p "$REDIS_PORT:6379" \
    redis:7-alpine

if [ $? -eq 0 ]; then
    echo "✅ Redis 컨테이너 실행 완료 (포트: $REDIS_PORT)"
else
    echo "❌ Redis 컨테이너 실행 실패"
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
echo "  중지: docker stop postgres-$DEV_ID redis-$DEV_ID"
echo "  삭제: docker rm postgres-$DEV_ID redis-$DEV_ID"