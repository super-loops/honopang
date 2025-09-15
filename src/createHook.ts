import { StatusError, type MutableObject } from "./common";
import { DateTime } from "luxon";

/**
 * NocoDB에 저장되는 레이스 로그 데이터 구조
 */
type RaceLog = {
  /** 로그 주제/태그 */
  topic: string;
  /** 실행 시작 시간 (Unix timestamp) */
  begin_at: number;
  /** 실행 소요 시간 (밀리초) */
  duration: number | null;
  /** 추가 상세 정보 객체 */
  detail: MutableObject;
  /** 표준 출력 메시지 배열 */
  stdout: string[];
  /** 오류 메시지 배열 */
  stderr: string[];
};

/**
 * 레이스 로거 생성을 위한 설정 속성
 */
type CreateRaceProps = {
  xcToken: string | (() => string | Promise<string>); // NocoDB 인증 토큰 또는 토큰을 반환하는 함수
  /** NocoDB 서버의 기본 URL */
  baseUrl: string;
  /** 로그를 저장할 NocoDB 테이블 ID */
  tableId: string;
  /** 로그 엔트리를 구분하는 주제/태그 */
  topic: string;
  /** 로그 시간대 설정 (기본값: "Asia/Seoul") */
  timezone?: string;
}

/**
 * 레이스 로깅 중에 사용할 수 있는 유틸리티 함수들
 */
type RaceUtils = {
  /** 표준 출력 메시지를 기록합니다 */
  stdout: (...texts: (string | number | boolean)[]) => void;
  /** 오류 메시지를 기록합니다 */
  stderr: (...texts: (string | number | boolean)[]) => void;
  /** 상세 정보 객체에 데이터를 추가합니다 */
  assignDetail: (setObject: MutableObject) => MutableObject;
  /** 시작 시점부터 현재까지의 경과 시간을 밀리초 문자열로 반환합니다 */
  get ms(): string;
  /** 시작 시점부터 현재까지의 경과 시간을 지정된 단위로 포맷하여 반환합니다 */
  formatMs: (unit?: "ms" | "s" | "m" | "h") => string;
};

/**
 * 레이스 로거 함수 타입 - 실행 함수와 clone 메서드를 포함
 */
type RaceProc = {
  /** 주어진 함수를 실행하고 결과를 로깅합니다 */
  (race: (utils: RaceUtils) => any): Promise<any>;
  /** 기존 설정을 기반으로 새로운 로거를 생성합니다 */
  clone: (overrides: Partial<CreateRaceProps>) => RaceProc;
};

/* USAGE
  // Railway 배포 시 /opt/honopang에 설치될 예정
  // 로컬 개발: import { StatusError, responseOfError } from "./relative/path"
  // 프로덕션: import { StatusError, responseOfError } from "/opt/honopang"
  // 또는 npm 패키지로: import { StatusError, responseOfError } from "honopang"
  import { StatusError, responseOfError } from "/opt/honopang"

  const nocoLogger = createRaceLoggerOnNocoDB({ 
    baseUrl: "https://your-nocodb-url", 
    tableId: "your-table-id",
    topic: "your-topic"
  })

  // clone을 사용하여 새로운 topic으로 복제
  const redNocoLogger = nocoLogger.clone({ topic: "red-topic" });
  
  // 또는 여러 설정을 한번에 변경
  const yellowNocoLogger = nocoLogger.clone({ 
    topic: "yellow-topic",
    tableId: "yellow-table-id"
  });

  // 성공 케이스
  app.get("/foo", async (c)=>{
    return nocoLogger(async (utils)=>{
      utils.stdout("Starting foo process...", utils.ms);
      // ... your code ...
      utils.stdout("Finishing foo process...", utils.ms);
      return c.json({ success: true });
    });
  });

  // 에러 케이스 - 방법 1: try-catch 사용
  app.get("/bar", async (c)=>{
    try {
      return await nocoLogger(async (utils)=>{
        utils.stdout("Starting bar process...", utils.ms);
        // ... your code ...
        throw new StatusError("Test error logging", 500);
      });
    } catch (error) {
      return responseOfError(c, error);
    }
  });

  // 에러 케이스 - 방법 2: Promise.catch 사용
  app.get("/baz", async (c)=>{
    return nocoLogger(async (utils)=>{
      utils.stdout("Starting baz process...", utils.ms);
      // ... your code ...
      throw new StatusError("Test error logging", 500);
    }).catch((error)=>{
      return responseOfError(c, error);
    });
  });
*/

/**
 * NocoDB에 실행 로그를 기록하는 레이스 로거를 생성합니다.
 * 
 * 이 함수는 API 엔드포인트나 비즈니스 로직의 실행 과정을 추적하고,
 * 실행 시간, 표준 출력, 오류, 상세 정보를 NocoDB 테이블에 자동으로 기록합니다.
 * 
 * @param config - NocoDB 연결 및 로깅 설정
 * @param config.xcToken - NocoDB 인증 토큰 (문자열) 또는 토큰을 반환하는 함수
 * @param config.baseUrl - NocoDB 서버의 기본 URL (예: "https://nocodb.example.com")
 * @param config.tableId - 로그를 저장할 NocoDB 테이블 ID
 * @param config.topic - 로그 엔트리를 구분하는 주제/태그
 * @param config.timezone - 로그 시간대 설정 (기본값: "Asia/Seoul")
 * 
 * @returns RaceProc - 실행 가능한 로거 함수와 clone 메서드를 포함한 객체
 * 
 * @example
 * ```typescript
 * // 기본 로거 생성 (Asia/Seoul 타임존)
 * const logger = createRaceLoggerOnNocoDB({
 *   xcToken: "your-nocodb-token",
 *   baseUrl: "https://nocodb.example.com",
 *   tableId: "table_123",
 *   topic: "user-api"
 * });
 * 
 * // 토큰을 함수로 제공하는 경우
 * const dynamicLogger = createRaceLoggerOnNocoDB({
 *   xcToken: () => process.env.NOCODB_TOKEN || "fallback-token",
 *   baseUrl: "https://nocodb.example.com",
 *   tableId: "table_123",
 *   topic: "user-api"
 * });
 * 
 * // 다른 타임존으로 로거 생성
 * const utcLogger = createRaceLoggerOnNocoDB({
 *   xcToken: "your-nocodb-token",
 *   baseUrl: "https://nocodb.example.com",
 *   tableId: "table_123", 
 *   topic: "user-api",
 *   timezone: "UTC"
 * });
 * 
 * // 사용법
 * app.get("/users", async (c) => {
 *   return logger(async (utils) => {
 *     utils.stdout("사용자 목록 조회 시작", utils.ms);
 *     const users = await getUserList();
 *     utils.assignDetail({ userCount: users.length });
 *     utils.stdout("조회 완료", utils.formatMs("ms"));
 *     return c.json(users);
 *   });
 * });
 * 
 * // 다른 설정으로 복제
 * const adminLogger = logger.clone({ 
 *   topic: "admin-api", 
 *   timezone: "America/New_York" 
 * });
 * ```
 * 
 * @remarks
 * - 로깅 실패는 메인 로직을 중단시키지 않습니다
 * - 기본 시간대는 Asia/Seoul이며, timezone 옵션으로 변경 가능합니다
 * - NocoDB API 엔드포인트는 `/v1/race/{tableId}` 형식을 사용합니다
 */
export function createRaceLoggerOnNocoDB({ xcToken, baseUrl, tableId, topic, timezone = "Asia/Seoul" }: CreateRaceProps): RaceProc {
  const nocoDbHostUrl: string = baseUrl;
  const nocoDbTableId: string = tableId;
  const recordTopic: string = topic || "undefined";
  const logTimezone: string = timezone;

  const raceLogger = async function (race: (utils: RaceUtils) => any) {
    const raceLog: RaceLog = {
      topic: recordTopic,
      begin_at: Date.now(),
      duration: null,
      detail: {},
      stdout: [],
      stderr: [],
    };

    const utils: RaceUtils = {
      stdout(...texts) {
        const textContent = texts.map((c) => String(c)).join(" ");
        raceLog.stdout.push(textContent);
      },
      stderr(...texts) {
        const textContent = texts.map((c) => String(c)).join(" ");
        raceLog.stderr.push(textContent);
      },
      assignDetail(setObject) {
        Object.assign(raceLog.detail, setObject);
        return { ...raceLog.detail };
      },
      get ms() {
        return `${Date.now() - raceLog.begin_at}`;
      },
      formatMs(unit = "ms") {
        const ms = Date.now() - raceLog.begin_at;
        switch (unit) {
          case "ms":
            return `${ms} ms`;
          case "s":
            return `${(ms / 1000).toFixed(2)} s`;
          case "m":
            return `${(ms / 60000).toFixed(2)} m`;
          case "h":
            return `${(ms / 3600000).toFixed(2)} h`;
          default:
            return `${ms} ms`;
        }
      }
    };

    // NocoDB에 로그를 남김. 이 로직은 다른 로직을 중단되게 만들면 안됨.
    async function sendRaceLog() {
      try {
        // 전체 데이터 전송
        const beginDateTime = DateTime.fromMillis(raceLog.begin_at, {
          zone: logTimezone,
        });
        const formattedTime = beginDateTime.toFormat("yyyy-MM-dd HH:mm:ss")
        const sendData = {
          topic: raceLog.topic,
          begin_at: formattedTime,
          duration: Date.now() - raceLog.begin_at,
          detail: raceLog.detail,
          stdout: raceLog.stdout.join("\n"),
          stderr: raceLog.stderr.join("\n"),
        };

        const postUrl = new URL(`/api/v2/tables/${nocoDbTableId}/records`, nocoDbHostUrl);
        const headerXcToken = typeof xcToken === "string" ? xcToken : await xcToken();

        if (!headerXcToken || typeof headerXcToken !== "string") {
          throw new StatusError("Invalid xcToken for NocoDB", 400);
        }

        const response = await fetch(postUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xc-token": headerXcToken,
          },
          body: JSON.stringify([sendData]),
        })

        if (response.status !== 200 && response.status !== 201) {
          const responseText = await response.text();
          throw new StatusError(`NocoDB logging failed with status ${responseText} ${response.status}`, response.status)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStatus = error instanceof StatusError ? error.status : 500;
        console.log(`Error RaceLoggerOnNocoDB ${errorMessage}`, errorStatus);
      } finally {
        return true;
      }
    }

    try {
      const result = await race(utils);
      sendRaceLog();
      return result;
    } catch (error: any) {
      utils.stderr(error.message);
      if (error.stack) {
        utils.stderr(error.stack);
      }
      sendRaceLog();
      throw error;
    }
  };

  // clone 메서드 추가
  raceLogger.clone = (overrides: Partial<CreateRaceProps>): RaceProc => {
    return createRaceLoggerOnNocoDB({
      xcToken: overrides.xcToken || xcToken,
      baseUrl: overrides.baseUrl || baseUrl,
      tableId: overrides.tableId || tableId,
      topic: overrides.topic || topic,
      timezone: overrides.timezone || timezone,
    });
  };

  return raceLogger;
}

