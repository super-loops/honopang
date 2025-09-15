[![npm version](https://img.shields.io/npm/v/honopang)](https://www.npmjs.com/package/honopang)

# Honopang (on Railway Functions) 🚂

A utility library for Bun functions on Railway.

## Why Honopang Exists

- Difficult to apply consistent scripts across each node in Railway
- Want to simply handle requests and responses
- Want to easily protect APIs
- Want to automatically record API execution logs to NocoDB

## ⚠️ Before Using This Library

**This library is specifically designed for Railway's Bun runtime environment only.**

Please note that this library is specifically designed for Railway's Bun and Hono environment, and has not been tested in other environments.

- **Runtime**: Bun v1.2.8+
- **Platform**: Railway Functions only
- **Included Framework**: Hono, luxon
- **Target**: Railway Bun Functions

⚠️ **Important**: This code was made public only because Railway's bun-function does not support private code dependencies. If Railway had supported private code usage, this library would not have been released publicly. Please consider carefully whether this library is truly helpful for your use case before using it.

## 🎯 Key Features

- **Request Payload Parsing**: Auto-parse and validate requests from various Content-Types
- **Error Handling**: HTTP status error management with standardized responses
- **Simple Authentication**: Bearer token-based middleware for protected routes
- **Trace Logger**: Automatic API execution tracking and NocoDB logging

## Usage

```typescript
import { StatusError } from "honopang";
```

## 📖 API Documentation

### parseParams
Automatically parses parameters from various formats including query strings, form data, and JSON.

```typescript
import { parseParams } from "honopang";

app.post("/users", async (c) => {
  // Parse all parameters
  const params = await parseParams(c);
  
  // Validate required fields
  const params = await parseParams(c, {
    requires: ["name", "email"]
  });
  
  // Select specific fields only
  const params = await parseParams(c, {
    selects: ["name", "email", "age"],
    requires: ["name", "email"]
  });
  
  return c.json({ success: true, data: params });
});
```

### StatusError

A custom error class that handles HTTP status codes.

```typescript
import { StatusError } from "honopang";

throw new StatusError("Not Found", 404);
throw new StatusError(404); // Automatically generates "Not Found" message

try {
  throw new StatusError("Unauthorized", 401);
} catch (error) {
  if (error instanceof StatusError) {
    console.log(error.message); // "Unauthorized"
    console.log(error.status); // 401
  }
}

try {
  throw new StatusError(401);
} catch (error) {
  if (error instanceof StatusError) {
    console.log(error.message); // "Unauthorized"
    console.log(error.status); // 401
  }
}
```

### responseJsonError
Handles errors and returns standardized JSON error responses.

```typescript
import { responseJsonError } from "honopang";

// Basic usage - simple error handling
app.get("/user/simple", (c) => {
  try {
    throw new Error("Something went wrong");
  } catch (error) {
    return responseJsonError(error);
    // Returns: { status: 500, message: "Something went wrong" }
  }
});

app.get("/user/status", (c) => {
  try {
    throw new StatusError("User not found", 404);
  } catch (error) {
    return responseJsonError(error);
    // Returns: { status: 404, message: "User not found" }
  }
});

// Advanced usage - with transform function
app.get("/user/detailed", (c) => {
  try {
    throw new StatusError("Validation failed", 400);
  } catch (error) {
    return responseJsonError(error, (json) => {
      return { 
        ...json, 
        timestamp: new Date().toISOString(),
        requestId: "req_12345"
      };
    });
  }
});
```

### responseTextError
Handles errors and returns plain text error responses.

```typescript
import { responseTextError } from "honopang";

// Basic usage - simple error handling
app.get("/api/status", (c) => {
  try {
    throw new StatusError("Service Unavailable", 503);
  } catch (error) {
    return responseTextError(error);
    // Returns: "Error: Service Unavailable" with status 503
  }
});

// Advanced usage - with transform function
app.get("/api/logs", (c) => {
  try {
    throw new StatusError("Log file not found", 404);
  } catch (error) {
    return responseTextError(error, (text) => `[API ERROR] ${text}`);
    // Returns: "[API ERROR] Error: Log file not found" with status 404
  }
});

```

### responseHtmlError
Handles errors and returns HTML responses with customizable templates.

```typescript
import { responseHtmlError } from "honopang";
import { type FC } from 'hono/jsx';

// Basic usage - default template
app.get("/page/simple", (c) => {
  try {
    throw new Error("Page error");
  } catch (error) {
    return responseHtmlError(error);
    // Returns: "<h1>Error</h1><p>Page error</p>" with status 500
  }
});

// Advanced usage - JSX component template
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

app.get("/page/user", (c) => {
  try {
    throw new StatusError("User Not Found", 404);
  } catch (error) {
    return responseHtmlError(error, ErrorPage);
  }
});

// Advanced usage - String template
app.get("/page/admin", (c) => {
  try {
    throw new StatusError("Access Denied", 403);
  } catch (error) {
    const template = `<html><body><h1>Access Denied</h1><p>${error.message}</p></body></html>`;
    return responseHtmlError(error, template);
  }
});
```

### createNextHandlerIfAuthorization

Creates Bearer token-based authentication middleware.

```typescript
import { createNextHandlerIfAuthorization } from "honopang";

const tokens = ["secret-tokens-abcdef12345"];
const authHandler = createNextHandlerIfAuthorization(
  async function (token: string) {
    if (!token) {
      throw new StatusError("Authorization required", 401);
    }
    return tokens.includes(token);
  }
);

app.use("/user/*", authHandler);
app.get("/user/:id", (c) => c.text("Protected content"));
```

### createTraceLoggerOnNocoDB

A trace logger that automatically records execution logs to NocoDB.

```typescript
import { createTraceLoggerOnNocoDB } from "honopang";

// Create basic logger
const logger = createTraceLoggerOnNocoDB({
  xcToken: "nocodb-secret-token",
  baseUrl: "https://mynocodb.app.railway.app",
  tableId: "table_123",
  topic: "user-api",
  // timezone: "Asia/Seoul" // Optional, default: "UTC"
});

// Usage example
app.get("/users", async (c) => {
  return logger(async (utils) => {
    utils.stdout("Starting user list retrieval", utils.ms);
    const users = await getUserList();
    utils.assignDetail({ userCount: users.length });
    utils.stdout("Retrieval completed", utils.formatMs("ms"));
    return c.json(users);
  });
});

// Clone configuration
const adminLogger = logger.cloneWith({ topic: "admin-api" });
```

#### Recommended NocoDB Table Structure for createTraceLoggerOnNocoDB

Create a NocoDB table with the following field structure to use Trace Logger:

| Field Name | Data Type | Required | Description | Example Value |
|------------|-----------|----------|-------------|---------------|
| `topic` | **SingleLineText** | Recommended | Log topic/tag (index creation recommended) | `"user-api"`, `"admin-operations"` |
| `begin_at` | **DateTime** | Required | Execution start time | `yyyy-MM-dd HH:mm:ss` |
| `duration` | **Number** | Optional | Execution duration (milliseconds) | `1250` |
| `detail` | **JSON** | Optional | Detailed information object | `{"userCount": 42, "status": "success"}` |
| `stdout` | **LongText** | Optional | Standard output logs (separated by newlines) | `"Starting process...\nProcessing data...\nCompleted"` |
| `stderr` | **LongText** | Optional | Error logs (separated by newlines) | `"Warning: deprecated API\nError: connection timeout"` |


### buildUrl

Builds a complete URL from base URL, path, query parameters, and fragment.

```typescript
import { buildUrl } from "honopang";
const url:URL = buildUrl("https://api.example.com", "/users", { page: 2, limit: 20 });
const urlString:string = url.toString();
// Result: "https://api.example.com/users?page=2&limit=20"
fetch(url); // or fetch(urlString);
```

### begin

A helper function primarily used when declaring const variables in multiline format.

```typescript
import { begin } from "honopang";
const config = begin(()=>{
  const port = parseInt(process.env.PORT || "3000", 10);
  const schema = port === 443 ? "https" : "http";
  return { port, schema };
})
```
