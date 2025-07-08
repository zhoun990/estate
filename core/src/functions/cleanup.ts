import { debugDebug, debugError } from "./debug";
import { STORAGE_PREFIX, ESTATE_KEYS_STORAGE_KEY } from "../constants";
import { Options } from "../types";

/**
 * Estate ローカルストレージキー管理・クリーンアップユーティリティ
 * 
 * ローカルストレージに保存されたキーを記録し、
 * 完全なクリーンアップを可能にする
 */

/**
 * 初期化済みクリーンアップユーティリティの型定義
 */
export type CleanupUtils = {
  getStoredKeys: () => Promise<string[]>;
  addStoredKey: (key: string) => Promise<void>;
  removeStoredKey: (key: string) => Promise<void>;
  clearSliceFromStorage: (slice: string | number, sliceKeys: string[]) => Promise<void>;
  clearAllStoredKeys: () => Promise<void>;
  getStorageInfo: () => Promise<{
    keys: string[];
    totalSize: number;
    keyCount: number;
  }>;
  cleanupUnusedKeys: (activeKeys: string[]) => Promise<void>;
};

/**
 * 現在記録されているすべてのキーを取得
 */
export const getStoredKeys = async (storage?: Options<any>['storage']): Promise<string[]> => {
  if (!storage?.getItem) {
    return [];
  }
  
  try {
    const storedKeys = await storage.getItem(ESTATE_KEYS_STORAGE_KEY);
    return storedKeys ? JSON.parse(storedKeys) : [];
  } catch (error) {
    debugError("getStoredKeys():JSON.parse_error", error);
    return [];
  }
};

/**
 * 新しいキーを記録に追加
 */
export const addStoredKey = async (key: string, storage?: Options<any>['storage']): Promise<void> => {
  if (!storage?.setItem) {
    return;
  }
  
  try {
    const currentKeys = await getStoredKeys(storage);
    if (!currentKeys.includes(key)) {
      currentKeys.push(key);
      await storage.setItem(ESTATE_KEYS_STORAGE_KEY, JSON.stringify(currentKeys));
      debugDebug("addStoredKey():added_key:", key);
    }
  } catch (error) {
    debugError("addStoredKey():error", error, key);
  }
};

/**
 * 記録からキーを削除
 */
export const removeStoredKey = async (key: string, storage?: Options<any>['storage']): Promise<void> => {
  if (!storage?.setItem) {
    return;
  }
  
  try {
    const currentKeys = await getStoredKeys(storage);
    const filteredKeys = currentKeys.filter(k => k !== key);
    await storage.setItem(ESTATE_KEYS_STORAGE_KEY, JSON.stringify(filteredKeys));
    debugDebug("removeStoredKey():removed_key:", key);
  } catch (error) {
    debugError("removeStoredKey():error", error, key);
  }
};

/**
 * 特定のスライスのキーを削除
 */
export const clearSliceFromStorage = async (
  slice: string | number,
  sliceKeys: string[],
  storage?: Options<any>['storage']
): Promise<void> => {
  if (!storage?.removeItem) {
    return;
  }
  
  try {
    for (const key of sliceKeys) {
      // プレフィックス付きキーと従来キーの両方を削除
      const prefixedKey = `${STORAGE_PREFIX}${key}`;
      const legacyKey = key;
      
      await storage.removeItem!(prefixedKey);
      await storage.removeItem!(legacyKey);
      await removeStoredKey(prefixedKey, storage);
      await removeStoredKey(legacyKey, storage);
      debugDebug("clearSliceFromStorage():removed_key:", prefixedKey);
      debugDebug("clearSliceFromStorage():removed_legacy_key:", legacyKey);
    }
  } catch (error) {
    debugError("clearSliceFromStorage():error", error, slice);
  }
};

/**
 * 記録されているすべてのキーを削除
 */
export const clearAllStoredKeys = async (storage?: Options<any>['storage']): Promise<void> => {
  if (!storage?.removeItem) {
    return;
  }
  
  try {
    const keys = await getStoredKeys(storage);
    for (const key of keys) {
      await storage.removeItem!(key);
      debugDebug("clearAllStoredKeys():removed_key:", key);
    }
    
    // キー記録自体も削除
    await storage.removeItem!(ESTATE_KEYS_STORAGE_KEY);
    debugDebug("clearAllStoredKeys():cleared_all_keys");
  } catch (error) {
    debugError("clearAllStoredKeys():error", error);
  }
};

/**
 * 現在のストレージ状態を取得
 */
export const getStorageInfo = async (storage?: Options<any>['storage']): Promise<{
  keys: string[];
  totalSize: number;
  keyCount: number;
}> => {
  if (!storage?.getItem) {
    return { keys: [], totalSize: 0, keyCount: 0 };
  }
  
  const keys = await getStoredKeys(storage);
  let totalSize = 0;
  
  try {
    for (const key of keys) {
      const value = await storage.getItem(key);
      if (value) {
        totalSize += key.length + value.length;
      }
    }
  } catch (error) {
    debugError("getStorageInfo():error", error);
  }
  
  return {
    keys,
    totalSize,
    keyCount: keys.length
  };
};

/**
 * 未使用のキーを検出・削除
 */
export const cleanupUnusedKeys = async (activeKeys: string[], storage?: Options<any>['storage']): Promise<void> => {
  if (!storage?.removeItem) {
    return;
  }
  
  try {
    const storedKeys = await getStoredKeys(storage);
    const unusedKeys = storedKeys.filter(key => !activeKeys.includes(key));
    
    for (const key of unusedKeys) {
      await storage.removeItem!(key);
      await removeStoredKey(key, storage);
      debugDebug("cleanupUnusedKeys():removed_unused_key:", key);
    }
    
    if (unusedKeys.length > 0) {
      debugDebug("cleanupUnusedKeys():removed_count:", unusedKeys.length);
    }
  } catch (error) {
    debugError("cleanupUnusedKeys():error", error);
  }
};

/**
 * ストレージを事前にバインドしたクリーンアップユーティリティを作成
 * 
 * @param storage - 使用するストレージインスタンス
 * @returns ストレージがバインドされたクリーンアップ関数群
 */
export const createCleanupUtils = (storage: Options<any>['storage']): CleanupUtils => {
  return {
    getStoredKeys: () => getStoredKeys(storage),
    addStoredKey: (key: string) => addStoredKey(key, storage),
    removeStoredKey: (key: string) => removeStoredKey(key, storage),
    clearSliceFromStorage: (slice: string | number, sliceKeys: string[]) => 
      clearSliceFromStorage(slice, sliceKeys, storage),
    clearAllStoredKeys: () => clearAllStoredKeys(storage),
    getStorageInfo: () => getStorageInfo(storage),
    cleanupUnusedKeys: (activeKeys: string[]) => cleanupUnusedKeys(activeKeys, storage),
  };
};