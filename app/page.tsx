const stats = [
  { label: "Live tasks", value: "Coming soon" },
  { label: "Your balance", value: "₦0.00" },
  { label: "Available to withdraw", value: "₦0.00" },
];

export default function Home() {
  return <main className="shell">
    <header className="topbar"><strong>TaskCash</strong><span>Nigeria-first rewards platform</span></header>
    <section className="hero">
      <p className="eyebrow">EARN • UNLOCK • WITHDRAW</p>
      <h1>Complete verified tasks.<br />Earn cash.</h1>
      <p className="lede">Take eligible surveys, offers and sponsored tasks. Build your balance, then use it for withdrawals or unlock useful digital content.</p>
      <div className="actions"><button>View daily tasks</button><button className="secondary">How it works</button></div>
    </section>
    <section className="stats">{stats.map((s)=><article key={s.label}><span>{s.label}</span><strong>{s.value}</strong></article>)}</section>
    <section className="panel"><div><p className="eyebrow">TASK ENGINE</p><h2>Your daily task wall</h2><p>Real offers will appear here once a provider is connected and approved for Nigerian traffic. No fake inventory, no made-up earnings.</p></div><div className="empty">Provider connection pending</div></section>
  </main>;
}