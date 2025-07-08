import { debugDebug, debugError } from "./debug";
import { STORAGE_PREFIX, ESTATE_KEYS_STORAGE_KEY } from "../constants";

/**
 * Estate ローカルストレージキー管理・クリーンアップユーティリティ
 * 
 * ローカルストレージに保存されたキーを記録し、
 * 完全なクリーンアップを可能にする
 */

/**
 * 現在記録されているすべてのキーを取得
 */
export const getStoredKeys = (): string[] => {
  if (typeof window === "undefined") {
    return [];
  }
  
  try {
    const storedKeys = localStorage.getItem(ESTATE_KEYS_STORAGE_KEY);
    return storedKeys ? JSON.parse(storedKeys) : [];
  } catch (error) {
    debugError("getStoredKeys():JSON.parse_error", error);
    return [];
  }
};

/**
 * 新しいキーを記録に追加
 */
export const addStoredKey = (key: string): void => {
  if (typeof window === "undefined") {
    return;
  }
  
  try {
    const currentKeys = getStoredKeys();
    if (!currentKeys.includes(key)) {
      currentKeys.push(key);
      localStorage.setItem(ESTATE_KEYS_STORAGE_KEY, JSON.stringify(currentKeys));
      debugDebug("addStoredKey():added_key:", key);
    }
  } catch (error) {
    debugError("addStoredKey():error", error, key);
  }
};

/**
 * 記録からキーを削除
 */
export const removeStoredKey = (key: string): void => {
  if (typeof window === "undefined") {
    return;
  }
  
  try {
    const currentKeys = getStoredKeys();
    const filteredKeys = currentKeys.filter(k => k !== key);
    localStorage.setItem(ESTATE_KEYS_STORAGE_KEY, JSON.stringify(filteredKeys));
    debugDebug("removeStoredKey():removed_key:", key);
  } catch (error) {
    debugError("removeStoredKey():error", error, key);
  }
};

/**
 * 特定のスライスのキーを削除
 */
export const clearSliceFromStorage = (
  slice: string | number,
  sliceKeys: string[]
): void => {
  if (typeof window === "undefined") {
    return;
  }
  
  try {
    sliceKeys.forEach(key => {
      // プレフィックス付きキーと従来キーの両方を削除
      const prefixedKey = `${STORAGE_PREFIX}${key}`;
      const legacyKey = key;
      
      localStorage.removeItem(prefixedKey);
      localStorage.removeItem(legacyKey);
      removeStoredKey(prefixedKey);
      removeStoredKey(legacyKey);
      debugDebug("clearSliceFromStorage():removed_key:", prefixedKey);
      debugDebug("clearSliceFromStorage():removed_legacy_key:", legacyKey);
    });
  } catch (error) {
    debugError("clearSliceFromStorage():error", error, slice);
  }
};

/**
 * 記録されているすべてのキーを削除
 */
export const clearAllStoredKeys = (): void => {
  if (typeof window === "undefined") {
    return;
  }
  
  try {
    const keys = getStoredKeys();
    keys.forEach(key => {
      localStorage.removeItem(key);
      debugDebug("clearAllStoredKeys():removed_key:", key);
    });
    
    // キー記録自体も削除
    localStorage.removeItem(ESTATE_KEYS_STORAGE_KEY);
    debugDebug("clearAllStoredKeys():cleared_all_keys");
  } catch (error) {
    debugError("clearAllStoredKeys():error", error);
  }
};

/**
 * 現在のストレージ状態を取得
 */
export const getStorageInfo = (): {
  keys: string[];
  totalSize: number;
  keyCount: number;
} => {
  if (typeof window === "undefined") {
    return { keys: [], totalSize: 0, keyCount: 0 };
  }
  
  const keys = getStoredKeys();
  let totalSize = 0;
  
  try {
    keys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += key.length + value.length;
      }
    });
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
export const cleanupUnusedKeys = (activeKeys: string[]): void => {
  if (typeof window === "undefined") {
    return;
  }
  
  try {
    const storedKeys = getStoredKeys();
    const unusedKeys = storedKeys.filter(key => !activeKeys.includes(key));
    
    unusedKeys.forEach(key => {
      localStorage.removeItem(key);
      removeStoredKey(key);
      debugDebug("cleanupUnusedKeys():removed_unused_key:", key);
    });
    
    if (unusedKeys.length > 0) {
      debugDebug("cleanupUnusedKeys():removed_count:", unusedKeys.length);
    }
  } catch (error) {
    debugError("cleanupUnusedKeys():error", error);
  }
};