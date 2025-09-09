import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { CommonErrorResponseDto } from '../dto';

@Catch() // 모든 예외 캐치
export class AllExceptionsFilter implements ExceptionFilter {
  // HTTP 상태 코드별 한국어 에러 메시지 매핑
  private readonly errorMessages: Record<number, string> = {
    // 4xx Client Errors
    400: '잘못된 요청입니다',
    401: '아이디나 비밀번호가 틀립니다',
    402: '결제가 필요합니다',
    403: '접근 권한이 없습니다',
    404: '요청하신 페이지를 찾을 수 없습니다',
    405: '허용되지 않은 요청 방식입니다',
    406: '허용되지 않은 형식입니다',
    407: '프록시 인증이 필요합니다',
    408: '요청 시간이 초과되었습니다',
    409: '요청이 충돌되었습니다',
    410: '요청하신 리소스가 더 이상 사용할 수 없습니다',
    411: '콘텐츠 길이가 필요합니다',
    412: '전제 조건이 실패했습니다',
    413: '요청 본문이 너무 큽니다',
    414: '요청 URI가 너무 깁니다',
    415: '지원되지 않는 미디어 타입입니다',
    416: '요청 범위가 만족되지 않습니다',
    417: '예상 조건이 실패했습니다',
    418: '저는 찻주전자입니다', // Easter egg
    422: '처리할 수 없는 요청입니다',
    423: '리소스가 잠겨있습니다',
    424: '의존성 실패입니다',
    425: '너무 이른 요청입니다',
    426: '프로토콜 업그레이드가 필요합니다',
    428: '전제 조건이 필요합니다',
    429: '요청이 너무 많습니다',
    431: '요청 헤더 필드가 너무 큽니다',
    451: '법적인 이유로 사용할 수 없습니다',

    // 5xx Server Errors
    500: '서버 내부 오류가 발생했습니다',
    501: '구현되지 않은 기능입니다',
    502: '잘못된 게이트웨이입니다',
    503: '서비스를 사용할 수 없습니다',
    504: '게이트웨이 시간 초과입니다',
    505: 'HTTP 버전이 지원되지 않습니다',
    506: '내부 구성 오류입니다',
    507: '저장 공간이 부족합니다',
    508: '루프가 감지되었습니다',
    510: '확장되지 않았습니다',
    511: '네트워크 인증이 필요합니다',
  };

  // HTTP 상태 코드별 에러 이름 매핑
  private readonly errorNames: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    402: 'Payment Required',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    406: 'Not Acceptable',
    407: 'Proxy Authentication Required',
    408: 'Request Timeout',
    409: 'Conflict',
    410: 'Gone',
    411: 'Length Required',
    412: 'Precondition Failed',
    413: 'Payload Too Large',
    414: 'URI Too Long',
    415: 'Unsupported Media Type',
    416: 'Range Not Satisfiable',
    417: 'Expectation Failed',
    418: "I'm a teapot",
    422: 'Unprocessable Entity',
    423: 'Locked',
    424: 'Failed Dependency',
    425: 'Too Early',
    426: 'Upgrade Required',
    428: 'Precondition Required',
    429: 'Too Many Requests',
    431: 'Request Header Fields Too Large',
    451: 'Unavailable For Legal Reasons',
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
    505: 'HTTP Version Not Supported',
    506: 'Variant Also Negotiates',
    507: 'Insufficient Storage',
    508: 'Loop Detected',
    510: 'Not Extended',
    511: 'Network Authentication Required',
  };

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    let status: number;
    let message: string;
    let error: string;

    // HttpException인 경우
    if (exception instanceof HttpException) {
      status = exception.getStatus();

      // 커스텀 메시지가 있는 경우 우선 사용
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else {
        message =
          this.errorMessages[status] || '알 수 없는 오류가 발생했습니다';
      }

      error = this.errorNames[status] || 'Unknown Error';
    }
    // 일반 에러인 경우 500으로 처리
    else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = this.errorMessages[500];
      error = this.errorNames[500];

      // 개발 환경에서는 상세 에러 로깅
      if (process.env.NODE_ENV === 'development') {
        console.error('Unhandled Exception:', exception);
      }
    }

    const result: CommonErrorResponseDto = {
      error,
      message,
      statusCode: status,
    };

    response.status(status).send(result);
  }
}
