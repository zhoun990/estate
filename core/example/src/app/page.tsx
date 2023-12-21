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
    setText(store["main"]["test"]);
    subscribe("main", "test", "lsn", ({ newValue }) => {
      setText(newValue);
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
