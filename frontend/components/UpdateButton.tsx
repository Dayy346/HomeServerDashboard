"use client";

import { useState, type FormEvent } from "react";
import { apiPost } from "../lib/api";
import type { UpdateResult } from "../lib/types";


export function UpdateButton() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<UpdateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const data = await apiPost<UpdateResult>("/api/updates", { password });
      setResult(data);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPassword("");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="panel">
      <h2>OS updates</h2>
      <p className="muted">
        Runs allowlisted <code>apt-get update &amp;&amp; apt-get upgrade -y</code> via
        sudo. Password is sent once and never stored.
      </p>
      <button type="button" onClick={() => setOpen(true)}>
        Run updates
      </button>

      {open ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true">
            <h3>Confirm OS update</h3>
            <form onSubmit={onSubmit}>
              <label>
                Sudo password
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={running}
                  required
                />
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setPassword("");
                  }}
                  disabled={running}
                >
                  Cancel
                </button>
                <button type="submit" disabled={running || !password}>
                  {running ? "Running…" : "Update now"}
                </button>
              </div>
            </form>
            {error ? <p className="error">{error}</p> : null}
            {result ? (
              <pre className="output">
                {`ok=${result.ok} exit=${result.exitCode} timedOut=${result.timedOut}\n`}
                {result.stdout}
                {result.stderr ? `\n[stderr]\n${result.stderr}` : ""}
              </pre>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
