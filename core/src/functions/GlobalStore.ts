import {
  Middleware,
  Middlewares,
  NotFullSlice,
  RootStateType,
  ListenerCallback,
  NotFullRootState,
  ListenerCompare,
} from "../types";
import { debugDebug, debugError, debugTrace, debugInfo, settings } from "./debug";
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
    ) => Promise<
      [
        keyof Store,
        keyof Store[keyof Store],
        Store[keyof Store][keyof Store[keyof Store]],
        boolean?
      ]
    >;
  }[] = [];
  private updateQueue: {
    slice: keyof Store;
    key: keyof Store[keyof Store];
    value: Store[keyof Store][keyof Store[keyof Store]];
    forceRerender: boolean;
  }[] = [];

  private listenerQueue: Record<
    string,
    {
      forceRerender: boolean;
      value: Store[keyof Store][keyof Store[keyof Store]];
      slice: keyof Store;
      key: keyof Store[keyof Store];
    }
  > = {};

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
  public setSlice(
    slice: keyof Store,
    newSlice: NotFullSlice<Store, typeof slice>,
    forceRerender = false
  ) {
    getObjectKeys(newSlice).forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(newSlice, k)) {
        const v = newSlice[k]!;
        this.setValue(slice, k, async () => v, forceRerender);
      }
    });
  }
  public setValue(
    slice: keyof Store,
    key: keyof Store[typeof slice],
    newValueFn: (
      latestValue: Store[typeof slice][typeof key]
    ) => Promise<Store[typeof slice][typeof key]>,
    forceRerender = false
  ) {
    if (!this.store.has(slice))
      throw new Error("The slice does not exist in the store");
    if (!this.store.get(slice)?.has(key))
      throw new Error("The key does not exist in the slice");
    debugTrace("setValue():start");
    this.applyUpdateBuffer.push({
      slice,
      key,
      updater: async (latestValue) => [
        slice,
        key,
        await newValueFn(latestValue),
        forceRerender,
      ],
    });
    this.updater();
    debugTrace("setValue():end");
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
    if (isFunction(fn))
      return fn({
        value,
        slice,
        key,
        reducer: this,
      });
    return fn;
  }
  private async updater(virtualStore?: NotFullRootState<Store>) {
    if (this.isUpdateInProgress && !virtualStore) {
      debugInfo(
        "waitingUpdater():called_while_processing:updater_count_is:",
        this.applyUpdateBuffer.length
      );
      return;
    }
    debugTrace(
      "waitingUpdater():start:updater_count_is:",
      this.applyUpdateBuffer.length
    );
    this.isUpdateInProgress = true;

    const getUpdatedValue = this.applyUpdateBuffer?.shift();
    let values: [
      keyof Store,
      keyof Store[keyof Store],
      Store[keyof Store][keyof Store[keyof Store]],
      boolean?
    ] = [] as any;
    if (getUpdatedValue) {
      const { slice, key, updater } = getUpdatedValue;
      try {
        const cloned = this.getClonedValue(slice, key);
        values = await updater(cloned);
        debugDebug("waitingUpdater():resolved_promise_value_is:\n", values);
        this.updateQueue.push({
          slice,
          key,
          value: values[2],
          forceRerender: !!values[3],
        });
      } catch (error) {
        debugError("waitingUpdater():promise_resolving_error", error);
      }
    }

    // INFO: bufferに値が残っている場合は、virtualStoreに値を追加して次の更新を行う
    if (this.applyUpdateBuffer.length) {
      debugTrace("waitingUpdater():call_next_waitingUpdater");
      if (!virtualStore) {
        virtualStore = {};
      }
      if (values.length) {
        if (!virtualStore[values[0]]) {
          try {
            virtualStore[values[0]] = clone(this.getStore()[values[0]]);
          } catch (error) {
            debugError(
              "waitingUpdater():error_on_set_temp_slice",
              error,
              this.getSlice(values[0])
            );
          }
        }
        // INFO: 適用済みの仮想ストアに更新値を追加する
        virtualStore[values[0]]![values[1]] = values[2];
        debugTrace("waitingUpdater():added_updated_value_to_temp_store");
      }
      // INFO: virtualStoreを渡して、次の更新を行う
      this.updater(virtualStore);
      debugTrace("waitingUpdater():end_with:called_next_waitingUpdater");

      // INFO: 再帰呼び出ししているので、この呼び出しでは処理を終了する
      return;
    }

    // INFO: 更新キューに値がない場合は、更新を行う
    debugTrace("waitingUpdater():no_updater_in_queue:update_stacked_values");
    for (let i = 0; i < this.updateQueue.length; i++) {
      debugTrace("waitingUpdater():update_value_start");
      const {
        slice,
        key,
        value: newValue,
        forceRerender,
      } = this.updateQueue[i];
      const listenerKey = `${slice.toString()}###${key.toString()}`;

      // INFO: 更新された値をリスナーに通知する。重複している場合は上書きする
      this.listenerQueue[listenerKey] = {
        forceRerender: !!forceRerender,
        value: newValue,
        slice,
        key,
      };
    }
    debugTrace("waitingUpdater():update_value_end");

    // INFO: リスナーに通知する
    for (const listenerKey in this.listenerQueue) {
      const {
        forceRerender,
        slice,
        key,
        value: newValue,
      } = this.listenerQueue[listenerKey];
      // INFO: 現在のstoreの値は更新前の値なので、storeの値を取得する
      const oldValue = this.getValue(slice, key);

      // INFO: 登録されているリスナーを取得する
      const listeners = this.getListeners(slice, key);

      if (forceRerender || oldValue !== newValue) {
        debugTrace(`waitingUpdater():call_listers_start(${listenerKey})`);
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

    // INFO: storeに反映する
    for (let i = 0; i < this.updateQueue.length; i++) {
      debugTrace("waitingUpdater():update_value_start");
      const {
        slice,
        key,
        value: newValue,
        forceRerender,
      } = this.updateQueue[i];

      // INFO: 更新された値をミドルウェアに通す
      const updatedValue = this._middleware(slice, key, newValue);

      // INFO: 更新された値をストアに反映する
      this.store.get(slice)?.set(key, updatedValue);
    }

    debugTrace("waitingUpdater():call_listers_end");
    this.updateQueue = [];
    this.listenerQueue = {};
    this.isUpdateInProgress = false;
    debugTrace("waitingUpdater():end_with:updated_all_changed_values");
  }
  // private updateValue(
  //   slice: keyof Store,
  //   key: keyof Store[typeof slice],
  //   value: Store[typeof slice][typeof key],
  //   forceRerender?: boolean
  // ) {
  //   debag("updateValue():start");
  //   const oldValue = this.getValue(slice, key);
  //   this.store[slice][key] = this._middleware(slice, key, value);
  //   debag("updateValue():is_new_value:", oldValue !== this.getValue(slice, key));
  //   this.getListeners(slice, key).forEach((callback) => {
  //     if (forceRerender || oldValue !== this.getValue(slice, key))
  //       callback({
  //         newValue: this.getValue(slice, key),
  //         oldValue,
  //         slice,
  //         key,
  //         listenerId: "",
  //       });
  //   });
  //   debag("updateValue():end");
  // }

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
