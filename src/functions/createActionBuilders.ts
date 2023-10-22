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
		(acc, value) => {
			acc[value] = createUpdater(value, onUpdateState);
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
