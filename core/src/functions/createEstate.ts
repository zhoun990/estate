import { ListenerCallback, Options, RootStateType } from "../types";
import { GlobalStore, settings } from "./GlobalStore";
import { setter } from "./createUpdater";
import { clone, getObjectKeys } from "./utils";
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
  settings.debag = !!options?.debag;
  const globalStore = GlobalStore.getInstance(clone(initialRootState));
  if (typeof window !== "undefined" && options?.persist?.length && !options.storage) {
    options.storage = localStorage;
  }
  if (options?.middlewares) {
    globalStore.setMiddlewares(options?.middlewares);
  }
  const getStorageItems = async (
    slice: keyof RootState
  ): Promise<RootState[keyof RootState]> => {
    const getItem = (k: Extract<keyof RootState[keyof RootState], string>) =>
      options?.storage?.getItem(k);

    const items = {} as RootState[keyof RootState];
    if (typeof options?.storage?.getItem) {
      for (const key in initialRootState[slice]) {
        const item = JSON.parse((await getItem(key)) || "null");

        if (item) {
          items[key] = item;
        }
      }
    }
    return items;
  };
  const setStorageItems = <State extends Record<any, any>>(
    slice: keyof RootState,
    state: State
  ) => {
    const setItem = (k: Extract<keyof RootState[keyof RootState], string>, v: string) =>
      options?.storage?.setItem(k, v);

    if (options?.storage?.setItem) {
      for (const key in initialRootState[slice]) {
        if (
          Object.prototype.hasOwnProperty.call(initialRootState[slice], key) &&
          Object.prototype.hasOwnProperty.call(state, key)
        ) {
          setItem(key, JSON.stringify(state[key]));
        }
      }
    }
  };
  if (options?.persist?.length) {
    options?.persist.forEach((slice) => {
      if (Object.prototype.hasOwnProperty.call(initialRootState, slice)) {
        getStorageItems(slice).then((state) => {
          if (state) globalStore.setSlice(slice, state);
        });
      }
      globalStore.subscribeSlice(
        slice,
        "THIS_IS_A_LISTENER_FOR_PERSISTANCE",
        ({ key }) => {
          setStorageItems(slice, {
            [key]: globalStore.getValue(slice, key),
          });
        }
      );
    });
  }
  const clearEstate = <T extends keyof RootState>(slice?: T) => {
    if (slice) {
      globalStore.setSlice(slice, initialRootState[slice]);
    } else {
      getObjectKeys(initialRootState).forEach((slice) => {
        globalStore.setSlice(slice, initialRootState[slice]);
      });
    }
  };

  return {
    store: globalStore.store,
    set: setter(initialRootState),
    subscribe: <Slice extends keyof RootState, Key extends keyof RootState[Slice]>(
      slice: Slice,
      key: Key,
      listenerId: string | undefined,
      callback: ListenerCallback,
      once = false
    ) => globalStore.subscribe(slice, key, listenerId, callback, once),
    clearEstate,
  };
};
