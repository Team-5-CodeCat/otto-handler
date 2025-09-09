#!/bin/bash

echo "🔍 포트 4002 NestJS API 테스트"
echo "================================"

PORT=4002
BASE_URL="http://localhost:$PORT"

# Health endpoint (우선 확인된 것)
echo "1. Health Check:"
HEALTH=$(curl -s "$BASE_URL/api/v1/log-streaming/health" 2>/dev/null)
if echo "$HEALTH" | grep -q "healthy"; then
    echo "✅ Health: OK"
    echo "$HEALTH" | jq . 2>/dev/null || echo "$HEALTH"
else
    echo "❌ Health 응답:"
    echo "$HEALTH"
fi

echo ""

# 기본 auth 모듈 테스트
echo "2. Auth 모듈 테스트:"
AUTH_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/auth_test "$BASE_URL/api/v1/auth/login" 2>/dev/null)
if [[ "$AUTH_RESPONSE" == "405" ]] || [[ "$AUTH_RESPONSE" == "400" ]]; then
    echo "✅ Auth 모듈: 로드됨 (POST 요청 필요)"
elif [[ "$AUTH_RESPONSE" == "404" ]]; then
    echo "❌ Auth 모듈: 로드되지 않음"
else
    echo "⚠️  Auth 모듈: 상태 코드 $AUTH_RESPONSE"
    cat /tmp/auth_test
fi

echo ""

# LogStreaming 모듈 엔드포인트 테스트
echo "3. LogStreaming 모듈 테스트:"
ENDPOINTS=(
    "/api/v1/log-streaming/health"
    "/api/v1/log-streaming/logs/test/stream"  
    "/api/v1/log-streaming/test/mock-logs/test"
)

for endpoint in "${ENDPOINTS[@]}"; do
    RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/endpoint_test "$BASE_URL$endpoint" 2>/dev/null)
    if [[ "$RESPONSE" == "404" ]]; then
        echo "❌ $endpoint: 등록되지 않음"
    elif [[ "$RESPONSE" == "200" ]] || [[ "$RESPONSE" == "400" ]]; then
        echo "✅ $endpoint: 등록됨"
    else
        echo "⚠️  $endpoint: 상태 코드 $RESPONSE"
    fi
done

echo ""

# 실시간 스트림 테스트 (간단히)
echo "4. 실시간 스트림 연결 테스트:"
timeout 3s curl -N -s "$BASE_URL/api/v1/log-streaming/logs/test-task/stream" > /tmp/stream_test 2>&1 &
CURL_PID=$!
sleep 2
kill $CURL_PID 2>/dev/null || true
wait $CURL_PID 2>/dev/null || true

if [ -s /tmp/stream_test ]; then
    STREAM_CONTENT=$(cat /tmp/stream_test | head -3)
    if echo "$STREAM_CONTENT" | grep -q "event:\|data:"; then
        echo "✅ SSE 스트림: 작동함"
        echo "   응답 샘플: $STREAM_CONTENT"
    elif echo "$STREAM_CONTENT" | grep -q "404"; then
        echo "❌ SSE 스트림: 엔드포인트 없음"
    else
        echo "⚠️  SSE 스트림: 응답 있음"
        echo "   응답: $STREAM_CONTENT"
    fi
else
    echo "❌ SSE 스트림: 응답 없음"
fi

echo ""

# 서버 재시작 필요성 판단
echo "5. 진단 결과:"
if echo "$HEALTH" | grep -q "healthy"; then
    if curl -s "$BASE_URL/api/v1/log-streaming/logs/test/stream" | grep -q "404"; then
        echo "⚠️  서버는 실행 중이지만 새 엔드포인트가 로드되지 않음"
        echo "   → 서버 재시작 권장: Ctrl+C 후 pnpm run start:dev"
    else
        echo "✅ 서버 정상 작동 중"
    fi
else
    echo "❌ 서버에 문제가 있음. 로그 확인 필요"
fi

# 정리
rm -f /tmp/auth_test /tmp/endpoint_test /tmp/stream_test

echo ""
echo "🌐 브라우저 테스트 URL: http://localhost:8080/test-sse.html"