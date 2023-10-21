import { RootStateType, Reducers } from "../types";
import { getObjectKeys, isCallable } from "./utils";
import { callRerenders } from "./callRerenders";

export const createUpdater = <
	RootState extends RootStateType,
	Slice extends keyof RootState
>(
	slice: Slice
): Reducers<RootState> => {
	type State = RootState[typeof slice];
	return (
		rootState,
		payload: {
			[key in keyof State]?: State[key] | ((value: State[key]) => State[key]);
		}
	) => {
		const state = rootState[slice];
		getObjectKeys(payload).forEach((key) => {
			const currentRootState = state[key];
			type Param = State[typeof key];
			const cb: Param | ((value: Param) => Param) = payload[key]!;
			if (isCallable(cb)) {
				try {
					const clonedState = structuredClone(state[key]);
					const value = cb(clonedState);
					if (value !== null && value !== undefined) state[key] = value;
				} catch (err) {
					console.error({ key, value: state[key], err });
				}
			} else {
				state[key] = cb;
			}
			if (currentRootState !== state[key]) {
				callRerenders({ rootState, slice, key });
			}
		});
	};
};
