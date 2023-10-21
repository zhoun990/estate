import { Reducers, StateWithRerenders, Updaters } from "../types";
import { getObjectKeys } from "./utils";
import { createUpdater } from "./createUpdater";

export const createActionBuilders = <
	RootState extends StateWithRerenders<Record<any, Record<any, any>>>
>(
	rootState: RootState
) => {
	type ReducersRecord = Record<keyof RootState, Reducers<RootState>>;
	const updaters = getObjectKeys(rootState).reduce<ReducersRecord>(
		(acc, value) => {
			acc[value] = createUpdater(value);
			return acc;
		},
		{} as ReducersRecord
	);
	const actions = {} as Updaters<RootState>;
	getObjectKeys(updaters).forEach((key) => {
		actions[key] =
			(...payload) =>
			(currentRootState) =>
				updaters[key](currentRootState, payload[0]);
	});
	return {
		actions,
	};
};
