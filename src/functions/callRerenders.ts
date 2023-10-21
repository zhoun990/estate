import { RootStateType } from "../types";

export const callRerenders = <
	RootState extends RootStateType,
	Slice extends keyof RootState
>({
	rootState,
	slice,
	key,
}: {
	rootState: RootState;
	slice: Slice;
	key: keyof RootState[Slice] | "*";
}) => {
	const state = rootState[slice];
	const consumed: number[] = [];
	state._rerenders?.forEach((rerender, i) => {
		if (rerender(key, rootState)) consumed.push(i);
	});
	state._rerenders = (state._rerenders || []).filter(
		(_, i) => !consumed.includes(i)
	);
};
