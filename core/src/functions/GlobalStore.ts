import {
  Middleware,
  Middlewares,
  NotFullSlice,
  RootStateType,
  ListenerCallback,
  NotFullRootState,
  ListenerCompare,
} from "../types";
import { debugDebug, debugError, debugTrace } from "./debug";
import { clone, generateRandomID, getObjectKeys, isFunction } from "./utils";
export class StoreHandler<Store extends RootStateType> {
  store: Map<any, Map<any, any>>;
  constructor(store: Store) {
    const s = new Map();
    Object.entries(store).forEach(([key, value]) => {
      const slices = new Map();
      Object.entries(value).forEach(([key, value]) => {
        slices.set(key, value);
      });
      s.set(key, slices);
    });
    this.store = s;
  }
  public getStore(): Store {
    const storeObject: any = {};
    this.store.forEach((slices, sliceKey) => {
      storeObject[sliceKey] = Object.fromEntries(slices);
    });
    return storeObject;
  }
  // public getClonedStore(cloned = false) {
  // 	return clone(this.store);
  // }
  public getSlice<Slice extends keyof Store>(slice: Slice): Store[Slice] {
    return Object.fromEntries(this.store.get(slice) || new Map());
  }
  // public getClonedSlice<Slice extends keyof Store>(slice: Slice) {
  // 	return clone(this.store[slice]);
  // }
  public getValue<Slice extends keyof Store, Key extends keyof Store[Slice]>(
    slice: Slice,
    key: Key
  ): Store[Slice][Key] {
    return this.store.get(slice)?.get(key);
  }
  public getClonedValue<
    Slice extends keyof Store,
    Key extends keyof Store[Slice]
  >(slice: Slice, key: Key) {
    return clone(this.getValue(slice, key));
  }
}
export class GlobalStore<
  Store extends RootStateType
> extends StoreHandler<Store> {
  private static instance: GlobalStore<any>;

  public initialState: Store = {} as Store;

  private middlewares: {
    [slice in keyof Store]?: {
      [key in keyof Store[slice]]?: Middleware<Store, slice, key>;
    };
  } = {};

  private listeners: Record<
    string,
    {
      callback: ListenerCallback;
      /** NOTE: returns true if the value is the same */
      compare?: ListenerCompare;
    }
  > = {};

  private isUpdateInProgress = false;

  private applyUpdateBuffer: {
    slice: keyof Store;
    key: keyof Store[keyof Store];
    updater: (
      latestValue: Store[keyof Store][keyof Store[keyof Store]]
    ) => [
      keyof Store,
      keyof Store[keyof Store],
      Store[keyof Store][keyof Store[keyof Store]],
      boolean?
    ];
  }[] = [];

  private listenerQueue: Record<
    string,
    {
      forceRerender: boolean;
      slice: keyof Store;
      key: keyof Store[keyof Store];
    }
  > = {};

  private oldPartialStore: NotFullRootState<Store> = {};

  private initialized = false;

  private constructor(initialState: Store) {
    if (GlobalStore.instance) {
      return GlobalStore.instance;
    }
    super(initialState);
    this.initialState = initialState;
    GlobalStore.instance = this;
  }
  public static getInstance<RootState extends RootStateType>(
    initialState?: RootState
  ): GlobalStore<RootState> {
    if (!GlobalStore.instance && initialState) {
      GlobalStore.instance = new GlobalStore(initialState);
    }
    return GlobalStore.instance;
  }
  public setInitialized(initialized: boolean) {
    this.initialized = initialized;
    if (initialized) {
      debugDebug("fn setInitialized():GlobalStore_initialized");
      this.updater();
    }
  }
  public setSlice(
    slice: keyof Store,
    newSlice: NotFullSlice<Store, typeof slice>,
    forceRerender = false
  ) {
    getObjectKeys(newSlice).forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(newSlice, k)) {
        const v = newSlice[k]!;
        this.setValue(slice, k, () => v, forceRerender);
      }
    });
  }
  public setValue(
    slice: keyof Store,
    key: keyof Store[typeof slice],
    newValueFn: (
      latestValue: Store[typeof slice][typeof key]
    ) => Store[typeof slice][typeof key],
    forceRerender = false
  ) {
    if (!this.store.has(slice))
      throw new Error("The slice does not exist in the store");
    if (!this.store.get(slice)?.has(key))
      throw new Error("The key does not exist in the slice");
    debugDebug(`setValue():start ${slice.toString()} ${key.toString()}`);
    this.applyUpdateBuffer.push({
      slice,
      key,
      updater: (latestValue) => [
        slice,
        key,
        newValueFn(latestValue),
        forceRerender,
      ],
    });
    this.updater();
    debugTrace(`setValue():end ${slice.toString()} ${key.toString()}`);
  }
  public setMiddlewares(middlewares: Middlewares<Store>) {
    getObjectKeys(middlewares).forEach((slice) => {
      const ms = middlewares[slice];
      if (ms)
        getObjectKeys(ms).forEach((key) => {
          const mk = ms[key];
          if (mk) {
            this.setMiddleware(slice, key, mk);
          }
        });
    });
  }
  public setMiddleware(
    slice: keyof Store,
    key: keyof Store[typeof slice],
    fn: Middleware<Store, typeof slice, typeof key>
  ) {
    const ms = this.middlewares[slice];
    if (!ms) {
      this.middlewares[slice] = {};
      const ms = this.middlewares[slice];
      if (ms) ms[key] = fn;
    }
    if (ms) ms[key] = fn;
  }
  private _middleware(
    slice: keyof Store,
    key: keyof Store[typeof slice],
    value: Store[keyof Store][keyof Store[keyof Store]]
  ) {
    const fn = this.middlewares[slice]?.[key];
    if (!this.middlewares?.[slice]) return value;
    if (!Object.keys(this.middlewares[slice] || {}).includes(String(key)))
      return value;
    if (isFunction(fn)) {
      try {
        return fn({
          value,
          slice,
          key,
          globalStore: this.getStore(),
        });
      } catch (error) {
        debugError("Error in middleware:", error, {
          slice,
          key,
          value,
          middlewareFunction: fn.toString(),
        });
        // エラーが発生した場合は元の値を返す
        return value;
      }
    }
    return fn;
  }

  private setOldPartialStore(
    slice: keyof Store,
    key: keyof Store[typeof slice],
    value: Store[typeof slice][typeof key]
  ) {
    if (!this.oldPartialStore[slice]) {
      this.oldPartialStore[slice] = {};
    }
    this.oldPartialStore[slice] = {
      ...this.oldPartialStore[slice],
      [key]: value,
    };
  }

  private getOldPartialStore(
    slice: keyof Store,
    key: keyof Store[typeof slice]
  ) {
    return this.oldPartialStore[slice]?.[key];
  }

  private async updater() {
    if (!this.initialized) {
      debugDebug("fn updater():GlobalStore_not_initialized");
      return;
    }
    if (this.isUpdateInProgress) {
      debugDebug(
        "fn updater():called_while_processing:updater_count_is:",
        this.applyUpdateBuffer.length
      );
      return;
    }
    debugDebug(
      "fn updater():start:updater_count_is:",
      this.applyUpdateBuffer.length
    );
    this.isUpdateInProgress = true;

    // INFO: 更新キューから値を取得する。破壊的。
    const getUpdatedValue = this.applyUpdateBuffer?.shift();

    if (getUpdatedValue) {
      const { slice, key, updater } = getUpdatedValue;
      try {
        // INFO: 古い値が保存されていない場合は、古い値を保存する
        if (!this.getOldPartialStore(slice, key)) {
          // INFO: 参照だと比較できないのでディープコピーする
          const cloned = this.getClonedValue(slice, key);

          // INFO: 比較用に古い値を保存する
          this.setOldPartialStore(slice, key, cloned);
        }

        // INFO: 参照を渡す。値が更新される可能性がある。
        const [_slice, _key, newValue, forceRerender] = updater(
          this.getValue(slice, key)
        );

        // INFO: 更新された値をミドルウェアに通す
        const updatedValue = this._middleware(slice, key, newValue);

        // INFO: 更新された値をストアに反映する
        this.store.get(slice)?.set(key, updatedValue);

        // INFO: 更新された値をリスナーキューに追加する。重複している場合は上書きする
        const listenerKey = `${slice.toString()}###${key.toString()}`;
        this.listenerQueue[listenerKey] = {
          forceRerender: !!forceRerender,
          slice,
          key,
        };

        debugDebug(
          "fn updater():update_queue_push:\n---start\n",
          `slice:${slice.toString()}\nkey:${key.toString()}\nnewValue:${newValue.toString()}\nforceRerender:${forceRerender?.toString()}`,
          "\n---end"
        );
      } catch (error) {
        debugError("fn updater():promise_resolving_error", error);
      }
    }

    // INFO: bufferに値が残っている場合は次の更新を行う
    if (this.applyUpdateBuffer.length) {
      this.updater();

      // INFO: 再帰呼び出ししているので、この呼び出しでは処理を終了する
      return;
    }

    debugTrace("fn updater():start_calling_listeners");
    // INFO: リスナーに通知する
    for (const listenerKey in this.listenerQueue) {
      const { forceRerender, slice, key } = this.listenerQueue[listenerKey];

      const oldValue = this.getOldPartialStore(slice, key);
      // INFO: 現在のstoreの値は更新前の値なので、storeの値を取得する
      const newValue = this.getValue(slice, key);

      // INFO: 登録されているリスナーを取得する
      const listeners = this.getListeners(slice, key);

      if (forceRerender || oldValue !== newValue) {
        debugDebug(
          `fn updater():call_listers_start(${listenerKey}) ${slice.toString()} ${key.toString()}`
        );
        for (let index = 0; index < listeners.length; index++) {
          const updateId = generateRandomID(20);
          const { callback, compare } = listeners[index];

          // INFO: 比較関数が提供されていない場合は、常にtrueを返す。比較関数が提供されている場合は、比較関数を呼び出して、値が変更されている場合(false)のみ、リスナーを呼び出す
          if (compare === undefined ? true : !compare(oldValue, newValue)) {
            callback({
              slice,
              key,
              updateId,
            });
          }
        }
      }
    }
    debugTrace("waitingUpdater():call_listers_end");

    // INFO: リスナーキューをクリアする
    this.listenerQueue = {};
    // INFO: 古い値をクリアする
    this.oldPartialStore = {};
    // INFO: 更新中フラグをクリアする
    this.isUpdateInProgress = false;

    debugTrace("fn updater():end_updater");
  }

  public subscribeSlice(
    slice: keyof Store,
    listenerId: string | undefined,
    callback: ListenerCallback,
    compare?: ListenerCompare,
    once = false
  ) {
    Array.from(this.store.get(slice)?.keys() || []).forEach((key) => {
      this.subscribe({ slice, key, listenerId, callback, compare, once });
    });
  }
  public subscribe<Slice extends keyof Store, Key extends keyof Store[Slice]>({
    slice,
    key,
    listenerId,
    callback,
    compare,
    once = false,
  }: {
    slice: Slice;
    key: Key;
    listenerId: string | undefined;
    callback: ListenerCallback;
    compare?: ListenerCompare;
    once?: boolean;
  }) {
    const path = [slice, key, listenerId ?? generateRandomID(20)];
    this.setLister({
      id: path.join("###"),
      callback: (args) => {
        if (once) {
          debugTrace("subscribe():start:callback:once");
          this.unsubscribe(path.join("###"));
        } else {
          debugTrace("subscribe():start:callback");
        }
        callback(args);
        debugTrace("subscribe():end:callback");
      },
      compare,
    });
    return () => this.unsubscribe(path.join("###"));
  }
  public unsubscribe(id: string) {
    delete this.listeners[id];
  }
  private getListeners(slice: keyof Store, key: keyof Store[keyof Store]) {
    debugTrace("getListeners():start:create_listeners_array");
    const listeners = Object.keys(this.listeners).filter((id) => {
      try {
        const path = id.split("###");
        return path[0] === slice && path[1] === key;
      } catch (error) {
        console.error(
          "##@e-state/core:GlobalStore:getListeners:filter_method## :",
          {
            id,
            path: id.split("###"),
            slice,
            key,
            error,
          }
        );
      }
    });
    debugTrace(
      "getListeners():end:create_listeners_array:listeners_count:",
      listeners.length
    );
    return listeners.map((id) => this.listeners[id]);
  }
  private setLister({
    id,
    callback,
    compare,
  }: {
    id: string;
    callback: ListenerCallback;
    compare?: ListenerCompare;
  }) {
    this.listeners[id] = { callback, ...(compare ? { compare } : {}) };
  }
}
