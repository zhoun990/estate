import { GlobalStore, StoreHandler } from "./GlobalStore";
import { PayloadReturnValue, PayloadValue, RootStateType } from "../types";
import { getObjectKeys, isCallable } from "./utils";
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
          getObjectKeys(payload).forEach(async (key) => {
            try {
              const cb: PayloadValue<
                RootState,
                typeof slice,
                keyof typeof payload
              > = payload[key]!;
              const setter: (
                latestValue: RootState[typeof slice][keyof typeof payload]
              ) => Promise<
                PayloadReturnValue<
                  RootState[typeof slice][keyof typeof payload]
                >
              > = async (latestValue) =>
                isCallable(cb) ? await cb(latestValue) : cb;

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
