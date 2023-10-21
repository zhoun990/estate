export type Reducers<ContextState> = (
	state: ContextState,
	payload: any
) => void | ContextState;
type Action<ContextState> = (
	currentRootState: ContextState
) => void | ContextState;
type Rerender<State> = ((key: keyof State, state: State) => boolean)[];
type SliceState<RootState, Slice extends keyof RootState> = {
	[Key in keyof RootState[Slice]]: RootState[Slice][Key];
};
export type StateWithRerenders<RootState> = {
	[Slice in keyof RootState]: SliceState<RootState, Slice> & {
		_rerenders?: Rerender<RootState[Slice]>;
	};
};
export type Reducer<ContextState> = (
	action: (actions: Actions<ContextState>) => Action<ContextState>
) => void;
export type ActionBuilderPayload<State, Slice extends keyof State> = {
	[Key in keyof State[Slice]]?: State[Slice][Key] | Action<State[Slice][Key]>;
};
type UpdaterBuilder<State, Slice extends keyof State> = (
	payload: ActionBuilderPayload<State, Slice>
) => Action<State>;
type Actions<State> = {
	[Slice in keyof State]: (
		payload: ActionBuilderPayload<State, Slice>
	) => Action<State>;
};
export type Updaters<State> = {
	[Slice in keyof State]: UpdaterBuilder<State, Slice>;
};
export type RootStateType = StateWithRerenders<Record<any, Record<any, any>>>;
