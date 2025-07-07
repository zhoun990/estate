import {
  getObjectKeys,
  isCallable,
  isFunction,
  isKey,
  isPromise,
  generateRandomID,
  clone,
  replacer,
  reviver,
} from '../functions/utils';

describe('utils', () => {
  describe('getObjectKeys', () => {
    it('should return array of keys for object', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const keys = getObjectKeys(obj);
      expect(keys).toEqual(['a', 'b', 'c']);
    });

    it('should return empty array for null/undefined', () => {
      expect(getObjectKeys(null as any)).toEqual([]);
      expect(getObjectKeys(undefined as any)).toEqual([]);
    });

    it('should return empty array for empty object', () => {
      expect(getObjectKeys({})).toEqual([]);
    });
  });

  describe('isCallable', () => {
    it('should return true for functions', () => {
      expect(isCallable(() => {})).toBe(true);
      expect(isCallable(function() {})).toBe(true);
      expect(isCallable(Math.max)).toBe(true);
    });

    it('should return false for non-functions', () => {
      expect(isCallable(null)).toBe(false);
      expect(isCallable(undefined)).toBe(false);
      expect(isCallable({})).toBe(false);
      expect(isCallable([])).toBe(false);
      expect(isCallable('string')).toBe(false);
      expect(isCallable(123)).toBe(false);
    });
  });

  describe('isFunction', () => {
    it('should return true for functions', () => {
      expect(isFunction(() => {})).toBe(true);
      expect(isFunction(function() {})).toBe(true);
      expect(isFunction(Math.max)).toBe(true);
    });

    it('should return false for non-functions', () => {
      expect(isFunction(null)).toBe(false);
      expect(isFunction(undefined)).toBe(false);
      expect(isFunction({})).toBe(false);
      expect(isFunction([])).toBe(false);
      expect(isFunction('string')).toBe(false);
      expect(isFunction(123)).toBe(false);
    });
  });

  describe('isKey', () => {
    it('should return true for existing keys', () => {
      const obj = { a: 1, b: 2 };
      expect(isKey(obj, 'a')).toBe(true);
      expect(isKey(obj, 'b')).toBe(true);
    });

    it('should return false for non-existing keys', () => {
      const obj = { a: 1, b: 2 };
      expect(isKey(obj, 'c')).toBe(false);
      expect(isKey(obj, 'nonExistentKey')).toBe(false);
    });
  });

  describe('isPromise', () => {
    it('should return true for promises', () => {
      expect(isPromise(Promise.resolve())).toBe(true);
      expect(isPromise(new Promise(() => {}))).toBe(true);
    });

    it('should return false for non-promises', () => {
      expect(isPromise(null)).toBe(false);
      expect(isPromise(undefined)).toBe(false);
      expect(isPromise({})).toBe(false);
      expect(isPromise({ then: () => {} })).toBe(false);
      expect(isPromise('string')).toBe(false);
      expect(isPromise(123)).toBe(false);
    });
  });

  describe('generateRandomID', () => {
    it('should generate ID with correct length', () => {
      expect(generateRandomID(5)).toHaveLength(5);
      expect(generateRandomID(10)).toHaveLength(10);
      expect(generateRandomID(20)).toHaveLength(20);
    });

    it('should generate different IDs', () => {
      const id1 = generateRandomID(10);
      const id2 = generateRandomID(10);
      expect(id1).not.toBe(id2);
    });

    it('should only contain valid characters', () => {
      const id = generateRandomID(100);
      const validChars = /^[a-zA-Z0-9]+$/;
      expect(validChars.test(id)).toBe(true);
    });
  });

  describe('clone', () => {
    it('should clone primitive values', () => {
      expect(clone(null)).toBe(null);
      expect(clone(undefined)).toBe(undefined);
      expect(clone(123)).toBe(123);
      expect(clone('string')).toBe('string');
      expect(clone(true)).toBe(true);
    });

    it('should clone simple objects', () => {
      const obj = { a: 1, b: 'test' };
      const cloned = clone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
    });

    it('should clone nested objects', () => {
      const obj = { a: { b: { c: 123 } } };
      const cloned = clone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.a).not.toBe(obj.a);
      expect(cloned.a.b).not.toBe(obj.a.b);
    });

    it('should clone arrays', () => {
      const arr = [1, 2, [3, 4]];
      const cloned = clone(arr);
      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
      expect(cloned[2]).not.toBe(arr[2]);
    });

    it('should clone Date objects', () => {
      const date = new Date('2023-01-01');
      const cloned = clone(date);
      expect(cloned).toEqual(date);
      expect(cloned).not.toBe(date);
    });

    it('should clone Map objects', () => {
      const map = new Map([['a', 1], ['b', 2]]);
      const cloned = clone(map);
      expect(cloned).toEqual(map);
      expect(cloned).not.toBe(map);
    });

    it('should clone Set objects', () => {
      const set = new Set([1, 2, 3]);
      const cloned = clone(set);
      expect(cloned).toEqual(set);
      expect(cloned).not.toBe(set);
    });

    it('should handle circular references', () => {
      const obj: any = { a: 1 };
      obj.self = obj;
      const cloned = clone(obj);
      expect(cloned.a).toBe(1);
      expect(cloned.self).toBe(cloned);
    });
  });

  describe('replacer and reviver', () => {
    it('should handle Map objects in JSON serialization', () => {
      const map = new Map([['a', 1], ['b', 2]]);
      const json = JSON.stringify(map, replacer);
      const parsed = JSON.parse(json, reviver);
      expect(parsed).toEqual(map);
    });

    it('should handle Set objects in JSON serialization', () => {
      const set = new Set([1, 2, 3]);
      const json = JSON.stringify(set, replacer);
      const parsed = JSON.parse(json, reviver);
      expect(parsed).toEqual(set);
    });

    it('should handle nested Map and Set objects', () => {
      const data = {
        map: new Map([['a', 1], ['b', 2]]),
        set: new Set([1, 2, 3]),
        nested: {
          map: new Map([['c', 3]]),
          set: new Set([4, 5])
        }
      };
      const json = JSON.stringify(data, replacer);
      const parsed = JSON.parse(json, reviver);
      expect(parsed).toEqual(data);
    });

    it('should handle regular objects normally', () => {
      const obj = { a: 1, b: 'test', c: [1, 2, 3] };
      const json = JSON.stringify(obj, replacer);
      const parsed = JSON.parse(json, reviver);
      expect(parsed).toEqual(obj);
    });
  });
});