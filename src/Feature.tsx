import { useEffect, useState } from "react";
import { useEventLog, useNamedPeer, type MeshConfig, type YRoom } from "@baditaflorin/mesh-common";

type Props = { room: YRoom | null; config: MeshConfig };

type Thought = { id: string; peerId: string; text: string; ts: number };
type Vote = "up" | "down";

export function Feature({ room, config }: Props) {
  if (!room) {
    return (
      <div className="shower-screen">
        <h1>shower thoughts</h1>
        <p className="shower-status">Connecting…</p>
      </div>
    );
  }
  return <Body room={room} config={config} />;
}

function Body({ room, config }: { room: YRoom; config: MeshConfig }) {
  const { name, setName, nameOf } = useNamedPeer(config, room);
  const log = useEventLog<Thought>(room, "thoughts");
  const [draft, setDraft] = useState("");
  const [, rerender] = useState(0);

  useEffect(() => {
    const m = room.doc.getMap<Vote>("thought-votes");
    const cb = () => rerender((n) => n + 1);
    m.observe(cb);
    return () => m.unobserve(cb);
  }, [room]);

  const votes = room.doc.getMap<Vote>("thought-votes");
  const trimmedName = name.trim();
  const trimmedDraft = draft.trim();
  const canSubmit = trimmedName.length > 0 && trimmedDraft.length > 0;

  const submit = () => {
    if (!canSubmit) return;
    log.push({
      id: Math.random().toString(36).slice(2, 12),
      peerId: room.peerId,
      text: trimmedDraft.slice(0, 160),
      ts: Date.now(),
    });
    setDraft("");
  };

  const scoreOf = (thoughtId: string) => {
    let s = 0;
    votes.forEach((v, k) => {
      if (k.endsWith(`|${thoughtId}`)) s += v === "up" ? 1 : -1;
    });
    return s;
  };

  const cast = (thoughtId: string, dir: Vote) => {
    const key = `${room.peerId}|${thoughtId}`;
    const cur = votes.get(key);
    if (cur === dir) votes.delete(key);
    else votes.set(key, dir);
  };

  const sorted = [...log.events].sort((a, b) => {
    const ds = scoreOf(b.id) - scoreOf(a.id);
    return ds !== 0 ? ds : a.ts - b.ts;
  });

  return (
    <div className="shower-screen">
      <header className="shower-header">
        <h1>shower thoughts</h1>
        <p className="shower-status">drop one, vote on the rest</p>
      </header>

      <div className="shower-name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="your name"
          maxLength={48}
          aria-label="your name"
        />
      </div>

      <div className="shower-compose">
        <textarea
          className="shower-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="a shower thought…"
          maxLength={160}
          rows={2}
        />
        <button type="button" className="shower-submit" onClick={submit} disabled={!canSubmit}>
          drop it
        </button>
      </div>

      <div className="shower-feed">
        {sorted.map((t) => {
          const score = scoreOf(t.id);
          const mine = t.peerId === room.peerId;
          const myVote = votes.get(`${room.peerId}|${t.id}`);
          return (
            <div key={t.id} className="shower-thought" data-thought-id={t.id}>
              <div className="shower-text">{t.text}</div>
              <div className="shower-meta">
                <span className="shower-author">{nameOf(t.peerId) ?? "peer"}</span>
                <span className="shower-score">{score}</span>
                <button
                  type="button"
                  className={`shower-up${myVote === "up" ? " on" : ""}`}
                  data-thought-id={t.id}
                  onClick={() => cast(t.id, "up")}
                  disabled={mine}
                  aria-label="upvote"
                >
                  ▲
                </button>
                <button
                  type="button"
                  className={`shower-down${myVote === "down" ? " on" : ""}`}
                  data-thought-id={t.id}
                  onClick={() => cast(t.id, "down")}
                  disabled={mine}
                  aria-label="downvote"
                >
                  ▼
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <footer className="shower-footer">{log.size} thoughts</footer>
    </div>
  );
}
