import {
  createEstate as createEstateCore,
  generateRandomID,
  getObjectKeys,
  GlobalStore,
  Options,
  RootStateType,
  debag,
} from "@e-state/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Getter, SetEstates } from "../types";
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
  const { clearEstate, set } = createEstateCore(initialRootState, options);
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
   * @example
   *  const { someState } = useEstate("someSlice");
   *  useEffect(() => {
   *    const state = someState();
   *    //...
   *  }, [someState()]);
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
          debag("getter:subscribe:id:", id);
          const unsb = globalStore.subscribe(
            slice,
            key,
            rerenderId,
            ({ updateId }) => {
              rerender(updateId);
            }
          );
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
      });
      return object as RootState[Slice] & {
        setEstate: SetEstates<RootState>[Slice];
        setEstates: SetEstates<RootState>;
      };
    }, [updateId]);
    return currentStates;
  };
  return { useEstate, clearEstate, setEstates, store: globalStore };
};
