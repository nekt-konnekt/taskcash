"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Task = {
  id: string;
  title: string;
  description: string | null;
  task_type: string;
  user_reward_minor: string | number;
  currency: string;
};

type Wallet = {
  currency: string;
  available_minor: string | number;
  pending_minor: string | number;
  lifetime_earned_minor: string | number;
  lifetime_withdrawn_minor: string | number;
};

function naira(minor: string | number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(Number(minor) / 100);
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyTask, setBusyTask] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    setNotice("");

    try {
      const [tasksResponse, meResponse] = await Promise.all([
        fetch("/api/tasks", { cache: "no-store" }),
        fetch("/api/me", { cache: "no-store" }),
      ]);

      const tasksData = await tasksResponse.json();
      setTasks(tasksData.tasks ?? []);

      if (meResponse.ok) {
        setAuthenticated(true);
        const walletResponse = await fetch("/api/wallet", { cache: "no-store" });
        if (walletResponse.ok) {
          const walletData = await walletResponse.json();
          setWallet(walletData.wallet);
        }
      } else {
        setAuthenticated(false);
        setWallet(null);
      }
    } catch {
      setNotice("We couldn't load your TaskCash dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function completeTask(taskId: string) {
    setBusyTask(taskId);
    setNotice("");

    try {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
      });
      const data = await response.json();

      if (response.status === 401) {
        window.location.href = "/auth";
        return;
      }

      if (!response.ok) {
        setNotice(data.error ?? "Task could not be completed.");
        return;
      }

      setNotice(
        data.idempotent
          ? "You've already completed this task. Your reward is safe."
          : `Task complete. ${naira(data.rewardMinor)} has been added to your balance.`,
      );
      await load();
    } catch {
      setNotice("Something went wrong. Try again.");
    } finally {
      setBusyTask(null);
    }
  }

  const available = wallet?.available_minor ?? 0;
  const pending = wallet?.pending_minor ?? 0;
  const earned = wallet?.lifetime_earned_minor ?? 0;
  const progress = Math.min(100, (Number(earned) / 50000) * 100);
  const taskCount = tasks.length;

  const taskLabel = useMemo(() => {
    if (loading) return "Loading";
    if (!taskCount) return "No tasks";
    return `${taskCount} task${taskCount === 1 ? "" : "s"} available`;
  }, [loading, taskCount]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/">TaskCash</Link>
        <div className="top-actions">
          <span className="country">NG</span>
          {authenticated ? (
            <span className="signed-in">Account ready</span>
          ) : (
            <Link className="sign-in" href="/auth">Sign in</Link>
          )}
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">EARN • UNLOCK • WITHDRAW</p>
          <h1>Turn spare minutes into cash.</h1>
          <p className="lede">
            Complete verified tasks, surveys and sponsored activities. Build your balance and withdraw when you qualify.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#tasks">See tasks</a>
            {!authenticated && <Link className="secondary-button" href="/auth">Create free account</Link>}
          </div>
        </div>

        <div className="hero-card">
          <span>AVAILABLE NOW</span>
          <strong>{naira(available)}</strong>
          <small>Available to withdraw</small>
          <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
          <div className="progress-row"><span>Today's goal</span><b>₦500</b></div>
        </div>
      </section>

      <section className="stats-grid" aria-label="Wallet summary">
        <article><span>Available</span><strong>{naira(available)}</strong></article>
        <article><span>Pending</span><strong>{naira(pending)}</strong></article>
        <article><span>Lifetime earned</span><strong>{naira(earned)}</strong></article>
      </section>

      {notice && <div className="notice" role="status">{notice}</div>}

      <section className="task-section" id="tasks">
        <div className="section-heading">
          <div>
            <p className="eyebrow">EARN TODAY</p>
            <h2>Tasks you can actually do</h2>
          </div>
          <span className="task-count">{taskLabel}</span>
        </div>

        {loading ? (
          <div className="loading-card">Loading today's tasks...</div>
        ) : tasks.length ? (
          <div className="task-list">
            {tasks.map((task) => (
              <article className="task-card" key={task.id}>
                <div className="task-icon">₦</div>
                <div className="task-body">
                  <div className="task-meta">
                    <span>{task.task_type.replaceAll("_", " ")}</span>
                    <span>Verified reward</span>
                  </div>
                  <h3>{task.title}</h3>
                  <p>{task.description}</p>
                  <div className="task-footer">
                    <strong>{naira(task.user_reward_minor)}</strong>
                    <button
                      className="task-button"
                      disabled={busyTask === task.id}
                      onClick={() => void completeTask(task.id)}
                    >
                      {busyTask === task.id ? "Processing..." : authenticated ? "Complete task" : "Sign in to earn"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-card">
            <strong>No tasks available right now.</strong>
            <p>New earning opportunities will appear here as providers come online.</p>
          </div>
        )}
      </section>

      <section className="how-section">
        <div>
          <p className="eyebrow">HOW IT WORKS</p>
          <h2>Simple enough to trust.</h2>
        </div>
        <div className="steps">
          <article><b>01</b><h3>Pick a task</h3><p>Choose an eligible task and see the reward before you start.</p></article>
          <article><b>02</b><h3>Complete it</h3><p>Finish the activity and let TaskCash verify the result.</p></article>
          <article><b>03</b><h3>Get rewarded</h3><p>Your cleared reward lands in your TaskCash balance.</p></article>
        </div>
      </section>

      <footer>
        <strong>TaskCash</strong>
        <span>Nigeria-first rewards infrastructure.</span>
        {!authenticated && <Link href="/auth">Get started</Link>}
      </footer>
    </main>
  );
}
