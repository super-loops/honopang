import { type Context } from "hono";
import { type FC } from "hono/jsx";
import { StatusError } from "./common"


/* USAGE
  app.get("/user/foo", (c)=>{
    try {
      throw new Error("Foo Error")
    } catch (error) {
      return responseJsonError(c, error); // 기본 렌더링
    }
  });
  
  app.get("/user/bar", (c)=>{
    try {
      throw new StatusError("Bar Error", 501)
    }
    catch (error) {
      return responseJsonError(c, error, (json) => {
        return { ...json, detail: { timestamp: new Date().toISOString() } };
      });
    }
  });

  app.get("/user/text", (c)=>{
    try {
      throw new Error("Text Error")
    } catch (error) {
      return responseTextError(c, error, (text) => `[Error] ${text}`);
    }
  });
*/

export function responseJsonError(
  c: Context,
  error: Error | StatusError,
  transform?: (json: { status: number; message: string }) => any
) {
  const status: number = 'status' in error ? error.status : 500;
  const defaultJson = { status, message: error.message };
  const responseJson = transform ? transform(defaultJson) : defaultJson;
  return c.json(responseJson, status as any);
}

export function responseTextError(
  c: Context,
  error: Error | StatusError,
  transform?: (text: string) => string
) {
  const status: number = 'status' in error ? error.status : 500;
  const defaultText = `Error: ${error.message}`;
  const responseText = transform ? transform(defaultText) : defaultText;
  return c.text(responseText, status as any);
}

/* USAGE
  import { jsx } from 'hono/jsx';
  import { type FC } from 'hono/jsx';

  // JSX 컴포넌트를 사용한 에러 페이지
  const ErrorPage: FC<{ error: Error | StatusError }> = ({ error }) => (
    <html>
      <head><title>Error</title></head>
      <body>
        <h1>Oops! Something went wrong</h1>
        <p>{error.message}</p>
        <small>Status: {'status' in error ? error.status : 500}</small>
      </body>
    </html>
  );

  app.get("/user/baz", (c)=>{
    try {
      throw new StatusError("Baz Error", 404)
    }
    catch (error) {
      return responseHtmlError(c, error, ErrorPage);
    }
  });
*/

export function responseHtmlError(
  c: Context,
  error: Error | StatusError,
  template?: FC<{ error: Error | StatusError }> | string
) {
  const status: number = 'status' in error ? error.status : 500;

  if (template) {
    if (typeof template === 'function') {
      // JSX 컴포넌트인 경우
      try {
        const Component = template;
        const element = Component({ error });
        const htmlString = element ? element.toString() : `<h1>Error</h1><p>${error.message}</p>`;
        return c.html(htmlString, status as any);
      } catch (renderError) {
        console.error("[ERROR] Failed to render template component:", renderError);
        return c.html(`<h1>Error</h1><p>${error.message}</p>`, status as any);
      }
    } else {
      // 문자열 템플릿인 경우
      return c.html(template, status as any);
    }
  } else {
    // 기본 템플릿
    return c.html(`<h1>Error</h1><p>${error.message}</p>`, status as any);
  }
}