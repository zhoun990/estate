import { setEstates, useEstate } from "@/estate";
import { useRef } from "react";

export const ChildComponentA = () => {
	const count = useRef(0);
	count.current++;
	const { session, setEstate } = useEstate("main");
	return (
		<div className="border">
			---Child A---
			<div>render count:{count.current}</div>
			<div>id:{session?.id}</div>
			<div>name:{session?.name}</div>
			{session ? (
				<button
					className="border m-2 p-2"
					onClick={() => {
						setEstate({ session: null });
					}}
				>
					Remove Session
				</button>
			) : (
				<button
					className="border m-2 p-2"
					onClick={() => {
						setEstates.main({
							session: (cv) => {
								return { id: "abc123", name: "Taro Tanaka" };
							},
						});
					}}
				>
					Set User
				</button>
			)}
		</div>
	);
};
