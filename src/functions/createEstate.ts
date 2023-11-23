import { Reducer, Options } from "../types";
import { getObjectKeys, isPromise } from "./utils";
import { createActionBuilders } from "./createActionBuilders";
import { createHook } from "./createHook";
import { clone } from "./clone";
//[ToDo] createEstateの返り値にフックを追加し、setEstateで特定のキーに変更があった場合、変更された値を受け取り、最終的な値を返すMiddleware的な関数を設定できるようにする。
//[ToDo] useEstateの引数を配列かStringに変更し、配列の場合は複数のスライスを参照するようにする。
/**
 *
 * @param initialRootState - Key value pair of StateLabel and state
 * @param options.persist - List of StateLabel for persistence
 * @param options.storage - Storage to be used for persistence. When not specified, localStorage will be used (web only). sync/async
 * @returns useEstate, clearEstate
 */
export const createEstate = <RootState extends Record<any, Record<any, any>>>(
	initialRootState: RootState,
	options?: Options<RootState>
) => {
	let rootState = clone(initialRootState);
	if (
		typeof window !== "undefined" &&
		options?.persist?.length &&
		!options.storage
	) {
		options.storage = localStorage;
	}

	const getStorageItems = async (
		slice: keyof RootState
	): Promise<RootState[keyof RootState]> => {
		const getItem = (k: Extract<keyof RootState[keyof RootState], string>) =>
			options?.storage?.getItem(k);

		const items = rootState[slice];
		if (typeof options?.storage?.getItem) {
			for (const key in initialRootState[slice]) {
				const item = JSON.parse((await getItem(key)) || "null");

				if (item) {
					items[key] = item;
				}
			}
		}
		return items;
	};
	const setStorageItems = <State extends Record<any, any>>(
		slice: keyof RootState,
		state: State
	) => {
		const setItem = (
			k: Extract<keyof RootState[keyof RootState], string>,
			v: string
		) => options?.storage?.setItem(k, v);

		if (options?.storage?.setItem) {
			for (const key in initialRootState[slice]) {
				if (
					Object.prototype.hasOwnProperty.call(initialRootState[slice], key) &&
					Object.prototype.hasOwnProperty.call(state, key)
				) {
					setItem(key, JSON.stringify(state[key]));
				}
			}
		}
	};
	const { actions } = createActionBuilders(
		rootState,
		({ key, prevuesState, newState, slice }) => {
			const state = newState[slice];
			Object.entries(state._rerenders || {})
				.flatMap(([rerenderId, rerenders], i) => {
					return rerenders.map((rerender) => ({ rerenderId, rerender }));
				})
				.forEach(({ rerenderId, rerender }, i) => {
					if (rerender(key, rootState)) {
						delete state._rerenders![rerenderId];
					}
				});
			if (options?.persist && options.persist.includes(slice)) {
				setStorageItems(slice, {
					[key]: newState[slice][key],
				});
			}
		}
	);
	const reducer: Reducer<RootState> = (action) => {
		const s = action(actions)(rootState);
		if (s) {
			rootState = s;
		}
	};
	const clearEstate = <T extends keyof RootState>(slice?: T) => {
		if (slice) {
			reducer((actions) => actions[slice](initialRootState[slice]));
		} else {
			getObjectKeys(initialRootState).forEach((slice) => {
				reducer((actions) => actions[slice](initialRootState[slice]));
			});
		}
	};

	return {
		useEstate: createHook({
			reducer,
			getRootState: () =>  rootState,
			setup: () => {
				if (!options?.persist) return;
				for (const slice of options.persist) {
					if (Object.prototype.hasOwnProperty.call(initialRootState, slice)) {
						getStorageItems(slice).then((state) => {
							if (state) reducer((actions) => actions[slice](state));
						});
					}
				}
			},
		}),
		clearEstate,
	};
};
