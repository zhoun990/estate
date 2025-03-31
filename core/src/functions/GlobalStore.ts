import {
  Middleware,
  Middlewares,
  NotFullSlice,
  RootStateType,
  ListenerCallback,
  NotFullRootState,
  ListenerCompare,
} from "../types";
import { debag } from "./debag";
export const settings = { debag: false };
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
  // public getClonedValue<
  // 	Slice extends keyof Store,
  // 	Key extends keyof Store[Slice]
  // >(slice: Slice, key: Key) {
  // 	return clone(this.store[slice]?.[key]);
  // }
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
  private valueProcessing = false;
  private waitingUpdate: ((
    store: Store
  ) => Promise<
    [
      keyof Store,
      keyof Store[keyof Store],
      Store[keyof Store][keyof Store[keyof Store]],
      boolean?
    ]
  >)[] = [];
  private waitingSetValue: [
    keyof Store,
    keyof Store[keyof Store],
    Store[keyof Store][keyof Store[keyof Store]],
    boolean?
  ][] = [];
  private waitingListen: {
    forceRerender: boolean;
    oldValue: Store[keyof Store][keyof Store[keyof Store]];
    slice: keyof Store;
    key: keyof Store[keyof Store];
  }[] = [];

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
    newValueFn: (rootState: Store) => Promise<Store[typeof slice][typeof key]>,
    forceRerender = false
  ) {
    if (!this.store.has(slice))
      throw new Error("The slice does not exist in the store");
    if (!this.store.get(slice)?.has(key))
      throw new Error("The key does not exist in the slice");
    debag("setValue():start");
    this.waitingUpdate.push(async (store: Store) => [
      slice,
      key,
      await newValueFn(store),
      forceRerender,
    ]);
    this.waitingUpdater();
    debag("setValue():end");
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
  private async waitingUpdater(_tempStore?: NotFullRootState<Store>) {
    if (this.valueProcessing && !_tempStore) {
      debag(
        "waitingUpdater():called_while_processing:updater_count_is:",
        this.waitingUpdate.length
      );
      return;
    }
    debag(
      "waitingUpdater():start:updater_count_is:",
      this.waitingUpdate.length
    );
    this.valueProcessing = true;

    const promise = this.waitingUpdate?.shift();
    let values: [
      keyof Store,
      keyof Store[keyof Store],
      Store[keyof Store][keyof Store[keyof Store]],
      boolean?
    ] = [] as any;
    if (promise) {
      try {
        values = await promise({ ...this.getStore(), ..._tempStore });
        debag("waitingUpdater():resolved_promise_value_is:\n", values);
        this.waitingSetValue.push(values);
      } catch (error) {
        debag("waitingUpdater():promise_resolving_error", error);
      }
    }
    if (this.waitingUpdate.length) {
      debag("waitingUpdater():call_next_waitingUpdater");
      if (!_tempStore) {
        _tempStore = {};
      }
      if (values.length) {
        if (!_tempStore[values[0]]) {
          try {
            _tempStore[values[0]] = clone(this.getStore()[values[0]]);
          } catch (error) {
            debag(
              "waitingUpdater():error_on_set_temp_slice",
              error,
              this.getSlice(values[0])
            );
          }
        }
        _tempStore[values[0]]![values[1]] = values[2];
        debag("waitingUpdater():added_updated_value_to_temp_store");
      }
      this.waitingUpdater(_tempStore);
      debag("waitingUpdater():end_with:called_next_waitingUpdater");
    } else {
      debag("waitingUpdater():no_updater_in_queue:update_stacked_values");
      for (let i = 0; i < this.waitingSetValue.length; i++) {
        debag("waitingUpdater():update_value_start");
        const [slice, key, value, forceRerender] = this.waitingSetValue[i];
        const oldValue = this.getValue(slice, key);
        this.store.get(slice)?.set(key, this._middleware(slice, key, value));
        this.waitingListen.push({
          forceRerender: !!forceRerender,
          oldValue,
          slice,
          key,
        });
      }
      debag("waitingUpdater():update_value_end");
      const updateId = String(Date.now());
      for (let i = 0; i < this.waitingListen.length; i++) {
        const { forceRerender, oldValue, slice, key } = this.waitingListen[i];
        const newValue = this.getValue(slice, key);
        const listeners = this.getListeners(slice, key);
        if (forceRerender || oldValue !== newValue) {
          debag(
            `waitingUpdater():call_listers_start(${i + 1}/${
              this.waitingListen.length
            })`
          );
          for (let index = 0; index < listeners.length; index++) {
            const { callback, compare } = listeners[index];
            // NOTE: if compare is not provided or oldValue and newValue are not the same, the callback will be called
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
      debag("waitingUpdater():call_listers_end");
      this.waitingSetValue = [];
      this.waitingListen = [];
      this.valueProcessing = false;
      debag("waitingUpdater():end_with:updated_all_changed_values");
    }
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
          debag("subscribe():start:callback:once");
          this.unsubscribe(path.join("###"));
        } else {
          debag("subscribe():start:callback");
        }
        callback(args);
        debag("subscribe():end:callback");
      },
      compare,
    });
    return () => this.unsubscribe(path.join("###"));
  }
  public unsubscribe(id: string) {
    delete this.listeners[id];
  }
  private getListeners(slice: keyof Store, key: keyof Store[keyof Store]) {
    debag("getListeners():start:create_listeners_array");
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
    debag(
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
