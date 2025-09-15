import { describe, test, expect } from "bun:test";
import { responseJsonError, responseTextError, responseHtmlError } from "./contextResponse";
import { StatusError } from "./common";
import type { FC } from "hono/jsx";

describe("responseJsonError", () => {
  describe("StatusError 처리", () => {
    test("StatusError의 status와 message를 올바르게 반환", async () => {
      const error = new StatusError("Not Found", 404);
      const response = responseJsonError(error);

      expect(response.status).toBe(404);
      expect(response.headers.get('Content-Type')).toBe('application/json');

      const body = await response.json();
      expect(body).toEqual({ status: 404, message: "Not Found" });
    });

    test("StatusError의 다양한 상태 코드 처리", async () => {
      const testCases = [
        { message: "Bad Request", status: 400 },
        { message: "Unauthorized", status: 401 },
        { message: "Forbidden", status: 403 },
        { message: "Internal Server Error", status: 500 },
      ];

      for (const testCase of testCases) {
        const error = new StatusError(testCase.message, testCase.status);
        const response = responseJsonError(error);

        expect(response.status).toBe(testCase.status);
        const body = await response.json();
        expect(body).toEqual({ status: testCase.status, message: testCase.message });
      }
    });

    test("숫자로 생성된 StatusError 처리", async () => {
      const error = new StatusError("Teapot", 418);
      const response = responseJsonError(error);

      expect(response.status).toBe(418);
      const body = await response.json();
      expect(body).toEqual({ status: 418, message: "Teapot" });
    });
  });

  describe("일반 Error 처리", () => {
    test("일반 Error는 500 상태 코드로 처리", async () => {
      const error = new Error("Something went wrong");
      const response = responseJsonError(error);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({ status: 500, message: "Something went wrong" });
    });

    test("TypeError 처리", async () => {
      const error = new TypeError("Type error occurred");
      const response = responseJsonError(error);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({ status: 500, message: "Type error occurred" });
    });

    test("ReferenceError 처리", async () => {
      const error = new ReferenceError("Reference error occurred");
      const response = responseJsonError(error);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({ status: 500, message: "Reference error occurred" });
    });
  });

  describe("transform 함수 테스트", () => {
    test("transform 함수가 제공되지 않으면 기본 JSON 반환", async () => {
      const error = new StatusError("Bad Request", 400);
      const response = responseJsonError(error);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ status: 400, message: "Bad Request" });
    });

    test("transform 함수로 JSON 응답을 변환", async () => {
      const error = new StatusError("Bad Request", 400);
      const transform = (json: { status: number; message: string }) => ({
        errorCode: json.status,
        errorMessage: json.message,
        timestamp: "2023-01-01T00:00:00Z"
      });

      const response = responseJsonError(error, transform);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({
        errorCode: 400,
        errorMessage: "Bad Request",
        timestamp: "2023-01-01T00:00:00Z"
      });
    });

    test("transform 함수로 완전히 다른 구조의 응답 생성", async () => {
      const error = new Error("Server Error");
      const transform = () => ({ success: false, data: null });

      const response = responseJsonError(error, transform);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({ success: false, data: null });
    });
  });

  describe("에러 메시지 형태 테스트", () => {
    test("빈 메시지를 가진 Error 처리", async () => {
      const error = new Error("");
      const response = responseJsonError(error);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({ status: 500, message: "" });
    });

    test("긴 메시지를 가진 Error 처리", async () => {
      const longMessage = "A".repeat(1000);
      const error = new StatusError(longMessage, 400);
      const response = responseJsonError(error);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ status: 400, message: longMessage });
    });

    test("특수 문자가 포함된 메시지 처리", async () => {
      const specialMessage = "Error with special chars: #@$%^&*()";
      const error = new StatusError(specialMessage, 400);
      const response = responseJsonError(error);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ status: 400, message: specialMessage });
    });
  });

  describe("응답 형태 검증", () => {
    test("응답 객체의 구조가 올바름", async () => {
      const error = new StatusError("Test error", 400);
      const response = responseJsonError(error);

      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get('Content-Type')).toBe('application/json');

      const body = await response.json();
      expect(body).toHaveProperty("status");
      expect(body).toHaveProperty("message");
    });

    test("JSON 응답 형태로 Response 객체가 반환됨", async () => {
      const error = new StatusError("Test error", 400);
      const response = responseJsonError(error);

      expect(response).toBeDefined();
      expect(response.status).toBe(400);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe("타입 검증 테스트", () => {
    test("status 속성이 있는 객체는 StatusError로 처리", async () => {
      const errorLikeObject = {
        message: "Custom error",
        status: 418,
        name: "CustomError"
      } as any;

      const response = responseJsonError(errorLikeObject);

      expect(response.status).toBe(418);
      const body = await response.json();
      expect(body).toEqual({ status: 418, message: "Custom error" });
    });

    test("status 속성이 없는 객체는 일반 Error로 처리", async () => {
      const errorObject = {
        message: "Custom error without status",
        name: "CustomError"
      } as any;

      const response = responseJsonError(errorObject);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({ status: 500, message: "Custom error without status" });
    });
  });
});

describe("responseTextError", () => {
  describe("StatusError 처리", () => {
    test("StatusError의 status와 message를 텍스트로 올바르게 반환", async () => {
      const error = new StatusError("Not Found", 404);
      const response = responseTextError(error);

      expect(response.status).toBe(404);
      expect(response.headers.get('Content-Type')).toBe('text/plain; charset=UTF-8');
      const body = await response.text();
      expect(body).toBe("Error: Not Found");
    });

    test("다양한 StatusError 상태 코드 처리", async () => {
      const testCases = [
        { message: "Bad Request", status: 400 },
        { message: "Unauthorized", status: 401 },
        { message: "Forbidden", status: 403 },
        { message: "Internal Server Error", status: 500 },
      ];

      for (const testCase of testCases) {
        const error = new StatusError(testCase.message, testCase.status);
        const response = responseTextError(error);

        expect(response.status).toBe(testCase.status);
        const body = await response.text();
        expect(body).toBe(`Error: ${testCase.message}`);
      }
    });
  });

  describe("일반 Error 처리", () => {
    test("일반 Error는 500 상태 코드로 처리", async () => {
      const error = new Error("Something went wrong");
      const response = responseTextError(error);

      expect(response.status).toBe(500);
      expect(response.headers.get('Content-Type')).toBe('text/plain; charset=UTF-8');
      const body = await response.text();
      expect(body).toBe("Error: Something went wrong");
    });
  });

  describe("transform 함수 테스트", () => {
    test("transform 함수가 제공되지 않으면 기본 텍스트 반환", async () => {
      const error = new StatusError("Bad Request", 400);
      const response = responseTextError(error);

      expect(response.status).toBe(400);
      const body = await response.text();
      expect(body).toBe("Error: Bad Request");
    });

    test("transform 함수로 텍스트 응답을 변환", async () => {
      const error = new StatusError("Bad Request", 400);
      const transform = (text: string) => `CUSTOM: ${text} (Code: 400)`;

      const response = responseTextError(error, transform);

      expect(response.status).toBe(400);
      const body = await response.text();
      expect(body).toBe("CUSTOM: Error: Bad Request (Code: 400)");
    });

    test("transform 함수로 완전히 다른 형태의 텍스트 생성", async () => {
      const error = new Error("Server Error");
      const transform = () => "Service temporarily unavailable";

      const response = responseTextError(error, transform);

      expect(response.status).toBe(500);
      const body = await response.text();
      expect(body).toBe("Service temporarily unavailable");
    });
  });
});

describe("responseHtmlError", () => {
  describe("기본 템플릿 처리", () => {
    test("템플릿이 제공되지 않으면 기본 HTML 템플릿 사용", async () => {
      const error = new Error("General Error");
      const response = responseHtmlError(error);

      expect(response.status).toBe(500);
      expect(response.headers.get('Content-Type')).toBe('text/html; charset=UTF-8');
      const body = await response.text();
      expect(body).toBe("<h1>Error</h1><p>General Error</p>");
    });

    test("StatusError에 대한 기본 템플릿", async () => {
      const error = new StatusError("Bad Request", 400);
      const response = responseHtmlError(error);

      expect(response.status).toBe(400);
      const body = await response.text();
      expect(body).toBe("<h1>Error</h1><p>Bad Request</p>");
    });
  });

  describe("문자열 템플릿 처리", () => {
    test("문자열 템플릿을 그대로 HTML로 반환", async () => {
      const error = new StatusError("Forbidden", 403);
      const template = "<html><body><h1>Access Denied</h1></body></html>";
      const response = responseHtmlError(error, template);

      expect(response.status).toBe(403);
      const body = await response.text();
      expect(body).toBe(template);
    });
  });
});
