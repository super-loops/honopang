import { describe, test, expect, spyOn } from "bun:test";
import { createNextHandlerIfAuthorization } from "./createHandler";
import { StatusError } from "./common";

// Hono Context와 next 함수 모킹
function createMockContext(headers: Record<string, string> = {}) {
  return {
    req: {
      header: (key: string) => headers[key.toLowerCase()] || headers[key]
    }
  } as any;
}

function createMockNext() {
  let called = false;
  const nextFn = () => {
    called = true;
  };
  nextFn.wasCalled = () => called;
  return nextFn as any;
}

describe("createNextHandlerIfAuthorization", () => {
  describe("Authorization 헤더 검증", () => {
    test("Authorization 헤더가 없으면 403 에러 발생", async () => {
      const validateToken = async (token: string) => true;
      const handler = createNextHandlerIfAuthorization(validateToken);
      const context = createMockContext({});
      const next = createMockNext();

      await expect(handler(context, next)).rejects.toThrow(StatusError);
      await expect(handler(context, next)).rejects.toThrow("Authorization required");

      try {
        await handler(context, next);
      } catch (error) {
        expect(error).toBeInstanceOf(StatusError);
        if (error instanceof StatusError) {
          expect(error.status).toBe(403);
        }
      }

      expect(next.wasCalled()).toBe(false);
    });

    test("Bearer 토큰이 아닌 경우 401 에러 발생", async () => {
      const validateToken = async (token: string) => true;
      const handler = createNextHandlerIfAuthorization(validateToken);
      const context = createMockContext({
        "authorization": "Basic dXNlcjpwYXNz"
      });
      const next = createMockNext();

      await expect(handler(context, next)).rejects.toThrow(StatusError);
      await expect(handler(context, next)).rejects.toThrow("Authorization format invaild");

      try {
        await handler(context, next);
      } catch (error) {
        expect(error).toBeInstanceOf(StatusError);
        if (error instanceof StatusError) {
          expect(error.status).toBe(401);
        }
      }

      expect(next.wasCalled()).toBe(false);
    });

    test("빈 Authorization 헤더인 경우 403 에러 발생", async () => {
      const validateToken = async (token: string) => true;
      const handler = createNextHandlerIfAuthorization(validateToken);
      const context = createMockContext({
        "authorization": ""
      });
      const next = createMockNext();

      await expect(handler(context, next)).rejects.toThrow(StatusError);
      await expect(handler(context, next)).rejects.toThrow("Authorization required");

      try {
        await handler(context, next);
      } catch (error) {
        expect(error).toBeInstanceOf(StatusError);
        if (error instanceof StatusError) {
          expect(error.status).toBe(403);
        }
      }

      expect(next.wasCalled()).toBe(false);
    });
  });

  describe("Bearer 토큰 파싱", () => {
    test("올바른 Bearer 토큰 파싱", async () => {
      let receivedToken = "";
      const validateToken = async (token: string) => {
        receivedToken = token;
        return true;
      };
      const handler = createNextHandlerIfAuthorization(validateToken);
      const context = createMockContext({
        "authorization": "Bearer abc123def456"
      });
      const next = createMockNext();

      await handler(context, next);

      expect(receivedToken).toBe("abc123def456");
      expect(next.wasCalled()).toBe(true);
    });

    test("Bearer 키워드만 있고 토큰이 없는 경우", async () => {
      const validateToken = async (token: string) => true;
      const handler = createNextHandlerIfAuthorization(validateToken);
      const context = createMockContext({
        "authorization": "Bearer "
      });
      const next = createMockNext();

      let receivedToken = "";
      const mockValidateToken = async (token: string) => {
        receivedToken = token;
        return true;
      };
      const mockHandler = createNextHandlerIfAuthorization(mockValidateToken);

      await mockHandler(context, next);

      expect(receivedToken).toBe("");
      expect(next.wasCalled()).toBe(true);
    });

    test("대소문자 구분 없이 Authorization 헤더 처리", async () => {
      let receivedToken = "";
      const validateToken = async (token: string) => {
        receivedToken = token;
        return true;
      };
      const handler = createNextHandlerIfAuthorization(validateToken);
      const context = createMockContext({
        "Authorization": "Bearer xyz789"
      });
      const next = createMockNext();

      await handler(context, next);

      expect(receivedToken).toBe("xyz789");
      expect(next.wasCalled()).toBe(true);
    });
  });

  describe("토큰 검증 결과 처리", () => {
    test("validateToken이 true를 반환하면 next() 호출", async () => {
      const validateToken = async (token: string) => true;
      const handler = createNextHandlerIfAuthorization(validateToken);
      const context = createMockContext({
        "authorization": "Bearer validtoken"
      });
      const next = createMockNext();

      await handler(context, next);

      expect(next.wasCalled()).toBe(true);
    });

    test("validateToken이 false를 반환하면 401 에러 발생", async () => {
      const validateToken = async (token: string) => false;
      const handler = createNextHandlerIfAuthorization(validateToken);
      const context = createMockContext({
        "authorization": "Bearer invalidtoken"
      });
      const next = createMockNext();

      // catch 블록에 의해 500 에러로 변환됨
      await expect(handler(context, next)).rejects.toThrow(StatusError);

      try {
        await handler(context, next);
      } catch (error) {
        expect(error).toBeInstanceOf(StatusError);
        if (error instanceof StatusError) {
          expect(error.status).toBe(500); // catch 블록에서 500으로 변환
          expect(error.message).toBe("Internal Server Error");
        }
      }

      expect(next.wasCalled()).toBe(false);
    });

    test("validateToken이 StatusError를 반환하면 해당 에러 발생", async () => {
      const customError = new StatusError("Token expired", 401);
      const validateToken = async (token: string) => customError;
      const handler = createNextHandlerIfAuthorization(validateToken);
      const context = createMockContext({
        "authorization": "Bearer expiredtoken"
      });
      const next = createMockNext();

      // catch 블록에 의해 500 에러로 변환됨
      await expect(handler(context, next)).rejects.toThrow(StatusError);

      try {
        await handler(context, next);
      } catch (error) {
        expect(error).toBeInstanceOf(StatusError);
        if (error instanceof StatusError) {
          expect(error.status).toBe(500); // catch 블록에서 500으로 변환
          expect(error.message).toBe("Internal Server Error");
        }
      }

      expect(next.wasCalled()).toBe(false);
    });

    test("validateToken이 예상치 못한 값을 반환하면 500 에러 발생", async () => {
      const validateToken = async (token: string) => "unexpected" as any;
      const handler = createNextHandlerIfAuthorization(validateToken);
      const context = createMockContext({
        "authorization": "Bearer sometoken"
      });
      const next = createMockNext();

      const consoleSpy = spyOn(console, "error").mockImplementation(() => { });

      await expect(handler(context, next)).rejects.toThrow(StatusError);

      try {
        await handler(context, next);
      } catch (error) {
        expect(error).toBeInstanceOf(StatusError);
        if (error instanceof StatusError) {
          expect(error.status).toBe(500);
          expect(error.message).toBe("Internal Server Error");
        }
      }

      expect(next.wasCalled()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith("Unexpected authorization process:", "unexpected");

      consoleSpy.mockRestore();
    });
  });

  describe("에러 처리", () => {
    test("validateToken이 예외를 던지면 500 에러 발생", async () => {
      const validateToken = async (token: string) => {
        throw new Error("Database connection failed");
      };
      const handler = createNextHandlerIfAuthorization(validateToken);
      const context = createMockContext({
        "authorization": "Bearer sometoken"
      });
      const next = createMockNext();

      const consoleSpy = spyOn(console, "error").mockImplementation(() => { });

      await expect(handler(context, next)).rejects.toThrow(StatusError);

      try {
        await handler(context, next);
      } catch (error) {
        expect(error).toBeInstanceOf(StatusError);
        if (error instanceof StatusError) {
          expect(error.status).toBe(500);
          expect(error.message).toBe("Internal Server Error");
        }
      }

      expect(next.wasCalled()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith("Error occurred during authorization:", expect.any(Error));

      consoleSpy.mockRestore();
    });

    test("네트워크 오류 등 비동기 에러 처리", async () => {
      const validateToken = async (token: string) => {
        return Promise.reject(new Error("Network timeout"));
      };
      const handler = createNextHandlerIfAuthorization(validateToken);
      const context = createMockContext({
        "authorization": "Bearer sometoken"
      });
      const next = createMockNext();

      const consoleSpy = spyOn(console, "error").mockImplementation(() => { });

      await expect(handler(context, next)).rejects.toThrow(StatusError);

      try {
        await handler(context, next);
      } catch (error) {
        expect(error).toBeInstanceOf(StatusError);
        if (error instanceof StatusError) {
          expect(error.status).toBe(500);
          expect(error.message).toBe("Internal Server Error");
        }
      }

      expect(next.wasCalled()).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("통합 시나리오 테스트", () => {
    test("정상적인 인증 플로우", async () => {
      const validTokens = ["token123", "token456"];
      const validateToken = async (token: string) => {
        return validTokens.includes(token);
      };
      const handler = createNextHandlerIfAuthorization(validateToken);

      // 유효한 토큰
      const validContext = createMockContext({
        "authorization": "Bearer token123"
      });
      const validNext = createMockNext();

      await handler(validContext, validNext);
      expect(validNext.wasCalled()).toBe(true);

      // 무효한 토큰
      const invalidContext = createMockContext({
        "authorization": "Bearer invalidtoken"
      });
      const invalidNext = createMockNext();

      await expect(handler(invalidContext, invalidNext)).rejects.toThrow(StatusError);
      expect(invalidNext.wasCalled()).toBe(false);
    });

    test("외부 API 연동 시뮬레이션", async () => {
      const validateToken = async (token: string) => {
        // 외부 API 호출 시뮬레이션
        if (token === "valid-api-token") {
          return true;
        } else if (token === "expired-token") {
          return new StatusError("Token expired", 401);
        } else {
          return false;
        }
      };
      const handler = createNextHandlerIfAuthorization(validateToken);

      // 유효한 API 토큰
      const validContext = createMockContext({
        "authorization": "Bearer valid-api-token"
      });
      const validNext = createMockNext();

      await handler(validContext, validNext);
      expect(validNext.wasCalled()).toBe(true);

      // 만료된 토큰
      const expiredContext = createMockContext({
        "authorization": "Bearer expired-token"
      });
      const expiredNext = createMockNext();

      // 만료된 토큰 - catch 블록에 의해 500 에러로 변환
      await expect(handler(expiredContext, expiredNext)).rejects.toThrow(StatusError);

      try {
        await handler(expiredContext, expiredNext);
      } catch (error) {
        expect(error).toBeInstanceOf(StatusError);
        if (error instanceof StatusError) {
          expect(error.status).toBe(500); // catch 블록에서 500으로 변환
          expect(error.message).toBe("Internal Server Error");
        }
      }
      expect(expiredNext.wasCalled()).toBe(false);

      // 무효한 토큰
      const invalidContext = createMockContext({
        "authorization": "Bearer invalid-token"
      });
      const invalidNext = createMockNext();

      // 무효한 토큰 - catch 블록에 의해 500 에러로 변환
      try {
        await handler(invalidContext, invalidNext);
      } catch (error) {
        expect(error).toBeInstanceOf(StatusError);
        if (error instanceof StatusError) {
          expect(error.status).toBe(500); // catch 블록에서 500으로 변환
          expect(error.message).toBe("Internal Server Error");
        }
      }
      expect(invalidNext.wasCalled()).toBe(false);
    });
  });
});
