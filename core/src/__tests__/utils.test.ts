import {
  getObjectKeys,
  isFunction,
  isKey,
  isPromise,
  generateRandomID,
  clone,
  replacer,
  reviver,
} from "../functions/utils";

describe("utils", () => {
  describe("getObjectKeys", () => {
    it("should return array of keys for object", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const keys = getObjectKeys(obj);
      expect(keys).toEqual(["a", "b", "c"]);
    });

    it("should return empty array for null/undefined", () => {
      expect(getObjectKeys(null as any)).toEqual([]);
      expect(getObjectKeys(undefined as any)).toEqual([]);
    });

    it("should return empty array for empty object", () => {
      expect(getObjectKeys({})).toEqual([]);
    });
  });

  describe("isCallable", () => {
    it("should return true for functions", () => {
      expect(isFunction(() => {})).toBe(true);
      expect(isFunction(function () {})).toBe(true);
      expect(isFunction(Math.max)).toBe(true);
    });

    it("should return false for non-functions", () => {
      expect(isFunction(null)).toBe(false);
      expect(isFunction(undefined)).toBe(false);
      expect(isFunction({})).toBe(false);
      expect(isFunction([])).toBe(false);
      expect(isFunction("string")).toBe(false);
      expect(isFunction(123)).toBe(false);
    });
  });

  describe("isFunction", () => {
    it("should return true for functions", () => {
      expect(isFunction(() => {})).toBe(true);
      expect(isFunction(function () {})).toBe(true);
      expect(isFunction(Math.max)).toBe(true);
    });

    it("should return false for non-functions", () => {
      expect(isFunction(null)).toBe(false);
      expect(isFunction(undefined)).toBe(false);
      expect(isFunction({})).toBe(false);
      expect(isFunction([])).toBe(false);
      expect(isFunction("string")).toBe(false);
      expect(isFunction(123)).toBe(false);
    });
  });

  describe("isKey", () => {
    it("should return true for existing keys", () => {
      const obj = { a: 1, b: 2 };
      expect(isKey(obj, "a")).toBe(true);
      expect(isKey(obj, "b")).toBe(true);
    });

    it("should return false for non-existing keys", () => {
      const obj = { a: 1, b: 2 };
      expect(isKey(obj, "c")).toBe(false);
      expect(isKey(obj, "nonExistentKey")).toBe(false);
    });
  });

  describe("isPromise", () => {
    it("should return true for promises", () => {
      expect(isPromise(Promise.resolve())).toBe(true);
      expect(isPromise(new Promise(() => {}))).toBe(true);
    });

    it("should return false for non-promises", () => {
      expect(isPromise(null)).toBe(false);
      expect(isPromise(undefined)).toBe(false);
      expect(isPromise({})).toBe(false);
      expect(isPromise({ then: () => {} })).toBe(false);
      expect(isPromise("string")).toBe(false);
      expect(isPromise(123)).toBe(false);
    });
  });

  describe("generateRandomID", () => {
    it("should generate ID with correct length", () => {
      expect(generateRandomID(5)).toHaveLength(5);
      expect(generateRandomID(10)).toHaveLength(10);
      expect(generateRandomID(20)).toHaveLength(20);
    });

    it("should generate different IDs", () => {
      const id1 = generateRandomID(10);
      const id2 = generateRandomID(10);
      expect(id1).not.toBe(id2);
    });

    it("should only contain valid characters", () => {
      const id = generateRandomID(100);
      const validChars = /^[a-zA-Z0-9]+$/;
      expect(validChars.test(id)).toBe(true);
    });
  });

  describe("clone", () => {
    it("should clone primitive values", () => {
      expect(clone(null)).toBe(null);
      expect(clone(undefined)).toBe(undefined);
      expect(clone(123)).toBe(123);
      expect(clone("string")).toBe("string");
      expect(clone(true)).toBe(true);
    });

    it("should clone simple objects", () => {
      const obj = { a: 1, b: "test" };
      const cloned = clone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
    });

    it("should clone nested objects", () => {
      const obj = { a: { b: { c: 123 } } };
      const cloned = clone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.a).not.toBe(obj.a);
      expect(cloned.a.b).not.toBe(obj.a.b);
    });

    it("should clone arrays", () => {
      const arr = [1, 2, [3, 4]];
      const cloned = clone(arr);
      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
      expect(cloned[2]).not.toBe(arr[2]);
    });

    it("should clone Date objects", () => {
      const date = new Date("2023-01-01");
      const cloned = clone(date);
      expect(cloned).toEqual(date);
      expect(cloned).not.toBe(date);
    });

    it("should clone Map objects", () => {
      const map = new Map([
        ["a", 1],
        ["b", 2],
      ]);
      const cloned = clone(map);
      expect(cloned).toEqual(map);
      expect(cloned).not.toBe(map);
    });

    it("should clone Set objects", () => {
      const set = new Set([1, 2, 3]);
      const cloned = clone(set);
      expect(cloned).toEqual(set);
      expect(cloned).not.toBe(set);
    });

    it("should handle circular references", () => {
      const obj: any = { a: 1 };
      obj.self = obj;
      const cloned = clone(obj);
      expect(cloned.a).toBe(1);
      expect(cloned.self).toBe(cloned);
    });
  });

  describe("replacer and reviver", () => {
    const serializeDeserialize = (value: any) => {
      const json = JSON.stringify(value, replacer);
      return JSON.parse(json, reviver);
    };

    it("should handle primitive values", () => {
      expect(serializeDeserialize(null)).toBe(null);
      expect(serializeDeserialize(undefined)).toBe(undefined);
      expect(serializeDeserialize(true)).toBe(true);
      expect(serializeDeserialize(false)).toBe(false);
      expect(serializeDeserialize(123)).toBe(123);
      expect(serializeDeserialize(-456)).toBe(-456);
      expect(serializeDeserialize(0)).toBe(0);
      expect(serializeDeserialize(3.14)).toBe(3.14);
      expect(serializeDeserialize("")).toBe("");
      expect(serializeDeserialize("hello")).toBe("hello");
      expect(serializeDeserialize("日本語")).toBe("日本語");
    });

    it("should handle arrays", () => {
      expect(serializeDeserialize([])).toEqual([]);
      expect(serializeDeserialize([1, 2, 3])).toEqual([1, 2, 3]);
      expect(serializeDeserialize([null, undefined, "test"])).toEqual([
        null,
        undefined,
        "test",
      ]);
      expect(
        serializeDeserialize([
          [1, 2],
          [3, 4],
        ])
      ).toEqual([
        [1, 2],
        [3, 4],
      ]);
    });

    it("should handle objects", () => {
      expect(serializeDeserialize({})).toEqual({});
      expect(serializeDeserialize({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
      expect(serializeDeserialize({ a: null, b: undefined })).toEqual({
        a: null,
        b: undefined,
      });
      expect(
        serializeDeserialize({ nested: { deep: { value: 123 } } })
      ).toEqual({ nested: { deep: { value: 123 } } });
    });

    it("should handle Map objects", () => {
      const emptyMap = new Map();
      expect(serializeDeserialize(emptyMap)).toEqual(emptyMap);

      const simpleMap = new Map([
        ["a", 1],
        ["b", 2],
      ]);
      expect(serializeDeserialize(simpleMap)).toEqual(simpleMap);

      const complexMap = new Map([
        ["null", null],
        ["undefined", undefined],
        ["array", [1, 2, 3]],
        ["object", { x: 10 }],
      ]);
      expect(serializeDeserialize(complexMap)).toEqual(complexMap);
    });

    it("should handle Set objects", () => {
      const emptySet = new Set();
      expect(serializeDeserialize(emptySet)).toEqual(emptySet);

      const simpleSet = new Set([1, 2, 3]);
      expect(serializeDeserialize(simpleSet)).toEqual(simpleSet);

      const complexSet = new Set([
        null,
        undefined,
        "string",
        123,
        { a: 1 },
        [1, 2],
      ]);
      expect(serializeDeserialize(complexSet)).toEqual(complexSet);
    });

    it("should handle nested Map and Set objects", () => {
      const data = {
        map: new Map<string, any>([
          ["a", 1],
          ["b", new Set([1, 2])],
          ["c", { nested: "value" }],
        ]),
        set: new Set<any>([1, new Map([["key", "value"]]), { obj: true }]),
        nested: {
          map: new Map<string, any>([["deep", undefined]]),
          set: new Set<any>([null, "test"]),
          array: [new Map([["in", "array"]]), new Set([1, 2])],
        },
      };
      expect(serializeDeserialize(data)).toEqual(data);
    });

    it("should handle mixed complex data structures", () => {
      const complex = {
        primitives: {
          nullValue: null,
          undefinedValue: undefined,
          string: "test",
          number: 42,
          boolean: true,
          emptyString: "",
          zero: 0,
          negativeNumber: -123,
        },
        arrays: [
          [],
          [1, 2, 3],
          [null, undefined, "mixed"],
          [
            [1, 2],
            [3, 4],
          ],
          [new Map([["in", "array"]]), new Set([1, 2])],
        ],
        objects: {
          empty: {},
          simple: { a: 1, b: 2 },
          withNullUndefined: { a: null, b: undefined },
          nested: { deep: { deeper: { value: "found" } } },
        },
        collections: {
          maps: {
            empty: new Map(),
            simple: new Map([["key", "value"]]),
            complex: new Map<string, any>([
              ["null", null],
              ["undefined", undefined],
              ["object", { nested: true }],
              ["array", [1, 2, 3]],
              ["map", new Map([["nested", "map"]])],
              ["set", new Set([1, 2, 3])],
            ]),
          },
          sets: {
            empty: new Set(),
            simple: new Set([1, 2, 3]),
            complex: new Set<any>([
              null,
              undefined,
              "string",
              123,
              { object: true },
              [1, 2, 3],
              new Map([["in", "set"]]),
              new Set([4, 5, 6]),
            ]),
          },
        },
      };
      expect(serializeDeserialize(complex)).toEqual(complex);
    });

    it("should handle edge cases", () => {
      // 文字列のnull/undefined
      expect(serializeDeserialize("null")).toBe("null");
      expect(serializeDeserialize("undefined")).toBe("undefined");

      // 数値の特殊値
      expect(serializeDeserialize(Infinity)).toBe(null); // JSONはInfinityをnullに変換
      expect(serializeDeserialize(-Infinity)).toBe(null);
      expect(serializeDeserialize(NaN)).toBe(null); // JSONはNaNをnullに変換

      // 空の配列・オブジェクト
      expect(serializeDeserialize([])).toEqual([]);
      expect(serializeDeserialize({})).toEqual({});

      // 配列の穴（sparse array）
      const sparseArray = [1, , 3]; // 中間にundefinedの穴がある
      expect(serializeDeserialize(sparseArray)).toEqual([1, undefined, 3]);
    });
  });
});
