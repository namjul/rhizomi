"use client";

import { useState, useEffect } from "react";

export function Counter() {
  let [count, setCount] = useState(0);

  console.log("hier");

  useEffect(() => {
    setTimeout(() => {
      setCount(10)
    }, 1000)
  })

  return (
    <button onClick={() => setCount(count + 1)}>Count: {count}</button>
  );
}
