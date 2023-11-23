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
	reducer,
	setup,
	getRootState,
}: {
	reducer: Reducer<RootState>;
	getRootState: () => RootState;
	setup?: (rerender: React.Dispatch<React.SetStateAction<RootState>>) => void;
}) => {
	return <T extends keyof RootState>(slice: T) => {
		const [state, _r] = useState(getRootState());
		const rerenderId = useRef(generateRandomID(10));
		const r = useRef(_r);
		useEffect(() => {
			r.current = _r;
			setup?.(r.current);
			return () => {
				// reducer(() => (rootState) => {
				// 	const rerenders = rootState[slice]._rerenders;
				// 	if (rerenders) {
				// 		delete rerenders[rerenderId.current];
				// 	}
				// });
				r.current = () => {};
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
							r.current(Object.assign({}, currentRootState));
							return true;
						}
						return false;
					};
					reducer(() => (rootState) => {
						const rerenders = rootState[slice]._rerenders;

						if (!rerenders) {
							rootState[slice]._rerenders = {
								[rerenderId.current]: [rerender],
							};
						} else if (!rerenders[rerenderId.current]) {
							rerenders[rerenderId.current] = [rerender];
						} else {
							rerenders[rerenderId.current].push(rerender);
						}
					});
					return target[property];
				},
			};
			return new Proxy(store, handler);
		}, [slice, state])();
	};
};
