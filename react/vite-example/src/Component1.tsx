import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { setEstates, useEstate } from "./estate";

function App() {
  const { count, count2 } = useEstate("persist");
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
            setEstates.persist({ count: (count) => count + 1 });
          }}
        >
          count is {count()}
        </button>
        <button
          style={{ marginTop: "10px" }}
          onClick={() => {
            setEstates.persist({ count2: (count2) => count2 + 1 });
          }}
        >
          count2 is {count2()}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
