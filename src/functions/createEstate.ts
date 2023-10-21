import { Reducer } from "../types";
import { getObjectKeys } from "./utils";
import { createActionBuilders } from "./createActionBuilders";
import { createHook } from "./createHook";

export const createEstate = <RootState extends Record<any, Record<any, any>>>(
	initialRootState: RootState
) => {
	let rootState = structuredClone(initialRootState);
	const { actions } = createActionBuilders(rootState);
	const reducer: Reducer<RootState> = (action) => {
		const s = action(actions)(rootState);
		if (s) {
			rootState = s;
		}
	};
	const clearEstate = <T extends keyof RootState>(slice?: T) => {
		if (slice) {
			reducer((actions) => actions[slice](initialRootState[slice]));
		} else {
			getObjectKeys(initialRootState).forEach((slice) => {
				reducer((actions) => actions[slice](initialRootState[slice]));
			});
		}
	};
	return {
		useEstate: createHook({ reducer, initialRootState }),
		clearEstate,
	};
};
