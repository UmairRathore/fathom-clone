import Link from "next/link";
export default function UnavailableShare(){return <main className="error-page"><h1>This recording is restricted or unavailable.</h1><p>The link may be invalid, expired, or limited to its owner. Ask the owner for a new guest link.</p><Link className="primary-button" href="/home">Explore the fictional demo workspace</Link></main>;}
