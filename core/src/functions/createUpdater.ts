import { GlobalStore } from "./GlobalStore";
import { RootStateType } from "../types";
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
				const store = GlobalStore.getInstance<RootState>();
				// const store = new GlobalStore<RootState>();
				getObjectKeys(payload).forEach((key) => {
					type Param = State[keyof typeof payload];
					const cb: Param | ((value: Param) => Param) = payload[key]!;
					if (isCallable(cb)) {
						try {
							const value = cb(store.getValue(slice, key));
							if (value !== null && value !== undefined) {
								store.setValue(slice, key, value);
							}
						} catch (err) {
							console.error({ key, value: store.getValue(slice, key), err });
						}
					} else {
						store.setValue(slice, key, cb);
					}
				});
			};
			return acc;
		},
		{} as {
			[slice in keyof RootState]: (payload: {
				[key in keyof RootState[slice]]?:
					| RootState[slice][key]
					| ((value: RootState[slice][key]) => RootState[slice][key]);
			}) => void;
		}
	);
