import { useCallback, useEffect, useRef, useState } from "react";
import {
	StateWithRerenders,
	Reducer,
	ActionBuilderPayload,
	Options,
} from "../types";
import { isFunction } from "./utils";
import { isKey } from "./utils";
function generateRandomID(length: number) {
	const characters =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let randomID = "";

	for (let i = 0; i < length; i++) {
		const randomIndex = Math.floor(Math.random() * characters.length);
		randomID += characters.charAt(randomIndex);
	}

	return randomID;
}
function isObject(obj: any): obj is Object {
	return obj instanceof Object;
}
export const createHook = <
	RootState extends StateWithRerenders<Record<any, Record<any, any>>>
>({
	initialRootState,
	reducer,
	setup,
}: {
	reducer: Reducer<RootState>;
	initialRootState: RootState;
	setup?: (rerender: React.Dispatch<React.SetStateAction<RootState>>) => void;
}) => {
	return <T extends keyof RootState>(slice: T) => {
		const [state, r] = useState(initialRootState);
		const rerenderId = useRef(generateRandomID(10));
		useEffect(() => {
			setup?.(r);
			return () => {
				reducer(() => (rootState) => {
					const rerenders = rootState[slice]._rerenders;
					if (rerenders) {
						delete rerenders[rerenderId.current];
					}
				});
			};
		}, []);
		return useCallback(() => {
			const setEstate = (payload: ActionBuilderPayload<RootState, T>) => {
				reducer((actions) => actions[slice](payload));
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
						if (!rootState[slice]._rerenders) {
							rootState[slice]._rerenders = {};
						}
						const rerenders = rootState[slice]._rerenders;
						if (rerenders) {
							rerenders[rerenderId.current] = rerender;
						}
					});
					return target[property];
				},
			};
			return new Proxy(store, handler);
		}, [slice, state])();
	};
};
