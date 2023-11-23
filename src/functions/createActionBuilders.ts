import {
	Options,
	Reducers,
	RootStateType,
	StateWithRerenders,
	UpdaterCallback,
	Updaters,
} from "../types";
import { getObjectKeys } from "./utils";
import { createUpdater } from "./createUpdater";

export const createActionBuilders = <
	RootState extends RootStateType
>(
	rootState: RootState,
	onUpdateState?: UpdaterCallback
) => {
	type ReducersRecord = Record<keyof RootState, Reducers<RootState>>;
	const updaters = getObjectKeys(rootState).reduce<ReducersRecord>(
		(acc, slice) => {
			acc[slice] = createUpdater(slice, onUpdateState);
			return acc;
		},
		{} as ReducersRecord
	);
	const actions = {} as Updaters<RootState>;
	getObjectKeys(updaters).forEach((slice) => {
		actions[slice] =
			(...payload) =>
			(currentRootState) =>
				updaters[slice](currentRootState, payload[0]);
	});
	return {
		actions,
	};
};
