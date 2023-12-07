import { Middleware, Middlewares, NotFullSlice, RootStateType } from "../types";
import { generateRandomID, getObjectKeys, isFunction } from "./utils";
type ListenerCallback = <
	Store extends RootStateType,
	Slice extends keyof Store,
	Key extends keyof Store[Slice]
>(args: {
	slice: Slice;
	key: Key;
	listenerId: string;
	newValue: Store[Slice][Key];
	oldValue: Store[Slice][Key];
}) => void;
export class GlobalStore<Store extends RootStateType> {
	private static instance: GlobalStore<any>;
	public store: Store = {} as Store;
	public initialState: Store = {} as Store;
	private middlewares: {
		[slice in keyof Store]?: {
			[key in keyof Store[slice]]?: Middleware<Store, slice, key>;
		};
	} = {};
	private listeners: Record<string, ListenerCallback> = {};
	private waitingUpdate: Promise<any>[] = [];
	private constructor(initialState: Store) {
		if (GlobalStore.instance) {
			return GlobalStore.instance;
		}
		this.initialState = initialState;
		this.store = initialState;
		GlobalStore.instance = this;
	}
	public static getInstance<RootState extends RootStateType>(
		initialState?: RootState
	): GlobalStore<RootState> {
		if (!GlobalStore.instance && initialState) {
			GlobalStore.instance = new GlobalStore(initialState);
		}
		return GlobalStore.instance;
	}
	public getSlice(slice: keyof Store) {
		return this.store[slice];
	}
	public getValue(slice: keyof Store, key: keyof Store[typeof slice]) {
		return this.store[slice]?.[key];
	}
	public setSlice(
		slice: keyof Store,
		newSlice: NotFullSlice<Store, typeof slice>
	) {
		getObjectKeys(newSlice).forEach((k) => {
			const v = newSlice[k];
			if (v) this.setValue(slice, k, v);
		});
		return this;
	}
	private async waitingUpdater() {
		await this.waitingUpdate?.shift()?.finally(this.waitingUpdater);
	}
	public setMiddlewares(middlewares: Middlewares<Store>) {
		getObjectKeys(middlewares).forEach((slice) => {
			const ms = middlewares[slice];
			if (ms)
				getObjectKeys(ms).forEach((key) => {
					const mk = ms[key];
					if (mk) {
						this.setMiddleware(slice, key, mk);
					}
				});
		});
	}
	public setMiddleware(
		slice: keyof Store,
		key: keyof Store[typeof slice],
		fn: Middleware<Store, typeof slice, typeof key>
	) {
		const ms = this.middlewares[slice];
		if (!ms) {
			this.middlewares[slice] = {};
			const ms = this.middlewares[slice];
			if (ms) ms[key] = fn;
		}
		if (ms) ms[key] = fn;
	}
	public middleware(
		slice: keyof Store,
		key: keyof Store[typeof slice],
		value: Store[keyof Store][keyof Store[keyof Store]]
	) {
		const fn = this.middlewares[slice]?.[key];
		const exists = Object.keys(this.middlewares[slice] || {}).includes(
			String(key)
		);
		if (!exists) return value;
		if (isFunction(fn))
			return fn({
				value,
				slice,
				key,
				reducer: this,
			});
		return fn;
	}
	public setValue(
		slice: keyof Store,
		key: keyof Store[typeof slice],
		newValue:
			| Store[typeof slice][typeof key]
			| Promise<Store[typeof slice][typeof key]>
	) {
		if (!this.store[slice]) this.store[slice] = {} as Store[keyof Store];
		const oldValue = this.store[slice][key];
		if (newValue instanceof Promise) {
			const updateValue = (value: Store[typeof slice][typeof key]) => {
				this.store[slice][key] = this.middleware(slice, key, value);
				this.getListeners(slice, key).forEach((callback) =>
					callback({
						newValue: this.store[slice][key],
						oldValue,
						slice: slice,
						key: key,
						listenerId: "",
					})
				);
			};
			if (this.waitingUpdate.length === 0) {
				newValue.then(updateValue).finally(this.waitingUpdater);
			} else {
				this.waitingUpdate.push(
					new Promise((resolve) => {
						newValue.then(updateValue).finally(() => resolve(true));
					})
				);
			}
		} else {
			const updateValue = () => {
				this.store[slice][key] = this.middleware(slice, key, newValue);
				this.getListeners(slice, key).forEach((callback) =>
					callback({
						newValue: this.store[slice][key],
						oldValue,
						slice: slice,
						key: key,
						listenerId: "",
					})
				);
			};
			if (this.waitingUpdate.length === 0) {
				updateValue();
			} else {
				this.waitingUpdate.push(new Promise(updateValue));
			}
		}

		return this;
	}
	public subscribeSlice(
		slice: keyof Store,
		listenerId: string | undefined,
		callback: ListenerCallback,
		once = false
	) {
		getObjectKeys(this.store[slice]).forEach((key) => {
			this.subscribe(slice, key, listenerId, callback, once);
		});
	}
	public subscribe<Slice extends keyof Store, Key extends keyof Store[Slice]>(
		slice: Slice,
		key: Key,
		listenerId: string | undefined,
		callback: ListenerCallback,
		once = false
	) {
		const path = [slice, key, listenerId || generateRandomID(20)];
		this.setLister(path.join("###"), (args) => {
			callback(args);
			if (once) {
				this.unsubscribe(path.join("###"));
			}
		});
		return () => this.unsubscribe(path.join("###"));
	}
	public unsubscribe(id: string) {
		delete this.listeners[id];
	}
	private getListeners(slice: keyof Store, key: keyof Store[keyof Store]) {
		return Object.keys(this.listeners)
			.filter((id) => {
				const path = id.split("###");
				return path[0] === slice && path[1] === key;
			})
			.map((id) => this.listeners[id]);
	}
	private setLister(id: string, callback: ListenerCallback) {
		this.listeners[id] = callback;
	}
}
