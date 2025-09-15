import { type Context } from "hono";
import { type FC } from "hono/jsx";
import { StatusError } from "./common"


/* USAGE
  app.get("/user/foo", (c)=>{
    try {
      throw new Error("Foo Error")
    } catch (error) {
      return responseJsonError(c, error);
    }
  });
  app.get("/user/bar", (c)=>{
    try {
      throw new StatusError("Bar Error", 501)
    }
    catch (error) {
      return responseJsonError(c, error);
    }
  });
*/

export function responseJsonError(c: Context, error: Error | StatusError, verbose: boolean = true) {
  if (verbose) {
    console.error("[ERROR] responeOfError:", error);
  }
  const status: number = 'status' in error ? error.status : 500
  return c.json({ error: error.message }, status as any);
}

export function responseTextError(c: Context, error: Error | StatusError, verbose: boolean = true) {
  if (verbose) {
    console.error("[ERROR] responseTextError:", error);
  }
  const status: number = 'status' in error ? error.status : 500
  return c.text(`Error: ${error.message}`, status as any);
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
      return responseTemplateError(c, error, ErrorPage);
    }
  });
*/

export function responseTemplateError(
  c: Context,
  error: Error | StatusError,
  template?: FC<{ error: Error | StatusError }> | string,
  verbose: boolean = true
) {
  if (verbose) {
    console.error("[ERROR] responseTemplateError:", error);
  }
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