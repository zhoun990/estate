export const getObjectKeys = <T extends Record<any, any>>(
	obj: T
): Array<keyof T> => (obj ? Object.keys(obj) : []);
export function isCallable(fn: any): fn is Function {
	return typeof fn === "function";
}
export const isFunction = (f: unknown): f is Function =>
	typeof f === "function";
export const isKey = <T extends Object>(
	target: T,
	prop: any
): prop is keyof T => prop in target;
