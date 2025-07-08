import {
  getStoredKeys,
  addStoredKey,
  removeStoredKey,
  clearSliceFromStorage,
  clearAllStoredKeys,
  getStorageInfo,
  cleanupUnusedKeys,
  createCleanupUtils,
} from "../functions/cleanup";
import { ESTATE_KEYS_STORAGE_KEY, STORAGE_PREFIX } from "../constants";

describe("cleanup", () => {
  // モックストレージの作成
  const createMockStorage = () => {
    const storage = new Map<string, string>();
    return {
      getItem: jest.fn((key: string) => storage.get(key) || null),
      setItem: jest.fn((key: string, value: string) => {
        storage.set(key, value);
      }),
      removeItem: jest.fn((key: string) => {
        storage.delete(key);
      }),
      clear: () => storage.clear(),
      size: () => storage.size,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getStoredKeys", () => {
    it("storageが未提供の場合は空配列を返す", () => {
      const result = getStoredKeys();
      expect(result).toEqual([]);
    });

    it("storage.getItemが未提供の場合は空配列を返す", () => {
      const storage = { setItem: jest.fn(), removeItem: jest.fn() };
      const result = getStoredKeys(storage as any);
      expect(result).toEqual([]);
    });

    it("キー記録が存在しない場合は空配列を返す", () => {
      const storage = createMockStorage();
      const result = getStoredKeys(storage);
      expect(result).toEqual([]);
      expect(storage.getItem).toHaveBeenCalledWith(ESTATE_KEYS_STORAGE_KEY);
    });

    it("保存されたキーの配列を返す", () => {
      const storage = createMockStorage();
      const keys = ["key1", "key2", "key3"];
      storage.setItem(ESTATE_KEYS_STORAGE_KEY, JSON.stringify(keys));

      const result = getStoredKeys(storage);
      expect(result).toEqual(keys);
    });

    it("JSON.parseエラーの場合は空配列を返す", () => {
      const storage = createMockStorage();
      storage.setItem(ESTATE_KEYS_STORAGE_KEY, "invalid json");

      const result = getStoredKeys(storage);
      expect(result).toEqual([]);
    });
  });

  describe("addStoredKey", () => {
    it("storageが未提供の場合は何もしない", () => {
      addStoredKey("testKey");
      // エラーが発生しないことを確認
    });

    it("storage.setItemが未提供の場合は何もしない", () => {
      const storage = { getItem: jest.fn(), removeItem: jest.fn() };
      addStoredKey("testKey", storage as any);
      // エラーが発生しないことを確認
    });

    it("新しいキーを追加する", () => {
      const storage = createMockStorage();
      addStoredKey("newKey", storage);

      expect(storage.setItem).toHaveBeenCalledWith(
        ESTATE_KEYS_STORAGE_KEY,
        JSON.stringify(["newKey"])
      );
    });

    it("既存のキーがある場合は追加する", () => {
      const storage = createMockStorage();
      const existingKeys = ["key1", "key2"];
      storage.setItem(ESTATE_KEYS_STORAGE_KEY, JSON.stringify(existingKeys));

      addStoredKey("key3", storage);

      expect(storage.setItem).toHaveBeenLastCalledWith(
        ESTATE_KEYS_STORAGE_KEY,
        JSON.stringify(["key1", "key2", "key3"])
      );
    });

    it("重複するキーは追加しない", () => {
      const storage = createMockStorage();
      const existingKeys = ["key1", "key2"];
      storage.setItem(ESTATE_KEYS_STORAGE_KEY, JSON.stringify(existingKeys));

      addStoredKey("key1", storage);

      // setItemの呼び出し回数が増えていないことを確認
      expect(storage.setItem).toHaveBeenCalledTimes(1); // 初期設定の1回のみ
    });

    it("setItemでエラーが発生しても例外は投げない", () => {
      const storage = createMockStorage();
      
      // setItemでエラーを発生させる
      storage.setItem.mockImplementationOnce(() => {
        throw new Error("Storage error");
      });

      expect(() => addStoredKey("testKey", storage)).not.toThrow();
    });
  });

  describe("removeStoredKey", () => {
    it("storageが未提供の場合は何もしない", () => {
      removeStoredKey("testKey");
      // エラーが発生しないことを確認
    });

    it("キーを削除する", () => {
      const storage = createMockStorage();
      const keys = ["key1", "key2", "key3"];
      storage.setItem(ESTATE_KEYS_STORAGE_KEY, JSON.stringify(keys));

      removeStoredKey("key2", storage);

      expect(storage.setItem).toHaveBeenLastCalledWith(
        ESTATE_KEYS_STORAGE_KEY,
        JSON.stringify(["key1", "key3"])
      );
    });

    it("存在しないキーを削除しようとしても問題ない", () => {
      const storage = createMockStorage();
      const keys = ["key1", "key2"];
      storage.setItem(ESTATE_KEYS_STORAGE_KEY, JSON.stringify(keys));

      removeStoredKey("nonexistent", storage);

      expect(storage.setItem).toHaveBeenLastCalledWith(
        ESTATE_KEYS_STORAGE_KEY,
        JSON.stringify(["key1", "key2"])
      );
    });

    it("storage.setItemが未提供の場合は何もしない", () => {
      const storage = { getItem: jest.fn(), removeItem: jest.fn() };
      removeStoredKey("testKey", storage as any);
      // エラーが発生しないことを確認
    });

    it("setItemでエラーが発生しても例外は投げない", () => {
      const storage = createMockStorage();
      const keys = ["key1", "key2"];
      storage.setItem(ESTATE_KEYS_STORAGE_KEY, JSON.stringify(keys));
      
      // setItemでエラーを発生させる
      storage.setItem.mockImplementationOnce(() => {
        throw new Error("Storage error");
      });

      expect(() => removeStoredKey("key1", storage)).not.toThrow();
    });
  });

  describe("clearSliceFromStorage", () => {
    it("storageが未提供の場合は何もしない", () => {
      clearSliceFromStorage("slice1", ["key1", "key2"]);
      // エラーが発生しないことを確認
    });

    it("storage.removeItemが未提供の場合は何もしない", () => {
      const storage = { getItem: jest.fn(), setItem: jest.fn() };
      clearSliceFromStorage("slice1", ["key1", "key2"], storage as any);
      // エラーが発生しないことを確認
    });

    it("スライスのキーを削除する", () => {
      const storage = createMockStorage();
      const sliceKeys = ["key1", "key2"];
      
      // 事前にキーを記録に追加
      const recordedKeys = [
        `${STORAGE_PREFIX}key1`,
        `${STORAGE_PREFIX}key2`,
        "key1", // legacy
        "key2", // legacy
      ];
      storage.setItem(ESTATE_KEYS_STORAGE_KEY, JSON.stringify(recordedKeys));

      clearSliceFromStorage("slice1", sliceKeys, storage);

      // プレフィックス付きキーと従来キーの両方が削除されることを確認
      expect(storage.removeItem).toHaveBeenCalledWith(`${STORAGE_PREFIX}key1`);
      expect(storage.removeItem).toHaveBeenCalledWith(`${STORAGE_PREFIX}key2`);
      expect(storage.removeItem).toHaveBeenCalledWith("key1");
      expect(storage.removeItem).toHaveBeenCalledWith("key2");
    });

    it("removeItemでエラーが発生しても例外は投げない", () => {
      const storage = createMockStorage();
      const sliceKeys = ["key1"];
      
      // removeItemでエラーを発生させる
      storage.removeItem.mockImplementationOnce(() => {
        throw new Error("Storage error");
      });

      expect(() => clearSliceFromStorage("slice1", sliceKeys, storage)).not.toThrow();
    });
  });

  describe("clearAllStoredKeys", () => {
    it("storageが未提供の場合は何もしない", () => {
      clearAllStoredKeys();
      // エラーが発生しないことを確認
    });

    it("記録されているすべてのキーを削除する", () => {
      const storage = createMockStorage();
      const keys = ["key1", "key2", "key3"];
      storage.setItem(ESTATE_KEYS_STORAGE_KEY, JSON.stringify(keys));

      clearAllStoredKeys(storage);

      // 各キーの削除確認
      keys.forEach(key => {
        expect(storage.removeItem).toHaveBeenCalledWith(key);
      });

      // キー記録自体の削除確認
      expect(storage.removeItem).toHaveBeenCalledWith(ESTATE_KEYS_STORAGE_KEY);
    });

    it("removeItemでエラーが発生しても例外は投げない", () => {
      const storage = createMockStorage();
      const keys = ["key1"];
      storage.setItem(ESTATE_KEYS_STORAGE_KEY, JSON.stringify(keys));
      
      // removeItemでエラーを発生させる
      storage.removeItem.mockImplementationOnce(() => {
        throw new Error("Storage error");
      });

      expect(() => clearAllStoredKeys(storage)).not.toThrow();
    });
  });

  describe("getStorageInfo", () => {
    it("storageが未提供の場合はデフォルト値を返す", () => {
      const result = getStorageInfo();
      expect(result).toEqual({
        keys: [],
        totalSize: 0,
        keyCount: 0,
      });
    });

    it("ストレージ情報を正しく計算する", () => {
      const storage = createMockStorage();
      const keys = ["key1", "key2"];
      storage.setItem(ESTATE_KEYS_STORAGE_KEY, JSON.stringify(keys));
      storage.setItem("key1", "value1");
      storage.setItem("key2", "value2");

      const result = getStorageInfo(storage);

      expect(result.keys).toEqual(keys);
      expect(result.keyCount).toBe(2);
      expect(result.totalSize).toBe(
        "key1".length + "value1".length + "key2".length + "value2".length
      );
    });

    it("getItemでエラーが発生しても例外は投げない", () => {
      const storage = createMockStorage();
      const keys = ["key1"];
      storage.setItem(ESTATE_KEYS_STORAGE_KEY, JSON.stringify(keys));
      
      // getItemでエラーを発生させる
      storage.getItem.mockImplementationOnce(() => {
        throw new Error("Storage error");
      });

      expect(() => getStorageInfo(storage)).not.toThrow();
    });
  });

  describe("cleanupUnusedKeys", () => {
    it("storageが未提供の場合は何もしない", () => {
      cleanupUnusedKeys(["key1"]);
      // エラーが発生しないことを確認
    });

    it("未使用のキーを削除する", () => {
      const storage = createMockStorage();
      const storedKeys = ["key1", "key2", "key3", "key4"];
      const activeKeys = ["key1", "key3"];
      storage.setItem(ESTATE_KEYS_STORAGE_KEY, JSON.stringify(storedKeys));

      cleanupUnusedKeys(activeKeys, storage);

      // 未使用キーの削除確認
      expect(storage.removeItem).toHaveBeenCalledWith("key2");
      expect(storage.removeItem).toHaveBeenCalledWith("key4");
      
      // 使用中キーは削除されない
      expect(storage.removeItem).not.toHaveBeenCalledWith("key1");
      expect(storage.removeItem).not.toHaveBeenCalledWith("key3");
    });

    it("removeItemでエラーが発生しても例外は投げない", () => {
      const storage = createMockStorage();
      const storedKeys = ["key1", "key2"];
      const activeKeys = ["key1"];
      storage.setItem(ESTATE_KEYS_STORAGE_KEY, JSON.stringify(storedKeys));
      
      // removeItemでエラーを発生させる
      storage.removeItem.mockImplementationOnce(() => {
        throw new Error("Storage error");
      });

      expect(() => cleanupUnusedKeys(activeKeys, storage)).not.toThrow();
    });
  });

  describe("createCleanupUtils", () => {
    it("ストレージがバインドされた関数群を返す", () => {
      const storage = createMockStorage();
      const utils = createCleanupUtils(storage);

      expect(utils).toHaveProperty("getStoredKeys");
      expect(utils).toHaveProperty("addStoredKey");
      expect(utils).toHaveProperty("removeStoredKey");
      expect(utils).toHaveProperty("clearSliceFromStorage");
      expect(utils).toHaveProperty("clearAllStoredKeys");
      expect(utils).toHaveProperty("getStorageInfo");
      expect(utils).toHaveProperty("cleanupUnusedKeys");
    });

    it("返された関数はstorageパラメータを必要としない", () => {
      const storage = createMockStorage();
      const utils = createCleanupUtils(storage);

      // addStoredKeyを使用してテスト
      utils.addStoredKey("testKey");

      expect(storage.setItem).toHaveBeenCalledWith(
        ESTATE_KEYS_STORAGE_KEY,
        JSON.stringify(["testKey"])
      );
    });

    it("返された関数で複数の操作を実行できる", () => {
      const storage = createMockStorage();
      const utils = createCleanupUtils(storage);

      // キー追加
      utils.addStoredKey("key1");
      utils.addStoredKey("key2");

      // キー取得
      const keys = utils.getStoredKeys();
      expect(keys).toEqual(["key1", "key2"]);

      // キー削除
      utils.removeStoredKey("key1");
      const remainingKeys = utils.getStoredKeys();
      expect(remainingKeys).toEqual(["key2"]);

      // 全削除
      utils.clearAllStoredKeys();
      const finalKeys = utils.getStoredKeys();
      expect(finalKeys).toEqual([]);
    });
  });
});