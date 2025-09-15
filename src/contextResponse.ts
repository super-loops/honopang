import { type Context } from "hono";
import { StatusError } from "./common"


/* USAGE
  app.get("/user/foo", (c)=>{
    try {
      throw new Error("Foo Error")
    } catch (error) {
      return responseOfError(c, error);
    }
  });
  app.get("/user/bar", (c)=>{
    try {
      throw new StatusError("Bar Error", 501)
    }
    catch (error) {
      return responseOfError(c, error);
    }
  });
*/

export function responseOfError(c: Context, error: Error | StatusError, verbose: boolean = true) {
  if (verbose) {
    console.error("[ERROR] responeOfError:", error);
  }
  const status: number = 'status' in error ? error.status : 500
  return c.json({ error: error.message }, status as any);
}