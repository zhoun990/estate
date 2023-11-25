"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { set, store, subscribe } from "./utils/estate";
export default function Home() {
	const count = useRef(0);
	const [text, setText] = useState("");
	count.current++;
	// const { session } = useEstate("main");
	useEffect(() => {
		subscribe("main", "test", ({ newValue }) => {
			setText(newValue);
			console.log("^_^ Log \n file: page.tsx:13 \n newValue:", newValue);
		});
	}, []);

	return (
		<div>
			{/* <div>render count:{count.current}</div> */}
			<div>{text}</div>
			<button
				onClick={() => {
					set.main({
						test: (x) => {
							return x + "a";
						},
					});
				}}
			>
				Add
			</button>
			<button
				onClick={() => {
					set.main({
						test: "",
					});
				}}
			>
				Clear
			</button>
		</div>
	);
}
