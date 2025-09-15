
// NaN 평가 함수 (it:any):boolean
export const isAbsoluteNaN = function (it: unknown): boolean {
  // eslint-disable-next-line no-self-compare
  return it !== it && typeof it === 'number';
};
// null이나 undefined를 확인하기 위한 함수
export const isNone = function (data: unknown): boolean {
  return isAbsoluteNaN(data) || data === undefined || data === null;
};
// 순수 Array를 확인하기 위한 함수
export const isArray = function (data: unknown): boolean {
  return Array.isArray(data) || data instanceof Array;
};
// array이면 그대로 리턴 아니면 Array로 변경하여 리턴함
export const asArray = function (data: any, defaultArray: any): any[] {
  if (isArray(data)) {
    return data as any[];
  }
  if (isNone(data)) {
    return isArray(defaultArray) ? [...(defaultArray as any[])] : isNone(defaultArray) ? [] : [defaultArray];
  }
  return [data];
};
// 순수 Object를 확인하기 위한 함수
export const isPlainObject = function (data: unknown): boolean {
  return typeof data === 'object' && data !== null && data.constructor === Object;
};
// doit: do expression과 유사하게 동작하면서, 파라미터(it)를 넘기는 기능이 포함된 함수입니다.
// 사용법:
// doit(5, x => x * 2) // 10
// doit(5, x => { throw new Error('fail') }, (e, it) => it) // 5
export const doit = <T>(it: T, fn: (a: T) => unknown = (a: T) => (a), catchFn?: (e: unknown, it: T) => unknown): unknown => {
  if (typeof fn === 'function') {
    if (typeof catchFn === 'function') {
      try {
        return fn(it);
      } catch (e) {
        return catchFn(e, it);
      }
    } else {
      return fn(it);
    }
  }
  return undefined;
};

// begin: rails의 begin과 유사한 구현체로, 예외 처리를 포함하여 함수(fn)를 실행합니다.
// 사용법 예시:
// begin(() => { throw new Error('fail') }, e => 'error') // 'error'
// begin(() => 1 + 1) // 2
export const begin = (fn: () => unknown, catchFn?: (e: unknown) => unknown): unknown => {
  if (typeof fn === 'function') {
    if (typeof catchFn === 'function') {
      try {
        return fn();
      } catch (e) {
        return catchFn(e);
      }
    } else {
      return fn();
    }
  }
  return undefined;
};