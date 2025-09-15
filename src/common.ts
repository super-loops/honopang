// http-error.ts
export type MutableObject = {
  [key: string]: any;
};

/**
 * HTTP 상태 코드를 포함하는 커스텀 에러 클래스
 * @example
 * throw new StatusError("Not Found", 404);
 * throw new StatusError(404); // 자동으로 "Not Found" 메시지 생성
 */

export class StatusError extends Error {
  // 원하는 필드들
  public status: number;

  constructor(message: string | number, status = 500) {
    if (typeof message === "number") {
      status = message;
      switch (status) {
        case 400:
          message = "Bad Request";
          break;
        case 401:
          message = "Unauthorized";
          break;
        case 403:
          message = "Forbidden";
          break;
        case 404:
          message = "Not Found";
          break;
        case 409:
          message = "Conflict";
          break;
        case 422:
          message = "Unprocessable Entity";
          break;
        case 429:
          message = "Too Many Requests";
          break;
        case 500:
          message = "Internal Server Error";
          break;
        case 502:
          message = "Bad Gateway";
          break;
        case 503:
          message = "Service Unavailable";
          break;
        default:
          message = `HTTP ${status} Error`;
          break;
      }
    }
    super(message);
    this.status = status;

    // ↓ Error 를 상속할 때 하위 클래스의 prototype 체인을 맞춰주는 관용구
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
