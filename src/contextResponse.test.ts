import { describe, test, expect, spyOn } from "bun:test";
import { responseJsonError, responseTextError, responseTemplateError } from "./contextResponse";
import { StatusError } from "./common";
import { type FC } from "hono/jsx";

// Hono Context 모킹 - 실제 동작을 시뮬레이션
function createMockContext() {
  const jsonResponses: Array<{ data: any; status: number }> = [];
  const textResponses: Array<{ text: string; status: number }> = [];
  const htmlResponses: Array<{ html: string; status: number }> = [];

  return {
    json: (data: any, status?: number) => {
      const response = { data, status: status || 200 };
      jsonResponses.push(response);
      return response;
    },
    text: (text: string, status?: number) => {
      const response = { text, status: status || 200 };
      textResponses.push(response);
      return response;
    },
    html: (html: string, status?: number) => {
      const response = { html, status: status || 200 };
      htmlResponses.push(response);
      return response;
    },
    getLastJsonCall: () => jsonResponses[jsonResponses.length - 1],
    getLastTextCall: () => textResponses[textResponses.length - 1],
    getLastHtmlCall: () => htmlResponses[htmlResponses.length - 1]
  } as any;
}

describe("responseJsonError", () => {
  describe("StatusError 처리", () => {
    test("StatusError의 status와 message를 올바르게 반환", () => {
      const context = createMockContext();
      const error = new StatusError("Not Found", 404);

      responseJsonError(context, error);
      const lastCall = context.getLastJsonCall();

      expect(lastCall.data).toEqual({ status: 404, message: "Not Found" });
      expect(lastCall.status).toBe(404);
    });

    test("StatusError의 다양한 상태 코드 처리", () => {
      const context = createMockContext();

      // 400 Bad Request
      const badRequestError = new StatusError("Bad Request", 400);
      responseJsonError(context, badRequestError);
      let lastCall = context.getLastJsonCall();
      expect(lastCall.status).toBe(400);
      expect(lastCall.data).toEqual({ status: 400, message: "Bad Request" });

      // 500 Internal Server Error
      const serverError = new StatusError("Internal Server Error", 500);
      responseJsonError(context, serverError);
      lastCall = context.getLastJsonCall();
      expect(lastCall.status).toBe(500);
      expect(lastCall.data).toEqual({ status: 500, message: "Internal Server Error" });

      // 401 Unauthorized
      const unauthorizedError = new StatusError("Unauthorized", 401);
      responseJsonError(context, unauthorizedError);
      lastCall = context.getLastJsonCall();
      expect(lastCall.status).toBe(401);
      expect(lastCall.data).toEqual({ status: 401, message: "Unauthorized" });
    });

    test("숫자로 생성된 StatusError 처리", () => {
      const context = createMockContext();
      const error = new StatusError(422); // "Unprocessable Entity"

      responseJsonError(context, error);
      const lastCall = context.getLastJsonCall();

      expect(lastCall.data).toEqual({ status: 422, message: "Unprocessable Entity" });
      expect(lastCall.status).toBe(422);
    });
  });

  describe("일반 Error 처리", () => {
    test("일반 Error는 500 상태 코드로 처리", () => {
      const context = createMockContext();
      const error = new Error("Something went wrong");

      responseJsonError(context, error);
      const lastCall = context.getLastJsonCall();

      expect(lastCall.data).toEqual({ status: 500, message: "Something went wrong" });
      expect(lastCall.status).toBe(500);
    });

    test("TypeError 처리", () => {
      const context = createMockContext();
      const error = new TypeError("Type error occurred");

      responseJsonError(context, error);
      const lastCall = context.getLastJsonCall();

      expect(lastCall.data).toEqual({ status: 500, message: "Type error occurred" });
      expect(lastCall.status).toBe(500);
    });

    test("ReferenceError 처리", () => {
      const context = createMockContext();
      const error = new ReferenceError("Reference error occurred");

      responseJsonError(context, error);
      const lastCall = context.getLastJsonCall();

      expect(lastCall.data).toEqual({ status: 500, message: "Reference error occurred" });
      expect(lastCall.status).toBe(500);
    });
  });

  describe("verbose 옵션 테스트", () => {
    test("verbose=true (기본값)일 때 console.error 호출", () => {
      const consoleSpy = spyOn(console, "error").mockImplementation(() => { });
      const context = createMockContext();
      const error = new StatusError("Test error", 400);

      responseJsonError(context, error, true);

      expect(consoleSpy).toHaveBeenCalledWith("[ERROR] responeOfError:", error);
      consoleSpy.mockRestore();
    });

    test("verbose=false일 때 console.error 호출하지 않음", () => {
      const consoleSpy = spyOn(console, "error").mockImplementation(() => { });
      const context = createMockContext();
      const error = new StatusError("Test error", 400);

      responseJsonError(context, error, false);

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test("verbose 매개변수를 생략하면 기본값 true로 동작", () => {
      const consoleSpy = spyOn(console, "error").mockImplementation(() => { });
      const context = createMockContext();
      const error = new StatusError("Test error", 400);

      responseJsonError(context, error);

      expect(consoleSpy).toHaveBeenCalledWith("[ERROR] responeOfError:", error);
      consoleSpy.mockRestore();
    });
  });

  describe("에러 메시지 형태 테스트", () => {
    test("빈 메시지를 가진 Error 처리", () => {
      const context = createMockContext();
      const error = new Error("");

      responseJsonError(context, error);
      const lastCall = context.getLastJsonCall();

      expect(lastCall.data).toEqual({ status: 500, message: "" });
      expect(lastCall.status).toBe(500);
    });

    test("긴 메시지를 가진 Error 처리", () => {
      const context = createMockContext();
      const longMessage = "A".repeat(1000);
      const error = new StatusError(longMessage, 400);

      responseJsonError(context, error);
      const lastCall = context.getLastJsonCall();

      expect(lastCall.data).toEqual({ status: 400, message: longMessage });
      expect(lastCall.status).toBe(400);
    });

    test("특수 문자가 포함된 메시지 처리", () => {
      const context = createMockContext();
      const specialMessage = "Error with 특수문자 and symbols: !@#$%^&*()";
      const error = new StatusError(specialMessage, 400);

      responseJsonError(context, error);
      const lastCall = context.getLastJsonCall();

      expect(lastCall.data).toEqual({ status: 400, message: specialMessage });
      expect(lastCall.status).toBe(400);
    });
  });

  describe("응답 형태 검증", () => {
    test("응답 객체의 구조가 올바름", () => {
      const context = createMockContext();
      const error = new StatusError("Test error", 400);

      responseJsonError(context, error);
      const lastCall = context.getLastJsonCall();

      expect(lastCall).toHaveProperty("data");
      expect(lastCall).toHaveProperty("status");
      expect(lastCall.data).toHaveProperty("status");
      expect(lastCall.data).toHaveProperty("message");
      expect(typeof lastCall.data.status).toBe("number");
      expect(typeof lastCall.data.message).toBe("string");
      expect(typeof lastCall.status).toBe("number");
    });

    test("JSON 응답 형태로 c.json이 호출됨", () => {
      const context = createMockContext();
      const error = new StatusError("Test error", 400);

      responseJsonError(context, error);
      const lastCall = context.getLastJsonCall();

      // c.json이 호출되었는지 확인
      expect(lastCall).toBeDefined();
      expect(lastCall.data).toEqual({ status: 400, message: "Test error" });
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

      responseJsonError(context, errorLikeObject);
      const lastCall = context.getLastJsonCall();

      expect(lastCall.status).toBe(418);
      expect(lastCall.data).toEqual({ status: 418, message: "Custom error" });
    });

    test("status 속성이 없는 객체는 일반 Error로 처리", () => {
      const context = createMockContext();
      const errorObject = {
        message: "Custom error without status",
        name: "CustomError"
      } as any;

      responseJsonError(context, errorObject);
      const lastCall = context.getLastJsonCall();

      expect(lastCall.status).toBe(500);
      expect(lastCall.data).toEqual({ status: 500, message: "Custom error without status" });
    });
  });
});

describe("responseTextError", () => {
  describe("StatusError 처리", () => {
    test("StatusError의 status와 message를 텍스트로 올바르게 반환", () => {
      const context = createMockContext();
      const error = new StatusError("Not Found", 404);

      responseTextError(context, error);
      const lastCall = context.getLastTextCall();

      expect(lastCall.text).toBe("Error: Not Found");
      expect(lastCall.status).toBe(404);
    });

    test("다양한 StatusError 상태 코드 처리", () => {
      const context = createMockContext();

      // 400 Bad Request
      const badRequestError = new StatusError("Bad Request", 400);
      responseTextError(context, badRequestError);
      let lastCall = context.getLastTextCall();
      expect(lastCall.status).toBe(400);
      expect(lastCall.text).toBe("Error: Bad Request");

      // 500 Internal Server Error
      const serverError = new StatusError("Internal Server Error", 500);
      responseTextError(context, serverError);
      lastCall = context.getLastTextCall();
      expect(lastCall.status).toBe(500);
      expect(lastCall.text).toBe("Error: Internal Server Error");
    });
  });

  describe("일반 Error 처리", () => {
    test("일반 Error는 500 상태 코드로 처리", () => {
      const context = createMockContext();
      const error = new Error("Something went wrong");

      responseTextError(context, error);
      const lastCall = context.getLastTextCall();

      expect(lastCall.text).toBe("Error: Something went wrong");
      expect(lastCall.status).toBe(500);
    });
  });

  describe("verbose 옵션 테스트", () => {
    test("verbose=true (기본값)일 때 console.error 호출", () => {
      const consoleSpy = spyOn(console, "error").mockImplementation(() => { });
      const context = createMockContext();
      const error = new StatusError("Test error", 400);

      responseTextError(context, error, true);

      expect(consoleSpy).toHaveBeenCalledWith("[ERROR] responseTextError:", error);
      consoleSpy.mockRestore();
    });

    test("verbose=false일 때 console.error 호출하지 않음", () => {
      const consoleSpy = spyOn(console, "error").mockImplementation(() => { });
      const context = createMockContext();
      const error = new StatusError("Test error", 400);

      responseTextError(context, error, false);

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

describe("responseTemplateError", () => {
  describe("JSX 컴포넌트 템플릿 처리", () => {
    test("JSX 컴포넌트를 HTML로 렌더링", () => {
      const context = createMockContext();
      const error = new StatusError("Page Not Found", 404);

      const ErrorComponent: FC<{ error: Error | StatusError }> = ({ error }) => ({
        toString: () => `<div><h1>Error ${('status' in error ? error.status : 500)}</h1><p>${error.message}</p></div>`
      } as any);

      responseTemplateError(context, error, ErrorComponent);
      const lastCall = context.getLastHtmlCall();

      expect(lastCall.html).toBe("<div><h1>Error 404</h1><p>Page Not Found</p></div>");
      expect(lastCall.status).toBe(404);
    });

    test("JSX 컴포넌트 렌더링 실패 시 기본 템플릿 사용", () => {
      const context = createMockContext();
      const error = new StatusError("Server Error", 500);

      const FailingComponent: FC<{ error: Error | StatusError }> = () => {
        throw new Error("Render failed");
      };

      responseTemplateError(context, error, FailingComponent);
      const lastCall = context.getLastHtmlCall();

      expect(lastCall.html).toBe("<h1>Error</h1><p>Server Error</p>");
      expect(lastCall.status).toBe(500);
    });
  });

  describe("문자열 템플릿 처리", () => {
    test("문자열 템플릿을 그대로 HTML로 반환", () => {
      const context = createMockContext();
      const error = new StatusError("Forbidden", 403);
      const template = "<html><body><h1>Access Denied</h1></body></html>";

      responseTemplateError(context, error, template);
      const lastCall = context.getLastHtmlCall();

      expect(lastCall.html).toBe(template);
      expect(lastCall.status).toBe(403);
    });
  });

  describe("기본 템플릿 처리", () => {
    test("템플릿이 제공되지 않으면 기본 HTML 템플릿 사용", () => {
      const context = createMockContext();
      const error = new Error("General Error");

      responseTemplateError(context, error);
      const lastCall = context.getLastHtmlCall();

      expect(lastCall.html).toBe("<h1>Error</h1><p>General Error</p>");
      expect(lastCall.status).toBe(500);
    });

    test("StatusError에 대한 기본 템플릿", () => {
      const context = createMockContext();
      const error = new StatusError("Bad Request", 400);

      responseTemplateError(context, error);
      const lastCall = context.getLastHtmlCall();

      expect(lastCall.html).toBe("<h1>Error</h1><p>Bad Request</p>");
      expect(lastCall.status).toBe(400);
    });
  });

  describe("verbose 옵션 테스트", () => {
    test("verbose=true (기본값)일 때 console.error 호출", () => {
      const consoleSpy = spyOn(console, "error").mockImplementation(() => { });
      const context = createMockContext();
      const error = new StatusError("Test error", 400);

      responseTemplateError(context, error, undefined, true);

      expect(consoleSpy).toHaveBeenCalledWith("[ERROR] responseTemplateError:", error);
      consoleSpy.mockRestore();
    });

    test("verbose=false일 때 console.error 호출하지 않음", () => {
      const consoleSpy = spyOn(console, "error").mockImplementation(() => { });
      const context = createMockContext();
      const error = new StatusError("Test error", 400);

      responseTemplateError(context, error, undefined, false);

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
