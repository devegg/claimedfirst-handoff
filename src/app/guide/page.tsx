import { GUIDE, GUIDE_IDS } from "@/lib/guide";

export const metadata = { title: "Guide" };

export default function GuidePage() {
  return (
    <main className="narrow">
      <h1>Guide</h1>
      <p>How ClaimedFirst works: you back artists early, earn a permanent claim number, and the order you arrived is part of your history.</p>
      {GUIDE_IDS.map((id) => (
        <section key={id} id={id} className="panel">
          <h2 className="flush-top">{GUIDE[id].title}</h2>
          <p><strong>{GUIDE[id].short}</strong></p>
          <p>{GUIDE[id].body}</p>
          {id === "roster" && <p><a href="#referral-ladder">See the slot ladder</a></p>}
        </section>
      ))}
    </main>
  );
}
