"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Withdrawal = {
  id: string;
  display_name: string | null;
  email: string | null;
  amount_minor: string | number;
  fee_minor: string | number;
  net_amount_minor: string | number;
  currency: string;
  method: string;
  status: string;
  destination: {
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
  };
  requested_at: string;
};

function naira(minor: string | number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(Number(minor) / 100);
}

function maskAccount(value?: string) {
  if (!value) return "Not provided";
  return value.length >= 4 ? `••••••${value.slice(-4)}` : "••••";
}

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/withdrawals", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Unable to load withdrawal queue.");
        return;
      }

      setWithdrawals(data.withdrawals ?? []);
    } catch {
      setError("Unable to load withdrawal queue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function updateWithdrawal(id: string, action: "approve" | "cancel") {
    setBusyId(id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/admin/withdrawals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Unable to update withdrawal.");
        return;
      }

      setNotice(data.message ?? "Withdrawal updated.");
      await load();
    } catch {
      setError("Unable to update withdrawal.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <div>
          <Link href="/" className="admin-brand">TaskCash</Link>
          <span> / Withdrawal Review</span>
        </div>
        <button className="admin-refresh" onClick={() => void load()} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <section className="admin-hero">
        <p className="eyebrow">OPERATIONS</p>
        <h1>Withdrawal review.</h1>
        <p>Review cash-out requests before they reach a payout provider.</p>
      </section>

      {error && <div className="admin-alert admin-error">{error}</div>}
      {notice && <div className="admin-alert admin-success">{notice}</div>}

      <section className="admin-queue">
        <div className="admin-queue-head">
          <div>
            <span>QUEUE</span>
            <h2>{withdrawals.length} request{withdrawals.length === 1 ? "" : "s"}</h2>
          </div>
          <small>Pending, review and processing</small>
        </div>

        {loading ? (
          <div className="admin-empty">Loading withdrawal queue...</div>
        ) : withdrawals.length === 0 ? (
          <div className="admin-empty">
            <strong>No withdrawals waiting for review.</strong>
            <p>New requests will appear here.</p>
          </div>
        ) : (
          <div className="admin-list">
            {withdrawals.map((withdrawal) => {
              const destination = withdrawal.destination ?? {};
              const busy = busyId === withdrawal.id;

              return (
                <article className="admin-withdrawal" key={withdrawal.id}>
                  <div className="admin-withdrawal-main">
                    <div className="admin-withdrawal-head">
                      <div>
                        <strong>{naira(withdrawal.amount_minor)}</strong>
                        <span>{withdrawal.status}</span>
                      </div>
                      <time dateTime={withdrawal.requested_at}>
                        {new Date(withdrawal.requested_at).toLocaleString("en-NG")}
                      </time>
                    </div>

                    <div className="admin-details">
                      <div><small>USER</small><b>{withdrawal.display_name || "Unnamed"}</b><span>{withdrawal.email || "No email"}</span></div>
                      <div><small>BANK</small><b>{destination.bankName || "Not provided"}</b><span>{destination.accountName || "No account name"}</span></div>
                      <div><small>ACCOUNT</small><b>{maskAccount(destination.accountNumber)}</b><span>{withdrawal.method}</span></div>
                    </div>
                  </div>

                  <div className="admin-actions">
                    {withdrawal.status === "pending" && (
                      <>
                        <button
                          className="admin-cancel"
                          disabled={busy}
                          onClick={() => void updateWithdrawal(withdrawal.id, "cancel")}
                        >
                          {busy ? "Working..." : "Cancel"}
                        </button>
                        <button
                          className="admin-approve"
                          disabled={busy}
                          onClick={() => void updateWithdrawal(withdrawal.id, "approve")}
                        >
                          {busy ? "Working..." : "Approve"}
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
