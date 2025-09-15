// Hono Response 유틸리티 함수들
// Context 없이 직접 Response 객체를 반환하는 방식으로 구현
// 모든 헤더 관리 미들웨어와 완벽히 호환됩니다.

import { type FC } from "hono/jsx";

/* USAGE
  app.get("/user/foo", (c)=>{
    try {
      throw new Error("Foo Error")
    } catch (error) {
      return responseJsonError(error); // Context 없이 사용
    }
  });
  
  app.get("/user/bar", (c)=>{
    try {
      throw new StatusError("Bar Error", 501)
    }
    catch (error) {
      return responseJsonError(error, (json) => {
        return { ...json, detail: { timestamp: new Date().toISOString() } };
      });
    }
  });

  app.get("/user/text", (c)=>{
    try {
      throw new Error("Text Error")
    } catch (error) {
      return responseTextError(error, (text) => `[Error] ${text}`);
    }
  });
*/

export function responseJsonError(
  error: unknown,
  transform?: (json: { status: number; message: string }) => any
): Response {
  const status: number = (typeof error === 'object' && error && 'status' in error) ? (error.status as number) : 500;
  const defaultJson = { status, message: (error as any)?.message };
  const responseJson = transform ? transform(defaultJson) : defaultJson;

  return new Response(JSON.stringify(responseJson), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

export function responseTextError(
  error: unknown,
  transform?: (text: string) => string
): Response {
  const status: number = (typeof error === 'object' && error && 'status' in error) ? (error.status as number) : 500;
  const defaultText = `Error: ${(error as any)?.message}`;
  const responseText = transform ? transform(defaultText) : defaultText;

  return new Response(responseText, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=UTF-8'
    }
  });
}

/* USAGE
  import { type FC } from 'hono/jsx';

  // JSX 컴포넌트를 사용한 에러 페이지
  const ErrorPage: FC<{ error: unknown }> = ({ error }) => (
    <html>
      <head><title>Error</title></head>
      <body>
        <h1>Oops! Something went wrong</h1>
        <p>{(error as any)?.message}</p>
        <small>Status: {(error as any)?.status || 500}</small>
      </body>
    </html>
  );

  app.get("/user/baz", (c)=>{
    try {
      throw new StatusError("Baz Error", 404)
    }
    catch (error) {
      return responseHtmlError(error, ErrorPage);
    }
  });

  // 또는 문자열 템플릿 사용
  app.get("/user/simple", (c)=>{
    try {
      throw new StatusError("Simple Error", 500)
    }
    catch (error) {
      return responseHtmlError(error, `
        <html>
          <head><title>Error</title></head>
          <body>
            <h1>Oops! Something went wrong</h1>
            <p>${(error as any)?.message}</p>
            <small>Status: ${(error as any)?.status || 500}</small>
          </body>
        </html>
      `);
    }
  });
*/

export function responseHtmlError(
  error: unknown,
  template?: FC<{ error: unknown }> | string
): Response {
  const status: number = (typeof error === 'object' && error && 'status' in error) ? (error.status as number) : 500;

  if (template) {
    if (typeof template === 'function') {
      // JSX 컴포넌트인 경우
      try {
        const Component = template;
        const element = Component({ error });
        const htmlString = element ? element.toString() : `<h1>Error</h1><p>${(error as any)?.message}</p>`;

        return new Response(htmlString, {
          status,
          headers: {
            'Content-Type': 'text/html; charset=UTF-8'
          }
        });
      } catch (renderError) {
        console.error("[ERROR] Failed to render template component:", renderError);
        return new Response(`<h1>Error</h1><p>${(error as any)?.message}</p>`, {
          status,
          headers: {
            'Content-Type': 'text/html; charset=UTF-8'
          }
        });
      }
    } else {
      // 문자열 템플릿인 경우
      return new Response(template, {
        status,
        headers: {
          'Content-Type': 'text/html; charset=UTF-8'
        }
      });
    }
  } else {
    // 기본 템플릿
    const html = `<h1>Error</h1><p>${(error as any)?.message}</p>`;
    return new Response(html, {
      status,
      headers: {
        'Content-Type': 'text/html; charset=UTF-8'
      }
    });
  }
}