import { describe, test, expect } from "bun:test";
import { StatusError } from "./common";

describe("StatusError", () => {
  describe("생성자 테스트", () => {
    test("문자열 메시지와 상태 코드로 생성", () => {
      const error = new StatusError("Custom error message", 400);

      expect(error.message).toBe("Custom error message");
      expect(error.status).toBe(400);
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(StatusError);
    });

    test("기본 상태 코드는 500", () => {
      const error = new StatusError("Server error");

      expect(error.message).toBe("Server error");
      expect(error.status).toBe(500);
    });

    test("숫자만 전달하면 해당 상태 코드의 기본 메시지 사용", () => {
      const error = new StatusError(404);

      expect(error.message).toBe("Not Found");
      expect(error.status).toBe(404);
    });
  });

  describe("상태 코드별 기본 메시지 테스트", () => {
    test("400 Bad Request", () => {
      const error = new StatusError(400);
      expect(error.message).toBe("Bad Request");
      expect(error.status).toBe(400);
    });

    test("401 Unauthorized", () => {
      const error = new StatusError(401);
      expect(error.message).toBe("Unauthorized");
      expect(error.status).toBe(401);
    });

    test("403 Forbidden", () => {
      const error = new StatusError(403);
      expect(error.message).toBe("Forbidden");
      expect(error.status).toBe(403);
    });

    test("404 Not Found", () => {
      const error = new StatusError(404);
      expect(error.message).toBe("Not Found");
      expect(error.status).toBe(404);
    });

    test("409 Conflict", () => {
      const error = new StatusError(409);
      expect(error.message).toBe("Conflict");
      expect(error.status).toBe(409);
    });

    test("422 Unprocessable Entity", () => {
      const error = new StatusError(422);
      expect(error.message).toBe("Unprocessable Entity");
      expect(error.status).toBe(422);
    });

    test("429 Too Many Requests", () => {
      const error = new StatusError(429);
      expect(error.message).toBe("Too Many Requests");
      expect(error.status).toBe(429);
    });

    test("500 Internal Server Error", () => {
      const error = new StatusError(500);
      expect(error.message).toBe("Internal Server Error");
      expect(error.status).toBe(500);
    });

    test("502 Bad Gateway", () => {
      const error = new StatusError(502);
      expect(error.message).toBe("Bad Gateway");
      expect(error.status).toBe(502);
    });

    test("503 Service Unavailable", () => {
      const error = new StatusError(503);
      expect(error.message).toBe("Service Unavailable");
      expect(error.status).toBe(503);
    });

    test("정의되지 않은 상태 코드는 일반 메시지 사용", () => {
      const error = new StatusError(418);
      expect(error.message).toBe("HTTP 418 Error");
      expect(error.status).toBe(418);
    });
  });

  describe("Error 클래스 상속 테스트", () => {
    test("Error 프로토타입 체인이 올바르게 설정됨", () => {
      const error = new StatusError("Test error", 400);

      expect(error instanceof Error).toBe(true);
      expect(error instanceof StatusError).toBe(true);
      expect(error.constructor).toBe(StatusError);
    });

    test("stack trace가 생성됨", () => {
      const error = new StatusError("Test error", 400);

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe("string");
      expect(error.stack).toContain("StatusError");
    });
  });

  describe("에러 throw 및 catch 테스트", () => {
    test("StatusError를 throw하고 catch할 수 있음", () => {
      expect(() => {
        throw new StatusError("Test error", 400);
      }).toThrow("Test error");
    });

    test("catch된 에러의 status 속성에 접근 가능", () => {
      try {
        throw new StatusError("Test error", 403);
      } catch (error) {
        expect(error).toBeInstanceOf(StatusError);
        if (error instanceof StatusError) {
          expect(error.status).toBe(403);
          expect(error.message).toBe("Test error");
        }
      }
    });
  });
});
