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
  const { clearEstate, subscribe, set } = createEstateCore(initialRootState, options);
  const globalStore = GlobalStore.getInstance<RootState>();

  const setEstates = getObjectKeys(initialRootState).reduce<SetEstates<RootState>>(
    (pv, slice) => {
      try {
        pv[slice] = (payload, forceRenderer) => {
          set[slice](payload, forceRenderer);
          return setEstates;
        };
      } catch (error) {
        console.warn("##@e-state/react:setEstates## :", error);
      }

      return pv;
    },
    {} as SetEstates<RootState>
  );
  const useEstate = <Slice extends keyof RootState>(slice: Slice) => {
    const [_rerender, r] = useState(0);
    const rerenderId = useRef(generateRandomID(20));
    const unsubscribes = useRef<Record<string, () => void>>({});

    useEffect(() => {
      console.log(
        "^_^ Log \n file: createEstate.ts:50 \n import.meta.hot:",
        import.meta.hot
      );
      if (import.meta.hot) {
        import.meta.hot.accept();
      }
    }, [_rerender]);
    useEffect(() => {
      r(Date.now());
      //   if (import.meta.hot) {
      //     import.meta.hot.invalidate();
      //   }
      return () => {
        Object.values(unsubscribes.current).forEach((unsubscribe) => {
          unsubscribe();
        });
      };
    }, []);
    return useCallback(() => {
      const forceRenderer = () => {
        r(Date.now());
      };
      const handler: ProxyHandler<RootState> = {
        get(target, key: keyof RootState, receiver) {
          if (!isKey(target, key)) return;
          if (isFunction(target[key])) {
            return target[key];
          }
          // sliceDetecter(key).forEach((slice) => {})
          const id = [slice, key, rerenderId.current].join("###");
          try {
            if (!unsubscribes.current[id]) {
              const unsb = subscribe(slice, key, rerenderId.current, () => {
                r((cv) => cv + 1);
				
                console.log(
                  "^_^ Log \n file: createEstate.ts:97 \n Date.now():",
                  Date.now()
                );
                if (import.meta.hot) {
                  import.meta.hot.accept();
                }
              });
              unsubscribes.current[id] = unsb;
            }
          } catch (error) {
            console.error("##@e-state/react:getter:handle_subscribe## :", {
              rerenderId: rerenderId.current,
              slice,
              key,
              error,
            });
          }
          return target[key];
        },
      };
      return {
        ...new Proxy(globalStore.getSlice(slice), handler),
        setEstate: setEstates[slice],
        setEstates,
        forceRenderer,
      };
    }, [slice, _rerender])();
  };

  return { useEstate, clearEstate, setEstates, store: globalStore };
};
