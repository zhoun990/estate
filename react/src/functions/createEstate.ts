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
//[ToDO] 複数個所で初期化してsliceを追加可能に
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

  const useEstate = <Slice extends keyof RootState>(slice: Slice) => {
    const [_rerender, r] = useState("0");
    const rerenderId = useMemo(() => generateRandomID(20), []);
    const unsubscribes = useMemo<Map<string, () => void>>(() => new Map(), []);
    useEffect(() => {
      r(Date.now().toString());
      return () => {
        Array.from(unsubscribes.values()).forEach((unsubscribe) => {
          unsubscribe();
        });
        unsubscribes.clear();
      };
    }, []);
    const createGetter = useCallback((key: keyof RootState[Slice]) => {
      const getter = () => {
        const id = [slice, key, rerenderId].join("###");
        try {
          if (!unsubscribes.has(id)) {
            debag("getter:subscribe:id:", id);
            const unsb = globalStore.subscribe(
              slice,
              key,
              rerenderId,
              ({ updateId }) => {
                r(updateId);
              }
            );
            unsubscribes.set(id, unsb);
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
        return globalStore.store.get(slice)?.get(key);
      };
      return getter;
    }, []);
    const returnObject = useMemo(
      () => ({
        ...Array.from(globalStore.store.get(slice)?.keys() || []).reduce<{
          [key in keyof RootState[Slice]]: Getter<RootState[Slice][key]>;
        }>((pv, key) => {
          const getter = createGetter(key);
          pv[key as keyof RootState[Slice]] = getter;
          return pv;
        }, {} as any),
        setEstate: setEstates[slice],
        setEstates,
      }),
      []
    );
    return returnObject;
  };
  return { useEstate, clearEstate, setEstates, store: globalStore };
};
