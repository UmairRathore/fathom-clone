"use client";
import { useEffect } from "react";
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) { useEffect(() => { console.error(error); }, [error]); return <main className="error-page"><h1>Something interrupted this meeting.</h1><p>Your saved demo changes are still in this browser.</p><button className="primary-button" onClick={reset}>Try again</button></main>; }
