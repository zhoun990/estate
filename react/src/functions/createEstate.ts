import {
  createEstate as createEstateCore,
  generateRandomID,
  getObjectKeys,
  GlobalStore,
  Options,
  RootStateType,
  debugTrace,
} from "@e-state/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DependencyList, SetEstates } from "../types";

type Selector<T, K> = (value: T) => K;
type Compare<T> = (prev: T, next: T) => boolean;
type SelectorOrCompare<T, K> = Selector<T, K> | [Selector<T, K>, Compare<T>];

//[TODO] 複数個所で初期化してsliceを追加可能に
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
  const {
    clearEstate,
    set,
    getStoredKeys,
    addStoredKey,
    removeStoredKey,
    clearSliceFromStorage,
    clearAllStoredKeys,
  } = createEstateCore(initialRootState, options);
  const globalStore = GlobalStore.getInstance<RootState>();
  const setEstates = getObjectKeys(initialRootState).reduce<
    SetEstates<RootState>
  >((pv, slice) => {
    try {
      pv[slice] = (payload, forceRenderer) => {
        set[slice](payload, forceRenderer);
        return setEstates;
      };
    } catch (error) {
      throw new Error("##@e-state/react:setEstates## :", { cause: error });
    }

    return pv;
  }, {} as SetEstates<RootState>);
  /**
   * This hook rerenders when the return value of selector changes.
   * The selector function is memoized. It will be updated if the contents of the deps array or the key change.
   */
  const useSelectorWithSlice = <
    Slice extends keyof RootState,
    Key extends keyof RootState[Slice],
    T
  >(
    slice: Slice,
    key: Key,
    /** セレクタ関数、または[セレクタ, 比較関数]のペア。比較関数がtrueを返すと同じ値と判断しレンダリングをスキップ、falseで異なる値と判断しレンダリングする。 */
    selectorOrCompare: SelectorOrCompare<RootState[Slice][Key], T>,
    deps: DependencyList
  ) => {
    const rerenderIdRef = useRef(generateRandomID(20));
    const rerenderId = useMemo(() => rerenderIdRef.current, []);
    const [updateId, rerender] = useState<string>(rerenderId);

    const [selector, compare] = Array.isArray(selectorOrCompare)
      ? selectorOrCompare
      : [
          selectorOrCompare,
          (prev: RootState[Slice][Key], next: RootState[Slice][Key]) => {
            const selector = selectorOrCompare;

            const a = selector(prev);
            const b = selector(next);
            const isSame = a === b;

            return isSame;
          },
        ];

    useEffect(() => {
      const unsb = globalStore.subscribe({
        slice,
        key,
        listenerId: rerenderId,
        callback: ({ updateId: id }) => {
          rerender(id);
        },
        compare,
      });
      return () => {
        unsb();
      };
    }, [...deps, key]);

    const value = useMemo(
      () => selector(globalStore.getValue(slice, key)),
      [updateId, ...deps, key]
    );

    return value;
  };
  /**
   * @example
   *  const { someState, setEstate } = useEstate("someSlice");
   */
  const useEstate = <Slice extends keyof RootState>(slice: Slice) => {
    const rerenderIdRef = useRef(generateRandomID(20));
    const rerenderId = useMemo(() => rerenderIdRef.current, []);

    const [updateId, rerender] = useState<string>(rerenderId);
    const unsubscribes = useRef<Map<string, () => void>>(new Map());
    const subscribeKeys = useRef<Set<string>>(new Set());
    const subscribe = useCallback((key: keyof RootState[Slice]) => {
      const id = [slice, key, rerenderId].join("###");
      try {
        if (!unsubscribes.current.has(id)) {
          debugTrace("getter:subscribe:id:", id);
          const unsb = globalStore.subscribe({
            slice,
            key,
            listenerId: rerenderId,
            callback: ({ updateId }) => {
              rerender(updateId);
            },
          });
          unsubscribes.current.set(id, unsb);
        }
      } catch (error) {
        throw new Error("##@e-state/react:getter:handle_subscribe## :", {
          cause: {
            rerenderId,
            slice,
            key,
            error,
          },
        });
      }
    }, []);
    useEffect(() => {
      rerender(Date.now().toString());
      subscribeKeys.current.forEach((key) => {
        subscribe(key);
      });
      return () => {
        Array.from(unsubscribes.current.values()).forEach((unsubscribe) => {
          unsubscribe();
        });
        unsubscribes.current.clear();
      };
    }, []);

    const subscribeRegister = useMemo(() => {
      const object = {};
      Object.keys(initialRootState[slice]).forEach((key) => {
        Object.defineProperty(object, key, {
          get: () => {
            subscribeKeys.current.add(key);
            return globalStore.getValue(slice, key);
          },
          enumerable: true,
        });
      });

      return object as RootState[Slice];
    }, []);
    const useSelector = useCallback(
      <Key extends keyof RootState[Slice], T>(
        key: Key,
        selectorOrCompare: SelectorOrCompare<RootState[Slice][Key], T>,
        deps: DependencyList
      ) => useSelectorWithSlice(slice, key, selectorOrCompare, deps),
      [slice]
    );
    const currentStates = useMemo(() => {
      const object = {};
      Object.defineProperties(
        object,
        Object.getOwnPropertyDescriptors(
          updateId === rerenderId
            ? subscribeRegister
            : globalStore.getSlice(slice)
        )
      );
      Object.defineProperties(object, {
        setEstate: {
          value: (payload: Partial<RootState[Slice]>) => {
            setEstates[slice](payload);
          },
          writable: false,
          enumerable: false,
        },
        setEstates: {
          value: setEstates,
          writable: false,
          enumerable: false,
        },
        useSelector: {
          value: useSelector,
          writable: false,
          enumerable: false,
        },
      });
      return object as RootState[Slice] & {
        setEstate: SetEstates<RootState>[Slice];
        setEstates: SetEstates<RootState>;
        useSelector: typeof useSelector;
      };
    }, [updateId]);
    return currentStates;
  };

  return {
    useEstate,
    clearEstate,
    setEstates,
    store: globalStore,
    useSelectorWithSlice,
    getStoredKeys,
    addStoredKey,
    removeStoredKey,
    clearSliceFromStorage,
    clearAllStoredKeys,
  };
};
