import { GlobalStore, StoreHandler } from "./GlobalStore";
import { PayloadValue, RootStateType } from "../types";
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
			acc[slice] = (payload, forceRenderer) => {
				const globalStore = GlobalStore.getInstance<RootState>();
				getObjectKeys(payload).forEach(async (key) => {
					try {
						const cb: PayloadValue<
							RootState,
							typeof slice,
							keyof typeof payload
						> = payload[key]!;
						if (isCallable(cb)) {
							try {
								const pr = await cb(
									globalStore.getValue(slice, key),
									globalStore.getStore()
								);
								let value = Array.isArray(pr) ? pr[0] : pr;
								try {
									globalStore.setValue(
										slice,
										key,
										value as RootState[typeof slice][keyof typeof payload],
										forceRenderer
									);
								} catch (error) {
									console.error("##@e-state/core:setter:set_value## :", {
										key,
										storeValue: globalStore.getValue(slice, key),
										error,
										value,
									});
								}
							} catch (error) {
								console.error("##@e-state/core:setter:callable## :", {
									key,
									value: globalStore.getValue(slice, key),
									error,
								});
							}
						} else {
							globalStore.setValue(slice, key, cb, forceRenderer);
						}
					} catch (error) {
						console.error("##@e-state/core:setter## :", {
							key,
							error,
						});
					}
				});
			};
			return acc;
		},
		{} as {
			[slice in keyof RootState]: (
				payload: Payload<RootState, slice>,
				forceRenderer?: boolean
			) => void;
		}
	);
