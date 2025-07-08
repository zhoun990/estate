export const getObjectKeys = <T extends Record<any, any>>(
  obj: T
): Array<keyof T> => (obj ? Object.keys(obj) : []);

export const isFunction = (f: unknown): f is Function =>
  typeof f === "function";
export const isKey = <T extends Object>(
  target: T,
  prop: any
): prop is keyof T => prop in target;
export const isPromise = (obj: any): obj is Promise<unknown> => {
  return obj instanceof Promise;
};
export function generateRandomID(length: number) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let randomID = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomID += characters.charAt(randomIndex);
  }

  return randomID;
}

export function clone<T = any>(
  value: T,
  /** `seen` is a map to check for circular references. It is used internally, there is no need to pass it from the outside. */
  seen = new WeakMap()
): T {
  // null or primitive values
  if (value === null || typeof value !== "object") {
    return value;
  }

  // 循環参照をチェック
  if (seen.has(value as any)) {
    return seen.get(value as any);
  }

  let cloned: any;

  // Handle Map
  if (value instanceof Map) {
    cloned = new Map();
    seen.set(value as any, cloned);
    for (const [key, val] of value.entries()) {
      cloned.set(clone(key, seen), clone(val, seen));
    }
    return cloned as T;
  }

  // Handle Set
  if (value instanceof Set) {
    cloned = new Set();
    seen.set(value as any, cloned);
    for (const val of value.values()) {
      cloned.add(clone(val, seen));
    }
    return cloned as T;
  }

  // Handle Date
  if (value instanceof Date) {
    return new Date(value) as T;
  }

  // Handle Array
  if (Array.isArray(value)) {
    cloned = [];
    seen.set(value as any, cloned);
    for (let i = 0; i < value.length; i++) {
      cloned[i] = clone(value[i], seen);
    }
    return cloned as T;
  }

  // Handle regular objects
  cloned = {};
  seen.set(value as any, cloned);
  for (const key in value) {
    if (value.hasOwnProperty(key)) {
      cloned[key] = clone((value as any)[key], seen);
    }
  }
  return cloned;
}

// for JSON#stringify
export function replacer(_key: string, value: any) {
  if (value === undefined) {
    return {
      dataType: "undefined",
    };
  } else if (value instanceof Map) {
    return {
      dataType: "Map",
      value: Array.from(value.entries()), // or with spread: value: [...value]
    };
  } else if (value instanceof Set) {
    return {
      dataType: "Set",
      value: Array.from(value),
    };
  } else {
    return value;
  }
}

// for JSON#parse
export function reviver(_key: string, value: any) {
  if (typeof value === "object" && value !== null) {
    if (value.dataType === "undefined") {
      return undefined;
    } else if (value.dataType === "Map") {
      return new Map(value.value);
    } else if (value.dataType === "Set") {
      return new Set(value.value);
    }
  }
  return value;
}
