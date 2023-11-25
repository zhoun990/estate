export type Reducers<ContextState> = (
	state: ContextState,
	payload: any
) => void | ContextState;
type Action<ContextState> = (currentValue: ContextState) => void | ContextState;
type Rerender<State> = Record<
	string,
	((key: keyof State, state: State) => boolean)[]
>;
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
export type Options<RootState> = {
	persist?: (keyof RootState)[];
	storage?: {
		getItem(key: any): Promise<any> | any;
		setItem(key: any, value: any): Promise<void> | void;
		// removeItem(key: any): Promise<void> | void;
	};
};
export type UpdaterCallback = <
	RootState extends RootStateType,
	Slice extends keyof RootState
>(props: {
	prevuesState: RootState;
	newState: RootState;
	slice: Slice;
	key: keyof RootState[Slice];
}) => void;
