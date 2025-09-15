import { describe, test, expect } from "bun:test";
import {
  queryStringify,
  splitQueryString,
  queryStringParse,
  buildUrl
} from "./formHelper";

describe("formHelper", () => {
  describe("queryStringify", () => {
    test("기본 옵션으로 객체를 쿼리 스트링으로 변환", () => {
      const data = { name: "John", age: 30 };
      const result = queryStringify(data);
      expect(result).toBe("name=John&age=30");
    });

    test("배열을 bracket 형태로 변환 (기본값)", () => {
      const data = { colors: ["red", "blue", "green"] };
      const result = queryStringify(data);
      expect(result).toBe("colors[]=red&colors[]=blue&colors[]=green");
    });

    test("배열을 index 형태로 변환", () => {
      const data = { colors: ["red", "blue"] };
      const result = queryStringify(data, { arrayFormat: "index" });
      expect(result).toBe("colors[0]=red&colors[1]=blue");
    });

    test("배열을 none 형태로 변환", () => {
      const data = { colors: ["red", "blue"] };
      const result = queryStringify(data, { arrayFormat: "none" });
      expect(result).toBe("colors=red&colors=blue");
    });

    test("배열을 separator 형태로 변환", () => {
      const data = { colors: ["red", "blue"] };
      const result = queryStringify(data, { arrayFormat: "separator" });
      expect(result).toBe("colors=red,blue");
    });

    test("빈 배열 허용", () => {
      const data = { empty: [] };
      const result = queryStringify(data, { skipEmptyString: false });
      expect(result).toBe("");
    });

    test("빈 배열 허용하지 않음", () => {
      const data = { empty: [] };
      const result = queryStringify(data, { skipEmptyString: true });
      expect(result).toBe("");
    });

    test("인코딩 활성화", () => {
      const data = { message: "Hello World!" };
      const result = queryStringify(data, { encode: true });
      expect(result).toBe("message=Hello%20World%21");
    });

    test("입력 순서 유지 (sort: false)", () => {
      const data = { zebra: "1", apple: "2", banana: "3" };
      const result = queryStringify(data, { sort: false });
      expect(result).toBe("zebra=1&apple=2&banana=3");
    });

    test("알파벳 순서 정렬 (sort 함수 사용)", () => {
      const data = { zebra: "1", apple: "2", banana: "3" };
      const result = queryStringify(data, { sort: (a, b) => a.localeCompare(b) });
      expect(result).toBe("apple=2&banana=3&zebra=1");
    });
  });

  describe("splitQueryString", () => {
    test("완전한 URL에서 쿼리 스트링 분리", () => {
      const url = "https://example.com/path?name=John&age=30";
      const [baseUrl, queryString] = splitQueryString(url);
      expect(baseUrl).toBe("https://example.com/path");
      expect(queryString).toBe("name=John&age=30");
    });

    test("쿼리 스트링이 없는 URL", () => {
      const url = "https://example.com/path";
      const [baseUrl, queryString] = splitQueryString(url);
      expect(baseUrl).toBe("https://example.com/path");
      expect(queryString).toBe("");
    });

    test("쿼리 스트링만 있는 경우", () => {
      const url = "name=John&age=30";
      const [baseUrl, queryString] = splitQueryString(url);
      expect(baseUrl).toBe("");
      expect(queryString).toBe("name=John&age=30");
    });

    test("빈 쿼리 스트링이 있는 URL", () => {
      const url = "https://example.com/path?";
      const [baseUrl, queryString] = splitQueryString(url);
      expect(baseUrl).toBe("https://example.com/path");
      expect(queryString).toBe("");
    });

    test("프래그먼트가 있는 URL", () => {
      const url = "https://example.com/path?name=John#section";
      const [baseUrl, queryString] = splitQueryString(url);
      expect(baseUrl).toBe("https://example.com/path");
      expect(queryString).toBe("name=John#section");
    });
  });

  describe("queryStringParse", () => {
    test("기본 쿼리 스트링 파싱", () => {
      const queryString = "name=John&age=30";
      const result = queryStringParse(queryString);
      expect(result).toEqual({ name: "John", age: "30" });
    });

    test("배열 형태 쿼리 스트링 파싱", () => {
      const queryString = "colors[]=red&colors[]=blue";
      const result = queryStringParse(queryString);
      expect(result).toEqual({ colors: ["red", "blue"] });
    });

    test("빈 쿼리 스트링", () => {
      const queryString = "";
      const result = queryStringParse(queryString);
      expect(result).toEqual({});
    });

    test("URL 포함 쿼리 스트링 파싱", () => {
      const queryString = "https://example.com?name=John&age=30";
      const result = queryStringParse(queryString);
      expect(result).toEqual({ name: "John", age: "30" });
    });

    test("특수 문자가 포함된 값", () => {
      const queryString = "message=Hello%20World!";
      const result = queryStringParse(queryString);
      expect(result).toEqual({ message: "Hello World!" });
    });
  });

  describe("buildUrl", () => {
    test("기본 URL 생성", () => {
      const result = buildUrl("https://example.com");
      expect(result.toString()).toBe("https://example.com/");
    });

    test("경로가 있는 URL 생성", () => {
      const result = buildUrl("https://example.com", "/api/users");
      expect(result.toString()).toBe("https://example.com/api/users");
    });

    test("쿼리 파라미터가 있는 URL 생성", () => {
      const queryParams = { name: "John", age: 30 };
      const result = buildUrl("https://example.com", "/api/users", queryParams);
      expect(result.toString()).toBe("https://example.com/api/users?name=John&age=30");
    });

    test("프래그먼트가 있는 URL 생성", () => {
      const result = buildUrl("https://example.com", "/page", undefined, "section1");
      expect(result.toString()).toBe("https://example.com/page#section1");
    });

    test("모든 요소가 포함된 URL 생성", () => {
      const queryParams = { tab: "profile" };
      const result = buildUrl("https://example.com", "/user", queryParams, "details");
      expect(result.toString()).toBe("https://example.com/user?tab=profile#details");
    });

    test("상대 경로로 URL 생성", () => {
      const result = buildUrl("https://example.com/base", "relative/path");
      expect(result.toString()).toBe("https://example.com/relative/path");
    });
  });
});
