import { useEffect, useRef, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { setEstates, useEstate } from "./estate";

function App() {
  const { count1, count2, setEstate } = useEstate("persist");
  useEffect(() => {
    console.log("count1", count1);
  }, [count1]);
  useEffect(() => {
    console.log("count2", count2);
  }, [count2]);
  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button
          onClick={() => {
            setEstate({ count1: (count) => count + 1 });
          }}
        >
          count1 is {count1}
        </button>
        <button
          style={{ marginTop: "10px" }}
          onClick={() => {
            setEstates.persist({ count2: (count2) => count2 + 1 });
          }}
        >
          count2 is {count2}
        </button>
      </div>
    </>
  );
}

export default App;
