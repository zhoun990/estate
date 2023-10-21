import { useCallback, useState } from "react";
import { StateWithRerenders, Reducer, ActionBuilderPayload } from "../types";
import { isFunction } from "./utils";
import { isKey } from "./utils";

export const createHook = <
	RootState extends StateWithRerenders<Record<any, Record<any, any>>>
>({
	initialRootState,
	reducer,
}: {
	reducer: Reducer<RootState>;
	initialRootState: RootState;
}) => {
	return <T extends keyof RootState>(slice: T) => {
		const [state, r] = useState(initialRootState);
		return useCallback(() => {
			const setEstate = (payload: ActionBuilderPayload<RootState, T>) => {
				const res = reducer((actions) => actions[slice](payload));
				return res;
			};
			const store = { ...state[slice], setEstate };
			const handler: ProxyHandler<typeof store> = {
				get(target, property: keyof typeof store, receiver) {
					if (!isKey(target, property)) return;
					if (isFunction(target[property])) {
						return target[property];
					}
					const rerender = (
						key: keyof typeof store,
						currentRootState: RootState
					) => {
						if (property === key || key === "*") {
							r(Object.assign({}, currentRootState));
							return true;
						}
						return false;
					};
					reducer(() => (rootState) => {
						if (!Array.isArray(rootState[slice]._rerenders)) {
							rootState[slice]._rerenders = [];
						}
						rootState[slice]._rerenders?.push(rerender);
					});
					return target[property];
				},
			};
			return new Proxy(store, handler);
		}, [slice, state])();
	};
};
