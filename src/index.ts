"use client";
if (!structuredClone) {
	globalThis.structuredClone = (value) => JSON.parse(JSON.stringify(value));
}
export { createEstate } from "./functions/createEstate";
export { type Options as EstateOptions } from "./types";
