import { GlobalStore } from "./GlobalStore";
import { PayloadValue, RootStateType } from "../types";
import { getObjectKeys, isCallable } from "./utils";
import { Payload } from "../types";
export const setter = <RootState extends RootStateType>(
	initialRootState: RootState
) =>
	getObjectKeys(initialRootState).reduce<{
		[slice in keyof RootState]: (payload: Payload<RootState, slice>) => void;
	}>(
		(acc, slice) => {
			acc[slice] = (payload) => {
				type State = RootState[typeof slice];
				const globalStore = GlobalStore.getInstance<RootState>();
				// const store = new GlobalStore<RootState>();
				getObjectKeys(payload).forEach(async (key) => {
					const cb: PayloadValue<
						RootState,
						typeof slice,
						keyof typeof payload
					> = payload[key]!;
					if (isCallable(cb)) {
						try {
							const pr = await cb(
								globalStore.getValue(slice, key),
								globalStore.getSlice(slice),
								globalStore.store
							);
							if (Array.isArray(pr)) {
								const [v, sliceValue, rootValue] = pr;
								if (sliceValue) globalStore.setSlice(slice, sliceValue);
								if (rootValue) {
									getObjectKeys(rootValue).forEach((slice) => {
										const s = rootValue[slice];
										if (s) globalStore.setSlice(slice, s);
									});
								}
							}
							const value = Array.isArray(pr) ? pr[0] : pr;
							if (value !== null && value !== undefined) {
								globalStore.setValue(
									slice,
									key,
									value as RootState[typeof slice][keyof typeof payload]
								);
							}
						} catch (error) {
							console.error("##@e-state/core:setter## :", {
								key,
								value: globalStore.getValue(slice, key),
								error,
							});
						}
					} else {
						globalStore.setValue(slice, key, cb);
					}
				});
			};
			return acc;
		},
		{} as {
			[slice in keyof RootState]: (payload: Payload<RootState, slice>) => void;
		}
	);
