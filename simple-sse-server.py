#!/usr/bin/env python3
"""
간단한 SSE 목업 서버 - otto-handler 없이도 로그 스트리밍 테스트 가능
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import time
import threading
from urllib.parse import urlparse, parse_qs

class SSEHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = urlparse(self.path).path
        query = parse_qs(urlparse(self.path).query)
        
        # CORS 헤더 설정
        def set_cors_headers(self):
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Cache-Control')
        
        if path == '/api/v1/log-streaming/test/mock-stream/test-task-123':
            # SSE 헤더 설정
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection', 'keep-alive')
            set_cors_headers(self)
            self.end_headers()
            
            # 목업 로그 데이터
            mock_logs = [
                {"workerId": "worker-1", "level": "INFO", "message": "=== 빌드 시작 ===", "timestamp": "2025-09-09T11:00:00Z"},
                {"workerId": "worker-1", "level": "INFO", "message": "프로젝트 의존성 설치 중...", "timestamp": "2025-09-09T11:00:01Z"},
                {"workerId": "worker-1", "level": "INFO", "message": "패키지 다운로드: axios@5.2.2", "timestamp": "2025-09-09T11:00:02Z"},
                {"workerId": "worker-2", "level": "DEBUG", "message": "TypeScript 컴파일 시작", "timestamp": "2025-09-09T11:00:03Z"},
                {"workerId": "worker-2", "level": "INFO", "message": "컴파일 완료: 125개 파일 처리", "timestamp": "2025-09-09T11:00:05Z"},
                {"workerId": "worker-1", "level": "INFO", "message": "=== 테스트 실행 시작 ===", "timestamp": "2025-09-09T11:00:06Z"},
                {"workerId": "worker-3", "level": "WARN", "message": "WARNING: deprecated package detected", "timestamp": "2025-09-09T11:00:07Z"},
                {"workerId": "worker-2", "level": "INFO", "message": "Jest 테스트 실행 중...", "timestamp": "2025-09-09T11:00:08Z"},
                {"workerId": "worker-2", "level": "INFO", "message": "테스트 통과: should authenticate user", "timestamp": "2025-09-09T11:00:09Z"},
                {"workerId": "worker-1", "level": "INFO", "message": "=== 배포 시작 ===", "timestamp": "2025-09-09T11:00:10Z"},
                {"workerId": "worker-3", "level": "INFO", "message": "Docker 이미지 빌드 중...", "timestamp": "2025-09-09T11:00:12Z"},
                {"workerId": "worker-3", "level": "INFO", "message": "배포 완료: deploy-1757418000", "timestamp": "2025-09-09T11:00:15Z"},
            ]
            
            interval = float(query.get('interval', [1000])[0]) / 1000.0
            count = min(int(query.get('count', [len(mock_logs)])[0]), len(mock_logs))
            
            try:
                for i, log_entry in enumerate(mock_logs[:count]):
                    # SSE 이벤트 형식으로 전송
                    sse_data = f"event: log\ndata: {json.dumps(log_entry)}\nid: {int(time.time() * 1000)}-{i}\n\n"
                    self.wfile.write(sse_data.encode('utf-8'))
                    self.wfile.flush()
                    
                    if i < count - 1:  # 마지막이 아니면 대기
                        time.sleep(interval)
                
                # 완료 메시지
                complete_data = {
                    "message": "목업 로그 스트림이 완료되었습니다",
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "totalLogs": count
                }
                complete_sse = f"event: complete\ndata: {json.dumps(complete_data)}\nid: {int(time.time() * 1000)}-complete\n\n"
                self.wfile.write(complete_sse.encode('utf-8'))
                self.wfile.flush()
                
            except BrokenPipeError:
                print("클라이언트 연결이 종료되었습니다")
            except Exception as e:
                print(f"SSE 스트리밍 에러: {e}")
        
        elif path == '/api/v1/log-streaming/health':
            # Health check
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            set_cors_headers(self)
            self.end_headers()
            
            health_data = {
                "status": "healthy",
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "activeConnections": 0,
                "server": "Python Mock Server"
            }
            self.wfile.write(json.dumps(health_data).encode('utf-8'))
        
        else:
            # 404
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            set_cors_headers(self)
            self.end_headers()
            
            error_data = {
                "message": f"Cannot GET {path}",
                "error": "Not Found",
                "statusCode": 404,
                "server": "Python Mock Server"
            }
            self.wfile.write(json.dumps(error_data).encode('utf-8'))
    
    def do_OPTIONS(self):
        # CORS preflight
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Cache-Control')
        self.end_headers()
    
    def log_message(self, format, *args):
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {format % args}")

if __name__ == '__main__':
    port = 9000
    server = HTTPServer(('localhost', port), SSEHandler)
    print(f"🚀 Otto Mock SSE Server 시작")
    print(f"🌐 서버 주소: http://localhost:{port}")
    print(f"🧪 테스트 URL: http://localhost:{port}/api/v1/log-streaming/test/mock-stream/test-task-123")
    print(f"🏥 Health Check: http://localhost:{port}/api/v1/log-streaming/health")
    print(f"⏹️  중지: Ctrl+C")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 서버를 종료합니다...")
        server.server_close()