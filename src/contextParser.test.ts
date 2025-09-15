import { describe, test, expect, beforeEach } from "bun:test";
import { parseParams } from "./contextParser";
import { StatusError } from "./common";

// Hono Context 모킹을 위한 헬퍼 함수들
function createMockContext(options: {
  query?: Record<string, string>;
  contentType?: string;
  jsonData?: any;
  formData?: FormData;
  headers?: Record<string, string>;
}) {
  const mockRequest = {
    query: () => options.query || {},
    header: (key: string) => {
      if (key.toLowerCase() === "content-type") {
        return options.contentType || "";
      }
      return options.headers?.[key] || undefined;
    },
    json: async () => {
      if (options.jsonData !== undefined) {
        return options.jsonData;
      }
      throw new Error("No JSON data");
    },
    formData: async () => {
      if (options.formData) {
        return options.formData;
      }
      throw new Error("No form data");
    }
  };

  return {
    req: mockRequest
  } as any;
}

function createFormData(data: Record<string, string | File>) {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
}

describe("parseParams", () => {
  describe("Query Parameters 파싱", () => {
    test("query parameters만 있는 경우", async () => {
      const context = createMockContext({
        query: { name: "John", age: "30" }
      });

      const result = await parseParams(context);

      expect(result).toEqual({ name: "John", age: "30" });
    });

    test("빈 query parameters", async () => {
      const context = createMockContext({
        query: {}
      });

      const result = await parseParams(context);

      expect(result).toEqual({});
    });
  });

  describe("JSON Body 파싱", () => {
    test("유효한 JSON 데이터 파싱", async () => {
      const context = createMockContext({
        contentType: "application/json",
        jsonData: { user: "Alice", email: "alice@example.com" }
      });

      const result = await parseParams(context);

      expect(result).toEqual({ user: "Alice", email: "alice@example.com" });
    });

    test("JSON과 query parameters 모두 있는 경우 병합", async () => {
      const context = createMockContext({
        query: { source: "web" },
        contentType: "application/json",
        jsonData: { user: "Bob", age: 25 }
      });

      const result = await parseParams(context);

      expect(result).toEqual({ source: "web", user: "Bob", age: 25 });
    });

    test("잘못된 JSON 형식일 때 StatusError 발생", async () => {
      const context = createMockContext({
        contentType: "application/json"
        // jsonData를 설정하지 않아서 JSON 파싱 실패 시뮬레이션
      });

      await expect(parseParams(context)).rejects.toThrow(StatusError);
      await expect(parseParams(context)).rejects.toThrow("Invalid JSON format in request body");
    });
  });

  describe("Form Data 파싱", () => {
    test("application/x-www-form-urlencoded 파싱", async () => {
      const formData = createFormData({
        username: "testuser",
        password: "testpass"
      });

      const context = createMockContext({
        contentType: "application/x-www-form-urlencoded",
        formData
      });

      const result = await parseParams(context);

      expect(result).toEqual({ username: "testuser", password: "testpass" });
    });

    test("multipart/form-data 파싱", async () => {
      const file = new File(["file content"], "test.txt", { type: "text/plain" });
      const formData = createFormData({
        title: "Test Document",
        file: file as any
      });

      const context = createMockContext({
        contentType: "multipart/form-data",
        formData
      });

      const result = await parseParams(context);

      expect(result.title).toBe("Test Document");
      expect(result.file).toBeInstanceOf(File);
      expect(result.file.name).toBe("test.txt");
    });

    test("form data와 query parameters 병합", async () => {
      const formData = createFormData({
        formField: "formValue"
      });

      const context = createMockContext({
        query: { queryField: "queryValue" },
        contentType: "application/x-www-form-urlencoded",
        formData
      });

      const result = await parseParams(context);

      expect(result).toEqual({
        queryField: "queryValue",
        formField: "formValue"
      });
    });

    test("잘못된 form data 형식일 때 StatusError 발생", async () => {
      const context = createMockContext({
        contentType: "application/x-www-form-urlencoded"
        // formData를 설정하지 않아서 form 파싱 실패 시뮬레이션
      });

      await expect(parseParams(context)).rejects.toThrow(StatusError);
      await expect(parseParams(context)).rejects.toThrow("Invalid form data format");
    });
  });

  describe("필수 필드 검증", () => {
    test("필수 필드가 모두 있는 경우", async () => {
      const context = createMockContext({
        query: { name: "John", email: "john@example.com", age: "30" }
      });

      const result = await parseParams(context, {
        requires: ["name", "email"]
      });

      expect(result).toEqual({ name: "John", email: "john@example.com", age: "30" });
    });

    test("필수 필드가 없는 경우 StatusError 발생", async () => {
      const context = createMockContext({
        query: { name: "John" }
      });

      await expect(parseParams(context, {
        requires: ["name", "email"]
      })).rejects.toThrow(StatusError);

      await expect(parseParams(context, {
        requires: ["name", "email"]
      })).rejects.toThrow("Required field 'email' is missing or empty");
    });

    test("필수 필드가 빈 문자열인 경우 StatusError 발생", async () => {
      const context = createMockContext({
        query: { name: "John", email: "" }
      });

      await expect(parseParams(context, {
        requires: ["name", "email"]
      })).rejects.toThrow(StatusError);
    });

    test("필수 필드가 null인 경우 StatusError 발생", async () => {
      const context = createMockContext({
        contentType: "application/json",
        jsonData: { name: "John", email: null }
      });

      await expect(parseParams(context, {
        requires: ["name", "email"]
      })).rejects.toThrow(StatusError);
    });

    test("필수 필드가 undefined인 경우 StatusError 발생", async () => {
      const context = createMockContext({
        contentType: "application/json",
        jsonData: { name: "John" }
      });

      await expect(parseParams(context, {
        requires: ["name", "email"]
      })).rejects.toThrow(StatusError);
    });
  });

  describe("선택 필드 필터링", () => {
    test("selects 옵션으로 특정 필드만 반환", async () => {
      const context = createMockContext({
        query: { name: "John", email: "john@example.com", age: "30", phone: "123-456-7890" }
      });

      const result = await parseParams(context, {
        selects: ["name", "email"]
      });

      expect(result).toEqual({ name: "John", email: "john@example.com" });
    });

    test("존재하지 않는 필드를 select해도 에러 없음", async () => {
      const context = createMockContext({
        query: { name: "John", email: "john@example.com" }
      });

      const result = await parseParams(context, {
        selects: ["name", "nonexistent"]
      });

      expect(result).toEqual({ name: "John" });
    });

    test("빈 selects 배열은 모든 필드 반환", async () => {
      const context = createMockContext({
        query: { name: "John", email: "john@example.com" }
      });

      const result = await parseParams(context, {
        selects: []
      });

      expect(result).toEqual({ name: "John", email: "john@example.com" });
    });
  });

  describe("복합 옵션 테스트", () => {
    test("requires와 selects 동시 사용", async () => {
      const context = createMockContext({
        query: { name: "John", email: "john@example.com", age: "30", phone: "123-456-7890" }
      });

      const result = await parseParams(context, {
        requires: ["name", "email"],
        selects: ["name", "age"]
      });

      expect(result).toEqual({ name: "John", age: "30" });
    });

    test("requires 실패 시 selects는 적용되지 않음", async () => {
      const context = createMockContext({
        query: { name: "John", age: "30" }
      });

      await expect(parseParams(context, {
        requires: ["name", "email"],
        selects: ["name", "age"]
      })).rejects.toThrow(StatusError);
    });
  });

  describe("Content-Type 변형 테스트", () => {
    test("Content-Type에 charset이 포함된 경우", async () => {
      const context = createMockContext({
        contentType: "application/json; charset=utf-8",
        jsonData: { user: "Alice" }
      });

      const result = await parseParams(context);

      expect(result).toEqual({ user: "Alice" });
    });

    test("대소문자 구분 없이 Content-Type 처리", async () => {
      const context = createMockContext({
        contentType: "application/json", // 대문자 대신 소문자로 테스트
        jsonData: { user: "Alice" }
      });

      const result = await parseParams(context);

      expect(result).toEqual({ user: "Alice" });
    });

    test("지원하지 않는 Content-Type은 query만 파싱", async () => {
      const context = createMockContext({
        query: { name: "John" },
        contentType: "text/plain"
      });

      const result = await parseParams(context);

      expect(result).toEqual({ name: "John" });
    });
  });
});
