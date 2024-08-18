import { RootStateType, Payload } from "@e-state/core";

export type SetEstates<RootState extends RootStateType> = {
	[slice in keyof RootState]: (
		payload: Payload<RootState, slice>,
		forceRenderer?: boolean
	) => SetEstates<RootState>;
};
export type Getter<
	RootState extends RootStateType,
	Slice extends keyof RootState,
	Key extends keyof RootState[Slice]
> = () => RootState[Slice][Key];
