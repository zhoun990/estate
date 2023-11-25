import { GlobalStore } from "./functions/GlobalStore";

export type RootStateType = Record<any, Record<any, any>>;
export type Middleware<RootState extends RootStateType> =
	| RootState[keyof RootState][keyof RootState[keyof RootState]]
	| ((args: {
			value: RootState[keyof RootState][keyof RootState[keyof RootState]];
			slice: keyof RootState;
			key: keyof RootState[keyof RootState];
			globalStore: GlobalStore<RootState>;
	  }) => RootState[keyof RootState][keyof RootState[keyof RootState]]);
export type Options<RootState extends RootStateType> = {
	persist?: (keyof RootState)[];
	storage?: {
		getItem(key: any): Promise<any> | any;
		setItem(key: any, value: any): Promise<void> | void;
	};
	middleware?: {
		[slice in keyof RootState]?: {
			[key in keyof RootState[slice]]?: Middleware<RootState>;
		};
	};
};
export type Payload<
	RootState extends RootStateType,
	Slice extends keyof RootState
> = {
	[key in keyof RootState[Slice]]?:
		| RootState[Slice][key]
		| ((value: RootState[Slice][key]) => RootState[Slice][key]);
};
