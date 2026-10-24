import Link from "next/link";
export default function NotFound() { return <main className="error-page"><h1>We couldn’t find that recording.</h1><p>The link may be incorrect or the meeting is no longer available.</p><Link className="primary-button" href="/home">Back to My Calls</Link></main>; }
