import { type Handler, type Context } from "hono";
import { StatusError } from "./common";
import { responseJsonError } from "./contextResponse";

/* USAGE

  const authHandler = createNextHandlerIfAuthorization(
    async function (token: string) {
      const url = new URL(`/v1/bearer-check/${token}`, OTHER_FUNCTION_INTERNAL_URL);
      const response = await fetch(url, {
        method: "GET",
      });
      if(response.status === 200){
        return true
      } else {
        return false // or
        return new StatusError("Authorization format invaild", response.status) // or
        throw new StatusError("Authorization required", 401)
      }
    }
  )

  app.get("/user/:id", authHandler);
  app.get("/user/:id", (c)=>c.text("Contents"));
*/
export function createNextHandlerIfAuthorization(validateToken: (token: string) => Promise<boolean | StatusError>): Handler {
  return async (c: Context, next): Promise<Response | void> => {
    const authorization = c.req.header("Authorization");
    let token = null;

    try {
      if (!authorization) {
        const error = new StatusError("Authorization required", 403);
        throw error;
      }

      if (authorization.startsWith("Bearer ")) {
        token = authorization.startsWith("Bearer ")
          ? authorization.substring(7)
          : authorization;
      } else {
        const error = new StatusError("Authorization format invaild");
        error.status = 401;
        throw error;
      }

      try {
        const result = await validateToken(token as string)
        if (result instanceof StatusError) {
          throw result
        } else if (result === false) {
          const error = new StatusError("Authorization format invaild", 401);
          throw error;
        }
        if (result === true) {
          return next()
        } else {
          console.error("Unexpected authorization process:", result);
          const error = new StatusError("Internal Server Error: Unexpected authorization process", 500);
          throw error;
        }
      } catch (e) {
        console.error("Error occurred during authorization:", e);
        const error = new StatusError("Internal Server Error", 500);
        throw error;
      }
    } catch (error) {
      return responseJsonError(c, error as (Error | StatusError), false);
    }
  }
}
