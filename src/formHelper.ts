import { type MutableObject } from "./common";
import queryString from "query-string";

type QueryStringifyOptions = {
  encode?: boolean; // 기본값: false
  arrayFormat?: "index" | "bracket" | "none" | "separator"; // 기본값: "bracket"
  skipEmptyString?: boolean; // 기본값: false (빈 배열 허용)
  sort?: false | ((itemLeft: string, itemRight: string) => number); // 기본값: false (입력 순서 유지)
}

export function queryStringify(data: MutableObject, { encode = false, arrayFormat = "bracket", skipEmptyString = false, sort = false }: QueryStringifyOptions = {}): string {
  return queryString.stringify(data, { encode, arrayFormat, skipEmptyString, sort })
}

export function splitQueryString(url: string) {
  const queryStartIndex = url.indexOf("?")
  if (queryStartIndex === -1) {
    if (/^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//.test(url)) {
      return [url, ""]
    } else {
      return ["", url]
    }
  }
  const queryString = url.slice(queryStartIndex + 1)
  return [url.slice(0, queryStartIndex), (queryString || "")]
}

export function queryStringParse(queryStringInput: string): MutableObject {
  const [baseUrl, originalQs] = splitQueryString(queryStringInput)
  return queryString.parse(originalQs || "", { arrayFormat: 'bracket' }) as MutableObject
}

export function buildUrl(baseUrl: string, path?: string, queryParams?: MutableObject, fragment?: string): URL {
  const urlObject = path ? new URL(path, baseUrl) : new URL(baseUrl);
  if (queryParams) {
    urlObject.search = queryStringify(queryParams);
  }
  if (fragment) {
    urlObject.hash = fragment;
  }
  return urlObject
}