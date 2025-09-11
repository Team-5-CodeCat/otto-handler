#!/bin/bash
set -e

echo "🚀 DevContainer 초기화를 시작합니다..."

# 출력 색상
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # 색상 없음

# 0. 권한 문제 해결 (가장 먼저 실행)
echo -e "${YELLOW}🔧 workspace 디렉토리 권한을 확인합니다...${NC}"
echo "  현재 사용자: $(whoami)"
echo "  workspace 소유자: $(ls -ld /workspace/otto-handler | awk '{print $3":"$4}')" 

# workspace 디렉토리 권한 수정이 필요한 경우
if [ ! -w /workspace/otto-handler ]; then
  echo -e "${RED}  ⚠️  workspace 디렉토리에 쓰기 권한이 없습니다.${NC}"
  echo "  권한을 수정합니다..."
  sudo chown -R $(whoami):$(id -gn) /workspace/otto-handler || {
    echo -e "${RED}  ❌ 권한 수정 실패. 수동으로 해결이 필요합니다.${NC}"
    exit 1
  }
  echo -e "${GREEN}  ✅ workspace 권한이 수정되었습니다${NC}"
else
  echo -e "${GREEN}  ✅ workspace 디렉토리 쓰기 권한이 있습니다${NC}"
fi

# node_modules 디렉토리가 있으면 권한 확인 및 수정
if [ -d /workspace/otto-handler/node_modules ]; then
  if [ ! -w /workspace/otto-handler/node_modules ]; then
    echo "  기존 node_modules 디렉토리 권한을 수정합니다..."
    sudo rm -rf /workspace/otto-handler/node_modules || true
    echo -e "${GREEN}  ✅ 기존 node_modules 제거 완료${NC}"
  fi
fi

# 1. 환경 파일 설정
echo -e "${YELLOW}📝 환경 설정 파일을 구성합니다...${NC}"
if [ ! -f /workspace/otto-handler/.env.dev ]; then
  if [ -f /workspace/otto-handler/.env.example ]; then
    echo "  .env.example 파일로부터 .env.dev를 생성합니다..."
    cp /workspace/otto-handler/.env.example /workspace/otto-handler/.env.dev
    
    # DevContainer용 설정 자동 업데이트
    sed -i 's|POSTGRESQL_URL=postgresql://postgres:password@localhost:5432/otto_handler|POSTGRESQL_URL=postgresql://postgres:postgres@db:5432/otto-handler|' /workspace/otto-handler/.env.dev
    sed -i 's|REDIS_URL=redis://localhost:6379|REDIS_URL=redis://redis:6379|' /workspace/otto-handler/.env.dev
    
    echo -e "${GREEN}  ✅ .env.example로부터 .env.dev 파일이 생성되었습니다${NC}"
    echo -e "${YELLOW}  📋 추가 설정이 필요합니다. 개발 서버 시작 전에 .env.dev 파일을 확인하세요.${NC}"
  else
    echo -e "${RED}  ❌ .env.example 템플릿을 찾을 수 없습니다.${NC}"
    exit 1
  fi
else
  echo "  ℹ️  .env.dev 파일이 이미 존재합니다. 건너뜁니다..."
fi

# NODE_ENV 환경 변수 확인
echo -e "${YELLOW}🌍 환경 설정 확인...${NC}"
echo "  NODE_ENV=${NODE_ENV:-development}"
echo "  사용할 설정 파일: .env.${NODE_ENV:-dev}"

# 2. Starship 설치 및 설정
echo -e "${YELLOW}🌟 Starship 프롬프트를 설치합니다...${NC}"
if ! command -v starship &> /dev/null; then
  echo "  Starship을 설치합니다..."
  curl -sS https://starship.rs/install.sh | sh -s -- -y
  echo -e "${GREEN}  ✅ Starship이 설치되었습니다${NC}"
else
  echo "  ℹ️  Starship이 이미 설치되어 있습니다"
fi

# Zsh 설정에 Starship 추가
if [ -f ~/.zshrc ]; then
  if ! grep -q "starship init zsh" ~/.zshrc; then
    echo "  Zsh 설정에 Starship을 추가합니다..."
    echo '' >> ~/.zshrc
    echo '# Starship prompt' >> ~/.zshrc
    echo 'eval "$(starship init zsh)"' >> ~/.zshrc
    echo -e "${GREEN}  ✅ Starship이 Zsh에 설정되었습니다${NC}"
  else
    echo "  ℹ️  Starship이 이미 Zsh에 설정되어 있습니다"
  fi
fi

# 3. Claude Code CLI 설치
echo -e "${YELLOW}🤖 Claude Code CLI를 설치합니다...${NC}"

# npm 전역 디렉토리를 사용자 홈으로 설정 (권한 문제 해결)
if [ ! -d ~/.npm-global ]; then
  echo "  npm 전역 패키지 디렉토리를 설정합니다..."
  mkdir -p ~/.npm-global
  npm config set prefix '~/.npm-global'
  
  # .zshrc에 PATH 추가 (영구 적용)
  if [ -f ~/.zshrc ]; then
    if ! grep -q ".npm-global/bin" ~/.zshrc; then
      echo '' >> ~/.zshrc
      echo '# npm global packages' >> ~/.zshrc
      echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
    fi
  fi
  
  # .bashrc에도 PATH 추가 (bash 사용 시)
  if [ -f ~/.bashrc ]; then
    if ! grep -q ".npm-global/bin" ~/.bashrc; then
      echo '' >> ~/.bashrc
      echo '# npm global packages' >> ~/.bashrc
      echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
    fi
  fi
fi

# 현재 세션에 PATH 추가
export PATH=~/.npm-global/bin:$PATH

# Claude Code 설치 확인 및 설치
if ! command -v claude-code &> /dev/null; then
  echo "  Claude Code를 설치합니다..."
  npm install -g @anthropic-ai/claude-code
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}  ✅ Claude Code CLI가 설치되었습니다${NC}"
    echo "  설치 위치: ~/.npm-global/bin/claude-code"
  else
    echo -e "${RED}  ❌ Claude Code CLI 설치 실패${NC}"
    echo "  대안 1: sudo npm install -g @anthropic-ai/claude-code"
    echo "  대안 2: npx @anthropic-ai/claude-code 명령 사용"
  fi
else
  echo "  ℹ️  Claude Code CLI가 이미 설치되어 있습니다"
fi

# 4. pnpm 설정 및 의존성 설치
echo -e "${YELLOW}📦 의존성을 설치합니다...${NC}"

# pnpm 기본 설정 사용 (store는 컨테이너 내부 홈 디렉토리에 자동 생성)
echo "  pnpm 환경을 설정합니다..."
export PNPM_HOME="/home/otto-handler-dev/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

# node_modules가 존재하고 쓰기 불가능하면 제거
if [ -d "/workspace/otto-handler/node_modules" ]; then
  if [ ! -w "/workspace/otto-handler/node_modules" ]; then
    echo "  기존 node_modules에 권한 문제가 있어 제거합니다..."
    sudo rm -rf /workspace/otto-handler/node_modules
  fi
fi

# pnpm install (프롬프트 없이 자동 설치)
echo "  패키지를 설치합니다..."
# --prefer-offline: 캐시 우선 사용
# --no-frozen-lockfile: lockfile 변경 허용 (DevContainer 환경)
PNPM_STORE_DIR=/home/otto-handler-dev/.local/share/pnpm-store pnpm install --prefer-offline --no-frozen-lockfile

# 5. 데이터베이스 설정
echo -e "${YELLOW}🗄️  데이터베이스를 설정합니다...${NC}"

# Prisma 클라이언트 생성
echo "  Prisma 클라이언트를 생성합니다..."
pnpm prisma generate

# 데이터베이스 준비 대기
echo "  PostgreSQL이 준비될 때까지 대기합니다..."
for i in {1..30}; do
  if pnpm prisma db push --skip-generate 2>/dev/null; then
    echo -e "${GREEN}  ✅ 데이터베이스 스키마가 동기화되었습니다${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "  ⚠️  데이터베이스 설정 시간이 초과되었습니다. 'pnpm prisma db push'를 수동으로 실행해주세요."
    break
  fi
  echo "  데이터베이스 대기 중... ($i/30)"
  sleep 2
done

# 6. 유용한 정보 표시
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✨ DevContainer 초기화가 완료되었습니다!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}⚙️  개발 서버 시작 전 설정이 필요합니다:${NC}"
echo -e "${YELLOW}   .env.dev 파일을 열어서 다음 항목들을 설정하세요:${NC}"
echo "   (파일 상단의 한국어 주석을 참고하여 각 환경 변수의 용도를 확인하세요)"
echo ""
echo "   🔐 필수 설정:"
echo "   • COOKIE_SECRET: 쿠키 암호화를 위한 비밀 키"
echo "   • JWT_SECRET: JWT 토큰 서명을 위한 비밀 키"
echo ""
echo "   🐙 GitHub App 설정 (GitHub 연동 시 필요):"
echo "   • OTTO_GITHUB_APP_ID: GitHub App의 고유 ID"
echo "   • OTTO_GITHUB_APP_NAME: GitHub App의 이름"
echo "   • OTTO_GITHUB_WEBHOOK_SECRET: GitHub 웹훅 검증을 위한 시크릿 키"
echo "   • OTTO_GITHUB_APP_PRIVATE_KEY: GitHub App의 개인 키 (RSA 형식)"
echo ""
echo "   📋 GitHub App 생성 방법:"
echo "   1. GitHub Settings > Developer settings > GitHub Apps 접속"
echo "   2. 새 GitHub App 생성 후 App ID 복사"
echo "   3. Private key 생성 후 전체 내용을 .env.dev에 붙여넣기"
echo ""
echo "📚 자주 사용하는 명령어:"
echo "  • 개발 서버 시작:    pnpm run start:dev"
echo "  • 테스트 실행:       pnpm test"
echo "  • DB 확인:          pnpm prisma studio"
echo "  • API 문서:         http://localhost:4000/docs"
echo ""
echo "즐거운 코딩 되세요! 🎉"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"