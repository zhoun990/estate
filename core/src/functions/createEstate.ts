import {
  ListenerCallback,
  ListenerCompare,
  Options,
  RootStateType,
} from "../types";
import { GlobalStore } from "./GlobalStore";
import { setter } from "./createUpdater";
import { debugError, debugDebug, settings, debugTrace } from "./debug";
import { clone, getObjectKeys, replacer, reviver } from "./utils";
import { createCleanupUtils } from "./cleanup";
import { STORAGE_PREFIX } from "../constants";
/**
 *
 * @param initialRootState - Key value pair of StateLabel and state
 * @param options.persist - List of StateLabel for persistence
 * @param options.storage - Storage to be used for persistence. When not specified, localStorage will be used (web only). sync/async
 * @returns useEstate, clearEstate
 */
export const createEstate = <RootState extends RootStateType>(
  initialRootState: RootState,
  options?: Options<RootState>
) => {
  // デバッグ設定の初期化
  if (options?.debug) {
    if (typeof options.debug === "boolean") {
      settings.debug.enabled = options.debug;
    } else {
      settings.debug.enabled = options.debug.enabled;
      settings.debug.level = options.debug.level;
    }
  }
  const globalStore = GlobalStore.getInstance(clone(initialRootState));
  if (
    typeof window !== "undefined" &&
    options?.persist?.length &&
    !options.storage
  ) {
    options.storage = localStorage;
  }
  if (options?.middlewares) {
    globalStore.setMiddlewares(options?.middlewares);
  }

  // クリーンアップユーティリティの初期化
  const {
    getStoredKeys,
    addStoredKey,
    removeStoredKey,
    clearSliceFromStorage,
    clearAllStoredKeys,
  } = createCleanupUtils(options?.storage);

  const getStorageItems = async (
    slice: keyof RootState
  ): Promise<RootState[keyof RootState] | null> => {
    const getItem = (k: string) => options?.storage?.getItem(k);

    const items = {} as RootState[keyof RootState];
    let hasPersistedData = false;

    if (typeof options?.storage?.getItem) {
      for (const key in initialRootState[slice]) {
        const prefixedKey = `${STORAGE_PREFIX}${key}`;
        const legacyKey = key;

        // まずプレフィックス付きキーで読み込み試行
        let storageValue = await getItem(prefixedKey);
        if (storageValue) {
          debugDebug("getStorageItems():getItem", prefixedKey, storageValue);
        }
        let isLegacyData = false;

        // 後方互換 プレフィックス付きキーで見つからない場合は従来キーで読み込み
        if (storageValue === null || storageValue === undefined) {
          storageValue = await getItem(legacyKey);
          isLegacyData = true;

          debugDebug(
            "getStorageItems():getItem_legacy",
            prefixedKey,
            storageValue
          );
        }

        // storageValueがnullやundefinedの場合はキーが存在しないということ
        if (storageValue !== null && storageValue !== undefined) {
          try {
            const item = JSON.parse(storageValue, reviver);
            // JSON.parseの結果がnullやundefinedでも有効なデータとして扱う
            items[key] = item;
            hasPersistedData = true;

            // 後方互換 従来データの場合は新しいキーに移行してから古いキーを削除
            if (
              isLegacyData &&
              options?.storage?.setItem &&
              options?.storage?.removeItem
            ) {
              await options.storage.setItem(prefixedKey, storageValue);
              await options.storage.removeItem(legacyKey);
            }
          } catch (error) {
            debugError(
              "getStorageItems():JSON.parse_error",
              error,
              key,
              storageValue
            );
          }
        }
      }
    }

    // 永続化データが存在しない場合はnullを返す
    return hasPersistedData ? items : null;
  };

  const setStorageItems = async <State extends Record<any, any>>(
    slice: keyof RootState,
    state: State
  ) => {
    const setItem = (k: string, v: string) => options?.storage?.setItem(k, v);

    if (options?.storage?.setItem) {
      for (const key in initialRootState[slice]) {
        if (
          Object.prototype.hasOwnProperty.call(initialRootState[slice], key) &&
          Object.prototype.hasOwnProperty.call(state, key)
        ) {
          const prefixedKey = `${STORAGE_PREFIX}${key}`;
          await setItem(prefixedKey, JSON.stringify(state[key], replacer));
          await addStoredKey(prefixedKey);
        }
      }
    }
  };

  if (options?.persist?.length) {
    debugDebug("createEstate():start_with:persist_data_loading");
    Promise.all(
      options.persist.map((slice) => {
        // persistデータの読み込み
        return getStorageItems(slice)
          .then((state) => {
            // 永続化データが存在する場合のみ復元
            if (state !== null) {
              debugDebug(
                "createEstate():start_with:persist_data_loading",
                slice,
                Object.keys(state).toString()
              );
              // オブジェクトをMapに変換して直接設定
              const stateMap = new Map(Object.entries(state));
              globalStore.store.set(slice, stateMap);

            }
          })
          .catch((error) => {
            debugError("getStorageItems():promise_resolving_error", error);
          })
          .finally(() => {
            // 復元完了後にリスナーを設定。エラーが発生した場合もリスナーを設定
            globalStore.subscribeSlice(
              slice,
              "THIS_IS_A_LISTENER_FOR_PERSISTANCE",
              ({ key }) => {
                setStorageItems(slice, {
                  [key]: globalStore.getValue(slice, key),
                });
              }
            );
            debugTrace("createEstate():end_with:persist_data_loading");
          });
      })
    ).then(() => {
      globalStore.setInitialized(true);
      debugTrace("createEstate():end_with:persist_data_loading");
    });
    debugTrace("createEstate():promise_left");
  } else {
    // persistオプションがない場合は即座に初期化完了とする
    globalStore.setInitialized(true);
  }

  const clearEstate = async <T extends keyof RootState>(slice?: T) => {
    if (slice) {
      globalStore.setSlice(slice, initialRootState[slice]);
      // 永続化されているスライスの場合、ストレージからも削除
      if (options?.persist?.includes(slice)) {
        const sliceKeys = Object.keys(initialRootState[slice]) as string[];
        await clearSliceFromStorage(String(slice), sliceKeys);
      }
    } else {
      for (const slice of getObjectKeys(initialRootState)) {
        globalStore.setSlice(slice, initialRootState[slice]);
        // 永続化されているスライスの場合、ストレージからも削除
        if (options?.persist?.includes(slice)) {
          const sliceKeys = Object.keys(initialRootState[slice]) as string[];
          await clearSliceFromStorage(String(slice), sliceKeys);
        }
      }
    }
  };

  return {
    store: globalStore.store,
    set: setter(initialRootState),
    subscribe: <
      Slice extends keyof RootState,
      Key extends keyof RootState[Slice]
    >(
      slice: Slice,
      key: Key,
      listenerId: string | undefined,
      callback: ListenerCallback,
      compare?: ListenerCompare,
      once = false
    ) =>
      globalStore.subscribe({
        slice,
        key,
        listenerId,
        callback,
        compare,
        once,
      }),
    clearEstate,
    getStoredKeys,
    addStoredKey,
    removeStoredKey,
    clearSliceFromStorage,
    clearAllStoredKeys,
  };
};
