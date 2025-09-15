import { describe, test, expect, spyOn } from "bun:test";
import { responseOfError } from "./contextResponse";
import { StatusError } from "./common";

// Hono Context 모킹 - 실제 동작을 시뮬레이션
function createMockContext() {
  const jsonResponses: Array<{ data: any; status: number }> = [];

  return {
    json: (data: any, status?: number) => {
      const response = { data, status: status || 200 };
      jsonResponses.push(response);
      return response;
    },
    getLastJsonCall: () => jsonResponses[jsonResponses.length - 1]
  } as any;
}

describe("responseOfError", () => {
  describe("StatusError 처리", () => {
    test("StatusError의 status와 message를 올바르게 반환", () => {
      const context = createMockContext();
      const error = new StatusError("Not Found", 404);

      responseOfError(context, error);
      const lastCall = context.getLastJsonCall();

      expect(lastCall.data).toEqual({ error: "Not Found" });
      expect(lastCall.status).toBe(404);
    });

    test("StatusError의 다양한 상태 코드 처리", () => {
      const context = createMockContext();

      // 400 Bad Request
      const badRequestError = new StatusError("Bad Request", 400);
      responseOfError(context, badRequestError);
      let lastCall = context.getLastJsonCall();
      expect(lastCall.status).toBe(400);
      expect(lastCall.data.error).toBe("Bad Request");

      // 500 Internal Server Error
      const serverError = new StatusError("Internal Server Error", 500);
      responseOfError(context, serverError);
      lastCall = context.getLastJsonCall();
      expect(lastCall.status).toBe(500);
      expect(lastCall.data.error).toBe("Internal Server Error");

      // 401 Unauthorized
      const unauthorizedError = new StatusError("Unauthorized", 401);
      responseOfError(context, unauthorizedError);
      lastCall = context.getLastJsonCall();
      expect(lastCall.status).toBe(401);
      expect(lastCall.data.error).toBe("Unauthorized");
    });

    test("숫자로 생성된 StatusError 처리", () => {
      const context = createMockContext();
      const error = new StatusError(422); // "Unprocessable Entity"

      responseOfError(context, error);
      const lastCall = context.getLastJsonCall();

      expect(lastCall.data).toEqual({ error: "Unprocessable Entity" });
      expect(lastCall.status).toBe(422);
    });
  });

  describe("일반 Error 처리", () => {
    test("일반 Error는 500 상태 코드로 처리", () => {
      const context = createMockContext();
      const error = new Error("Something went wrong");

      responseOfError(context, error);
      const lastCall = context.getLastJsonCall();

      expect(lastCall.data).toEqual({ error: "Something went wrong" });
      expect(lastCall.status).toBe(500);
    });

    test("TypeError 처리", () => {
      const context = createMockContext();
      const error = new TypeError("Type error occurred");

      responseOfError(context, error);
      const lastCall = context.getLastJsonCall();

      expect(lastCall.data).toEqual({ error: "Type error occurred" });
      expect(lastCall.status).toBe(500);
    });

    test("ReferenceError 처리", () => {
      const context = createMockContext();
      const error = new ReferenceError("Reference error occurred");

      responseOfError(context, error);
      const lastCall = context.getLastJsonCall();

      expect(lastCall.data).toEqual({ error: "Reference error occurred" });
      expect(lastCall.status).toBe(500);
    });
  });

  describe("verbose 옵션 테스트", () => {
    test("verbose=true (기본값)일 때 console.error 호출", () => {
      const consoleSpy = spyOn(console, "error").mockImplementation(() => { });
      const context = createMockContext();
      const error = new StatusError("Test error", 400);

      responseOfError(context, error, true);

      expect(consoleSpy).toHaveBeenCalledWith("[ERROR] responeOfError:", error);
      consoleSpy.mockRestore();
    });

    test("verbose=false일 때 console.error 호출하지 않음", () => {
      const consoleSpy = spyOn(console, "error").mockImplementation(() => { });
      const context = createMockContext();
      const error = new StatusError("Test error", 400);

      responseOfError(context, error, false);

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test("verbose 매개변수를 생략하면 기본값 true로 동작", () => {
      const consoleSpy = spyOn(console, "error").mockImplementation(() => { });
      const context = createMockContext();
      const error = new StatusError("Test error", 400);

      responseOfError(context, error);

      expect(consoleSpy).toHaveBeenCalledWith("[ERROR] responeOfError:", error);
      consoleSpy.mockRestore();
    });
  });

  describe("에러 메시지 형태 테스트", () => {
    test("빈 메시지를 가진 Error 처리", () => {
      const context = createMockContext();
      const error = new Error("");

      responseOfError(context, error);
      const lastCall = context.getLastJsonCall();

      expect(lastCall.data).toEqual({ error: "" });
      expect(lastCall.status).toBe(500);
    });

    test("긴 메시지를 가진 Error 처리", () => {
      const context = createMockContext();
      const longMessage = "A".repeat(1000);
      const error = new StatusError(longMessage, 400);

      responseOfError(context, error);
      const lastCall = context.getLastJsonCall();

      expect(lastCall.data.error).toBe(longMessage);
      expect(lastCall.status).toBe(400);
    });

    test("특수 문자가 포함된 메시지 처리", () => {
      const context = createMockContext();
      const specialMessage = "Error with 특수문자 and symbols: !@#$%^&*()";
      const error = new StatusError(specialMessage, 400);

      responseOfError(context, error);
      const lastCall = context.getLastJsonCall();

      expect(lastCall.data.error).toBe(specialMessage);
      expect(lastCall.status).toBe(400);
    });
  });

  describe("응답 형태 검증", () => {
    test("응답 객체의 구조가 올바름", () => {
      const context = createMockContext();
      const error = new StatusError("Test error", 400);

      responseOfError(context, error);
      const lastCall = context.getLastJsonCall();

      expect(lastCall).toHaveProperty("data");
      expect(lastCall).toHaveProperty("status");
      expect(lastCall.data).toHaveProperty("error");
      expect(typeof lastCall.data.error).toBe("string");
      expect(typeof lastCall.status).toBe("number");
    });

    test("JSON 응답 형태로 c.json이 호출됨", () => {
      const context = createMockContext();
      const error = new StatusError("Test error", 400);

      responseOfError(context, error);
      const lastCall = context.getLastJsonCall();

      // c.json이 호출되었는지 확인
      expect(lastCall).toBeDefined();
      expect(lastCall.data).toEqual({ error: "Test error" });
    });
  });

  describe("타입 검증 테스트", () => {
    test("status 속성이 있는 객체는 StatusError로 처리", () => {
      const context = createMockContext();
      const errorLikeObject = {
        message: "Custom error",
        status: 418,
        name: "CustomError"
      } as any;

      responseOfError(context, errorLikeObject);
      const lastCall = context.getLastJsonCall();

      expect(lastCall.status).toBe(418);
      expect(lastCall.data.error).toBe("Custom error");
    });

    test("status 속성이 없는 객체는 일반 Error로 처리", () => {
      const context = createMockContext();
      const errorObject = {
        message: "Custom error without status",
        name: "CustomError"
      } as any;

      responseOfError(context, errorObject);
      const lastCall = context.getLastJsonCall();

      expect(lastCall.status).toBe(500);
      expect(lastCall.data.error).toBe("Custom error without status");
    });
  });
});
