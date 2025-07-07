import { GlobalStore } from "./GlobalStore";
import { PayloadReturnValue, PayloadValue, RootStateType } from "../types";
import { getObjectKeys, isCallable } from "./utils";
import { debugError } from "./debug";
import { Payload } from "../types";
export const setter = <RootState extends RootStateType>(
  initialRootState: RootState
) =>
  getObjectKeys(initialRootState).reduce<{
    [slice in keyof RootState]: (
      payload: Payload<RootState, slice>,
      forceRenderer?: boolean
    ) => void;
  }>(
    (acc, slice) => {
      try {
        acc[slice] = (payload, forceRenderer) => {
          const globalStore = GlobalStore.getInstance<RootState>();
          getObjectKeys(payload).forEach((key) => {
            try {
              const cb: PayloadValue<
                RootState,
                typeof slice,
                keyof typeof payload
              > = payload[key]!;
              const setter: (
                latestValue: RootState[typeof slice][keyof typeof payload]
              ) => PayloadReturnValue<
                RootState[typeof slice][keyof typeof payload]
              > = (latestValue) => {
                if (isCallable(cb)) {
                  try {
                    const result = cb(latestValue);
                    // Promiseの場合、rejected promiseをキャッチしてdebugErrorで出力
                    if (result && typeof result.then === 'function') {
                      result.catch((error: any) => {
                        debugError('Promise rejected in setter:', error);
                      });
                    }
                    return result;
                  } catch (error) {
                    debugError('Error in setter:', error);
                    return latestValue; // エラーが発生した場合は元の値を返す
                  }
                }
                return cb;
              };

              try {
                try {
                  globalStore.setValue(slice, key, setter, forceRenderer);
                } catch (error) {
                  throw new Error("##@e-state/core:setter:set_value## :", {
                    cause: {
                      key,
                      storeValue: globalStore.getValue(slice, key),
                      error,
                    },
                  });
                }
              } catch (error) {
                throw new Error("##@e-state/core:setter:callable## :", {
                  cause: {
                    key,
                    value: globalStore.getValue(slice, key),
                    error,
                  },
                });
              }
            } catch (error) {
              throw new Error("##@e-state/core:setter## :", {
                cause: { slice, key, error },
              });
            }
          });
        };
      } catch (error) {
        throw new Error("##@e-state/core:setter## :", {
          cause: {
            slice,
            error,
          },
        });
      }

      return acc;
    },
    {} as {
      [slice in keyof RootState]: (
        payload: Payload<RootState, slice>,
        forceRenderer?: boolean
      ) => void;
    }
  );
