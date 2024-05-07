import {
  createEstate as createEstateCore,
  generateRandomID,
  getObjectKeys,
  GlobalStore,
  isFunction,
  isKey,
  Options,
  RootStateType,
} from "@e-state/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { SetEstates } from "../types";
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
  const setEstates = getObjectKeys(initialRootState).reduce<SetEstates<RootState>>(
    (pv, slice) => {
      try {
        pv[slice] = (payload, forceRenderer) => {
          set[slice](payload, forceRenderer);
          return setEstates;
        };
      } catch (error) {
        throw new Error("##@e-state/react:setEstates## :", { cause: error });
      }

      return pv;
    },
    {} as SetEstates<RootState>
  );
  const useEstate = <Slice extends keyof RootState>(slice: Slice) => {
    const [_rerender, r] = useState("0");
    const rerenderId = useRef(generateRandomID(20));
    const unsubscribes = useRef<Record<string, () => void>>({});
    useEffect(() => {
      r(Date.now().toString());
      return () => {
        Object.values(unsubscribes.current).forEach((unsubscribe) => {
          unsubscribe();
        });
        unsubscribes.current = {};
      };
    }, []);
    return useCallback(() => {
      const forceRenderer = () => {
        r(Date.now().toString());
      };
      const handler: ProxyHandler<RootState> = {
        get(target, key: keyof RootState, receiver) {
          if (!isKey(target, key)) {
            throw new Error("##@e-state/react:not-a-key## :", { cause: { target, key } });
          }
          if (
            isFunction(target[key]) ||
            ["setEstate", "setEstates", "forceRenderer"].includes(String(key))
          ) {
            return target[key];
          }
          // sliceDetecter(key).forEach((slice) => {})
          const id = [slice, key, rerenderId.current].join("###");
          try {
            if (!unsubscribes.current[id]) {
              const unsb = globalStore.subscribe(
                slice,
                key,
                rerenderId.current,
                ({ updateId }) => {
                  r(updateId);
                }
              );
              unsubscribes.current[id] = unsb;
            }
          } catch (error) {
            throw new Error("##@e-state/react:getter:handle_subscribe## :", {
              cause: {
                rerenderId: rerenderId.current,
                slice,
                key,
                error,
              },
            });
          }
          return target[key];
        },
      };
      return new Proxy(
        {
          ...globalStore.getSlice(slice),
          setEstate: setEstates[slice],
          setEstates,
          forceRenderer,
        },
        handler
      );
      // return {
      //   ...new Proxy(globalStore.getSlice(slice), handler),
      //   setEstate: setEstates[slice],
      //   setEstates,
      //   forceRenderer,
      // };
    }, [slice, _rerender])();
  };

  return { useEstate, clearEstate, setEstates, store: globalStore };
};
