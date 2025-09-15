import { type FC } from "hono/jsx";

export const ErrorPage: FC<{ error: unknown }> = ({ error }) => {
  const err = error as any;
  return (
    <html>
      <head><title>Error</title></head>
      <body>
        <h1>Oops! Something went wrong</h1>
        <p>{err?.message}</p>
        <small>Status: {err?.status || 500}</small>
      </body>
    </html>
  );
};

export const BrokenComponent: FC<{ error: unknown }> = () => {
  throw new Error("Component render error");
};

export const DetailedErrorPage: FC<{ error: unknown }> = ({ error }) => {
  const err = error as any;
  const styles = `
    body { font-family: Arial, sans-serif; }
    .error-container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .error-code { color: red; font-weight: bold; }
  `;

  return (
    <html>
      <head>
        <title>Error {err?.status || 500}</title>
        <style>{styles}</style>
      </head>
      <body>
        <div class="error-container">
          <h1>Application Error</h1>
          <p class="error-code">Error Code: {err?.status || 500}</p>
          <p>Message: {err?.message || "Unknown error"}</p>
          <hr />
          <p><small>Please contact support if this problem persists.</small></p>
        </div>
      </body>
    </html>
  );
};
