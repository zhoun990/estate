import { Reducer, Options } from "../types";
import { getObjectKeys, isPromise } from "./utils";
import { createActionBuilders } from "./createActionBuilders";
import { createHook } from "./createHook";
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
	let rootState = structuredClone(initialRootState);
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

		const items = {} as RootState[keyof RootState];
		if (getItem && typeof getItem === "function") {
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

		if (setItem && typeof setItem === "function") {
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
			Object.entries(state._rerenders || {}).forEach(
				([rerenderId, rerender], i) => {
					if (rerender(key, rootState)) {
						delete state._rerenders![rerenderId];
					}
				}
			);
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
			initialRootState,
			setup: () => {
				if (!options?.persist) return;
				for (const slice of options.persist) {
					if (Object.prototype.hasOwnProperty.call(initialRootState, slice)) {
						getStorageItems(slice).then((state) => {
							reducer((actions) => actions[slice](state));
						});
					}
				}
			},
		}),
		clearEstate,
	};
};