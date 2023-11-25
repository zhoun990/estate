import {
	createEstate as createEstateCore,
	generateRandomID,
	getObjectKeys,
	GlobalStore,
	isFunction,
	isKey,
	Options,
	Payload,
	RootStateType,
} from "@e-state/core";
import { useCallback, useEffect, useRef, useState } from "react";
type SetEstates<RootState extends RootStateType> = {
	[slice in keyof RootState]: (
		payload: Payload<RootState, slice>
	) => SetEstates<RootState>;
};
//[ToDo] createEstateの返り値にフックを追加し、setEstateで特定のキーに変更があった場合、変更された値を受け取り、最終的な値を返すMiddleware的な関数を設定できるようにする。
//[ToDo] useEstateの引数を配列かStringに変更し、配列の場合は複数のスライスを参照するようにする。
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
	>((acc, slice) => {
		acc[slice] = (payload: Payload<RootState, typeof slice>) => {
			set[slice](payload);
			return setEstates;
		};
		return acc;
	}, {} as SetEstates<RootState>);
	const useEstate = <Slice extends keyof RootState>(slice: Slice) => {
		const [state, r] = useState(initialRootState[slice]);
		const rerenderId = useRef(generateRandomID(20));
		const unsubscribes = useRef<Record<string, () => void>>({});
		useEffect(() => {
			r(Object.assign({}, store[slice]));
			return () => {
				Object.values(unsubscribes.current).forEach((unsubscribe) => {
					unsubscribe();
				});
			};
		}, []);
		return useCallback(() => {
			// const sliceDetecter = (key: keyof RootState[Slice]) => {
			// 	return slice.filter((slice) =>
			// 		getObjectKeys(store[slice]).some((sliceKey) => sliceKey === key)
			// 	);
			// };
			const setEstate = (payload: Payload<RootState, Slice>) => {
				// const detectedSlices = getObjectKeys(payload).reduce((acc, key) => {
				// 	const detected = sliceDetecter(key);
				// 	if (detected.length > 1)
				// 		console.warn(
				// 			"Multiple slices have the same key, which may lead to unintended changes when modifying multiple slices."
				// 		);
				// 	detected.forEach((slice) => {
				// 		acc[slice][key] = payload[key];
				// 	});
				// 	return acc;
				// }, {} as Record<Slice, Payload<RootState, Slice>>);
				// getObjectKeys(detectedSlices).forEach((slice) => {
				// 	set[slice](detectedSlices[slice]);
				// });
				set[slice](payload);
				return setEstates;
			};
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

			return { ...new Proxy(state, handler), setEstate, setEstates };
		}, [slice, state])();
	};

	return { useEstate, clearEstate, setEstates };
};
