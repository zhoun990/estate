import { RootStateType, Payload } from "@e-state/core";

export type SetEstates<RootState extends RootStateType> = {
	[slice in keyof RootState]: (
		payload: Payload<RootState, slice>,
		forceRenderer?: boolean
	) => SetEstates<RootState>;
};
