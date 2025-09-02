#!/bin/bash

# Otto Handler 개발 환경 편의 스크립트

# 컨테이너 접속
shell() {
    echo "🔌 컨테이너에 접속합니다..."
    docker compose exec app sh
}

# 개발 서버 시작 (컨테이너 내부에서)
dev() {
    echo "🚀 개발 서버를 시작합니다..."
    pnpm run start:dev
}

# 빌드
build() {
    echo "🔨 애플리케이션을 빌드합니다..."
    pnpm run build
}

# 테스트 실행
test() {
    echo "🧪 테스트를 실행합니다..."
    pnpm run test
}

# 린트 실행
lint() {
    echo "🔍 코드 스타일을 검사합니다..."
    pnpm run lint
}

# 로그 보기
logs() {
    echo "📋 애플리케이션 로그를 확인합니다..."
    docker compose logs app -f
}

# 도움말
help() {
    echo "Otto Handler 개발 스크립트"
    echo ""
    echo "사용법:"
    echo "  ./dev.sh <명령어>"
    echo ""
    echo "명령어:"
    echo "  shell    - 컨테이너에 접속 (개발 작업 시작)"
    echo "  dev      - 개발 서버 시작 (컨테이너 내부에서 실행)"
    echo "  build    - 애플리케이션 빌드"
    echo "  test     - 테스트 실행"
    echo "  lint     - 코드 스타일 검사"
    echo "  logs     - 실시간 로그 확인"
    echo ""
    echo "일반적인 개발 워크플로우:"
    echo "  1. docker compose up -d        # 서비스 시작"
    echo "  2. ./dev.sh shell              # 컨테이너 접속"
    echo "  3. pnpm run start:dev          # 개발 서버 시작"
}

# 메인 로직
case $1 in
    shell)
        shell
        ;;
    dev)
        dev
        ;;
    build)
        build
        ;;
    test)
        test
        ;;
    lint)
        lint
        ;;
    logs)
        logs
        ;;
    help|--help|-h|"")
        help
        ;;
    *)
        echo "❌ 알 수 없는 명령어: $1"
        echo "사용 가능한 명령어를 보려면 './dev.sh help'를 실행하세요."
        exit 1
        ;;
esac