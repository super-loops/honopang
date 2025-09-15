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
- **Authentication**: Bearer token-based middleware for protected routes
- **Race Logger**: Automatic API execution tracking and NocoDB logging

## Usage

```typescript
import { StatusError } from "honopang";
```

## 📖 API Documentation

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

### responseOfError

Handles errors and returns standardized error responses.

```typescript
app.get("/user/foo", (c) => {
  try {
    throw new Error("Foo Error")
  } catch (error) {
    return responseOfError(c, error);
  }
});

app.get("/user/bar", (c) => {
  try {
    throw new StatusError("Bar Error", 501)
  } catch (error) {
    return responseOfError(c, error);
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

### createRaceLoggerOnNocoDB

A race logger that automatically records execution logs to NocoDB.

```typescript
import { createRaceLoggerOnNocoDB } from "honopang";

// Create basic logger
const logger = createRaceLoggerOnNocoDB({
  xcToken: "nocodb-secret-token",
  baseUrl: "https://mynocodb.app.railway.app",
  tableId: "table_123",
  topic: "user-api",
  timezone: "Asia/Seoul" // Optional, default: "Asia/Seoul"
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
const adminLogger = logger.clone({ topic: "admin-api" });
```

#### Recommended NocoDB Table Structure for createRaceLoggerOnNocoDB

Create a NocoDB table with the following field structure to use Race Logger:

| Field Name | Data Type | Required | Description | Example Value |
|------------|-----------|----------|-------------|---------------|
| `topic` | **SingleLineText** | Recommended | Log topic/tag (index creation recommended) | `"user-api"`, `"admin-operations"` |
| `begin_at` | **DateTime** | Required | Execution start time | `yyyy-MM-dd HH:mm:ss` |
| `duration` | **Number** | Optional | Execution duration (milliseconds) | `1250` |
| `detail` | **JSON** | Optional | Detailed information object | `{"userCount": 42, "status": "success"}` |
| `stdout` | **LongText** | Optional | Standard output logs (separated by newlines) | `"Starting process...\nProcessing data...\nCompleted"` |
| `stderr` | **LongText** | Optional | Error logs (separated by newlines) | `"Warning: deprecated API\nError: connection timeout"` |


## 📝 License

This project contains no special technical innovations. Copying and modification of the code is free until explicitly stated otherwise in a specific version. However, using the project name to damage the reputation of the author or project is prohibited. The author assumes no responsibility for any issues arising from the use of this code.
