import rfdc from "rfdc";
import { RootStateType, Options, ListenerCallback } from "../types";
import { setter } from "./createUpdater";
import { settings, GlobalStore } from "./GlobalStore";

export const getObjectKeys = <T extends Record<any, any>>(
	obj: T
): Array<keyof T> => (obj ? Object.keys(obj) : []);
export const isCallable = (fn: any): fn is Function => {
	return typeof fn === "function";
};
export const isFunction = (f: unknown): f is Function =>
	typeof f === "function";
export const isKey = <T extends Object>(
	target: T,
	prop: any
): prop is keyof T => prop in target;
export const isPromise = (obj: any): obj is Promise<unknown> => {
	return obj instanceof Promise;
};
export function generateRandomID(length: number) {
	const characters =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let randomID = "";

	for (let i = 0; i < length; i++) {
		const randomIndex = Math.floor(Math.random() * characters.length);
		randomID += characters.charAt(randomIndex);
	}

	return randomID;
}
export const clone: <T = any>(
	value: T,
	options?: StructuredSerializeOptions | undefined
) => T = typeof structuredClone !== "undefined" ? structuredClone : rfdc();
// for JSON#stringify
export function replacer(key: string, value: any) {
	if (value instanceof Map) {
		return {
			dataType: "Map",
			value: Array.from(value.entries()), // or with spread: value: [...value]
		};
	} else if (value instanceof Set) {
		return {
			dataType: "Set",
			value: Array.from(value),
		};
	} else {
		return value;
	}
}

// for JSON#parse
export function reviver(key: string, value: any) {
	if (typeof value === "object" && value !== null) {
		if (value.dataType === "Map") {
			return new Map(value.value);
		} else if (value.dataType === "Set") {
			return new Set(value.value);
		}
	}
	return value;
}
