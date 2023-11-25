import { useEstate } from "@/utils/estate";
import { memo, useRef } from "react";

export const ChildComponentB = memo(() => {
	const count = useRef(0);
	count.current++;

	const { test } = useEstate("main");
	const { text, setEstate } = useEstate("persist");

	return (
		<div className="border">
			---Child B---
			<div>render count:{count.current}</div>
			<div>persist text:{text}</div>
			<button
				className="border m-2 p-2"
				onClick={() => {
					setEstate({ text: (current) => current + "a" })
				}}
			>
				add
			</button>
			<button
				className="border m-2 p-2"
				onClick={() => {
					setEstate({ text: "" });
				}}
			>
				clear
			</button>
		</div>
	);
});
