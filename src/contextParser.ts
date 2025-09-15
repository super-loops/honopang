import { type Context } from "hono";
import { StatusError } from "./common";

/**
 * HTTP 요청에서 파라미터를 파싱하고 검증
 * @param c - Hono Context 객체
 * @param options - 파싱 옵션
 * @param options.selects - 반환할 필드명 배열
 * @param options.requires - 필수 필드명 배열
 * @returns 파싱된 파라미터 객체
 * @throws {StatusError} 필수 필드 누락 또는 파싱 실패 시
 */
export async function parseParams(
  c: Context,
  options?: {
    selects?: string[];
    requires?: string[];
  }
): Promise<Record<string, any>> {
  let params: any = {};

  // Query parameters 가져오기
  const queryParams = c.req.query();
  params = { ...params, ...queryParams };

  // Content-Type에 따라 body 데이터 파싱
  const contentType = c.req.header("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const jsonData = await c.req.json();
      params = { ...params, ...jsonData };
    } catch (e) {
      // JSON 파싱 실패시
      throw new StatusError("Invalid JSON format in request body", 400);
    }
  } else if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    try {
      const formData = await c.req.formData();
      const formObject: any = {};
      formData.forEach((value, key) => {
        // 파일 업로드와 일반 값 구분
        if (value instanceof File) {
          formObject[key] = value;
        } else {
          // 숫자나 불린 값 자동 변환 고려
          formObject[key] = value;
        }
      });
      params = { ...params, ...formObject };
    } catch (e) {
      throw new StatusError("Invalid form data format", 400);
    }
  }

  // 필수 필드 검증
  if (options?.requires) {
    for (const field of options.requires) {
      const value = params[field];
      if (value === undefined || value === null || value === '') {
        throw new StatusError(`Required field '${field}' is missing or empty`, 400);
      }
    }
  }

  // 선택된 필드만 반환
  if (options?.selects && options.selects.length > 0) {
    const selectedParams: Record<string, any> = {};
    for (const field of options.selects) {
      if (params[field] !== undefined) {
        selectedParams[field] = params[field];
      }
    }
    return selectedParams;
  }

  return params;
}