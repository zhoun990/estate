import {
	createEstate as createEstateCore,
	generateRandomID,
	getObjectKeys,
	GlobalStore,
	isFunction,
	isKey,
	Options,
	RootStateType,
} from "@e-state/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { SetEstates } from "../types";
/**
 *
 * @param initialRootState - Key value pair of StateLabel and state
 * @param options.persist - List of StateLabel for persistence
 * @param options.storage - Storage to be used for persistence. When not specified, localStorage will be used (web only). sync/async
 * @returns useEstate, clearEstate
 */
export const createEstate = <RootState extends RootStateType>(
	initialRootState: RootState,
	options?: Options<RootState>
) => {
	const { clearEstate, subscribe, set, store } = createEstateCore(
		initialRootState,
		options
	);

	const setEstates = getObjectKeys(initialRootState).reduce<
		SetEstates<RootState>
	>((pv, slice) => {
		try {
			pv[slice] = (payload) => {
				set[slice](payload);
				return setEstates;
			};
		} catch (error) {
			console.warn("^_^ Log \n file: createEstate.ts:50 \n error:", error);
		}

		return pv;
	}, {} as SetEstates<RootState>);
	const useEstate = <Slice extends keyof RootState>(slice: Slice) => {
		const [state, r] = useState(Object.assign({}, store[slice]));
		const rerenderId = useRef(generateRandomID(20));
		const unsubscribes = useRef<Record<string, () => void>>({});
		const forceRenderer = () => {
			r(Object.assign({}, store[slice]));
		};
		useEffect(() => {
			r(Object.assign({}, store[slice]));
			return () => {
				Object.values(unsubscribes.current).forEach((unsubscribe) => {
					unsubscribe();
				});
			};
		}, []);
		return useCallback(() => {
			const handler: ProxyHandler<typeof store> = {
				get(target, key: keyof typeof store, receiver) {
					if (!isKey(target, key)) return;
					if (isFunction(target[key])) {
						return target[key];
					}
					// sliceDetecter(key).forEach((slice) => {
					const id = [slice, key, rerenderId.current].join("###");
					if (!unsubscribes.current[id]) {
						const unsb = subscribe(slice, key, rerenderId.current, () => {
							r(Object.assign({}, store[slice]));
						});
						unsubscribes.current[id] = unsb;
					}
					// });

					return target[key];
				},
			};

			return {
				...new Proxy(state, handler),
				setEstate: setEstates[slice],
				setEstates,
				forceRenderer,
			};
		}, [slice, state])();
	};

	return { useEstate, clearEstate, setEstates };
};
