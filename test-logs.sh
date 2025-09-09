#!/bin/bash

echo "🚀 Otto Handler 로그 스트리밍 테스트"
echo "=================================="

# 포트들을 순차적으로 테스트
PORTS=(4000 4001 4002 4003 4004)
API_PORT=""

echo "🔍 활성 포트 찾는 중..."
for port in "${PORTS[@]}"; do
    if timeout 2s curl -s "http://localhost:$port/" >/dev/null 2>&1; then
        echo "✅ 포트 $port 에서 서버 응답 확인"
        API_PORT=$port
        break
    else
        echo "❌ 포트 $port 응답 없음"
    fi
done

if [ -z "$API_PORT" ]; then
    echo "❌ 활성화된 otto-handler 서버를 찾을 수 없습니다."
    echo "서버를 먼저 시작해주세요: pnpm run start:dev"
    exit 1
fi

echo ""
echo "🧪 API 엔드포인트 테스트 (포트: $API_PORT)"
echo "--------------------------------"

# Health check
echo "1. Health Check:"
HEALTH=$(curl -s "http://localhost:$API_PORT/api/v1/log-streaming/health" 2>/dev/null)
if echo "$HEALTH" | grep -q "healthy"; then
    echo "✅ Health: OK"
    echo "$HEALTH" | jq . 2>/dev/null || echo "$HEALTH"
else
    echo "❌ Health: FAILED"
    echo "Response: $HEALTH"
fi

echo ""

# Mock logs test
echo "2. Mock Logs 생성 테스트:"
MOCK_LOGS=$(curl -s "http://localhost:$API_PORT/api/v1/log-streaming/test/mock-logs/test123?count=3" 2>/dev/null)
if echo "$MOCK_LOGS" | grep -q "success"; then
    echo "✅ Mock Logs: OK"
    echo "$MOCK_LOGS" | jq . 2>/dev/null || echo "$MOCK_LOGS"
else
    echo "❌ Mock Logs: FAILED"
    echo "Response: $MOCK_LOGS"
fi

echo ""

# SSE Stream test
echo "3. 실시간 로그 스트림 테스트:"
echo "🌊 5초간 스트림 연결 테스트..."

timeout 5s curl -N -s "http://localhost:$API_PORT/api/v1/log-streaming/logs/test-task-123/stream" 2>/dev/null | while IFS= read -r line; do
    if [[ $line == data:* ]]; then
        echo "📨 SSE Data: ${line#data: }"
    elif [[ $line == event:* ]]; then
        echo "🏷️  SSE Event: ${line#event: }"
    elif [[ $line =~ ^{.*}$ ]]; then
        echo "❌ JSON Error: $line"
    fi
done

echo ""
echo "4. Mock 스트림 테스트:"
if curl -s "http://localhost:$API_PORT/api/v1/log-streaming/test/mock-stream/test-task?interval=500&count=5" >/dev/null 2>&1; then
    echo "🌊 Mock 스트림 연결 중 (5초)..."
    timeout 5s curl -N -s "http://localhost:$API_PORT/api/v1/log-streaming/test/mock-stream/test-task?interval=500&count=5" 2>/dev/null | while IFS= read -r line; do
        if [[ $line == data:* ]]; then
            DATA=${line#data: }
            if echo "$DATA" | jq -r '.message' 2>/dev/null | grep -q .; then
                WORKER_ID=$(echo "$DATA" | jq -r '.workerId // "unknown"' 2>/dev/null)
                MESSAGE=$(echo "$DATA" | jq -r '.message // "no message"' 2>/dev/null | cut -c1-50)
                echo "📨 [$WORKER_ID] $MESSAGE..."
            else
                echo "📨 Raw: ${DATA:0:80}..."
            fi
        elif [[ $line == event:* ]]; then
            echo "🏷️  Event: ${line#event: }"
        fi
    done
else
    echo "❌ Mock 스트림 엔드포인트를 사용할 수 없습니다."
fi

echo ""
echo "🎯 수동 테스트 명령어:"
echo "curl -N \"http://localhost:$API_PORT/api/v1/log-streaming/logs/test-task/stream\""
echo ""
echo "🌐 브라우저 테스트:"
echo "http://localhost:8080/test-sse.html (포트를 $API_PORT 로 변경)"