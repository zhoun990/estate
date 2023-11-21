import { RootStateType, Reducers, UpdaterCallback } from "../types";
import { clone } from "./cclone";
import { getObjectKeys, isCallable } from "./utils";
export const createUpdater = <
	RootState extends RootStateType,
	Slice extends keyof RootState
>(
	slice: Slice,
	callback?: UpdaterCallback
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
					const clonedState = clone(state[key]);
					const value = cb(clonedState);
					if (value !== null && value !== undefined) state[key] = value;
				} catch (err) {
					console.error({ key, value: state[key], err });
				}
			} else {
				state[key] = cb;
			}
			if (currentRootState !== state[key]) {
				callback?.({
					prevuesState: currentRootState,
					newState: rootState,
					slice,
					key,
				});
			}
		});
	};
};
