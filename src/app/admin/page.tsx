"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { matches, groupByDate, formatDate } from "@/data/fixture";

type MatchResult = { matchId: string; homeScore: number; awayScore: number };

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [results, setResults] = useState<MatchResult[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, { home: number; away: number }>>({});

  const adminEmail = session?.user?.email;
  const isAdmin = adminEmail === process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  useEffect(() => {
    if (status === "unauthenticated") { router.replace("/login"); return; }
    fetch("/api/admin/matches")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setResults(data);
          const init: Record<string, { home: number; away: number }> = {};
          data.forEach((r: MatchResult) => { init[r.matchId] = { home: r.homeScore, away: r.awayScore }; });
          setScores(init);
        } else {
          router.replace("/dashboard");
        }
      });
  }, [status, router]);

  async function saveResult(matchId: string) {
    const score = scores[matchId] ?? { home: 0, away: 0 };
    setSaving(matchId);
    await fetch("/api/admin/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, homeScore: score.home, awayScore: score.away }),
    });
    setSaving(null);
    setResults((prev) => {
      const idx = prev.findIndex((r) => r.matchId === matchId);
      const updated = { matchId, homeScore: score.home, awayScore: score.away };
      if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next; }
      return [...prev, updated];
    });
  }

  const upcoming = matches.filter((m) => m.status === "upcoming" || m.status === "live");
  const byDate = groupByDate(upcoming);
  const dates = Object.keys(byDate).sort();

  if (status === "loading") return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f3f4f6" }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-5 h-16 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "#FFCA61" }}>Mundo Shop</p>
          <h1 className="text-base font-bold" style={{ color: "#00217E" }}>Panel de Admin</h1>
        </div>
        <button onClick={() => router.push("/dashboard")} className="text-sm font-semibold" style={{ color: "#00217E" }}>
          Volver al dashboard
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <p className="text-xs text-gray-400 px-1">Cargá el resultado de cada partido para que se calculen los puntos automáticamente.</p>

        {dates.map((date) => (
          <div key={date}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">{formatDate(date)}</p>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {byDate[date].map((match, idx) => {
                const existing = results.find((r) => r.matchId === match.id);
                const score = scores[match.id] ?? { home: existing?.homeScore ?? 0, away: existing?.awayScore ?? 0 };
                const isSaving = saving === match.id;

                return (
                  <div key={match.id}>
                    {idx > 0 && <div className="h-px bg-gray-100 mx-4" />}
                    <div className="px-4 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-gray-400">Grupo {match.group} — {match.time}</span>
                        {existing && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}>
                            Cargado
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Home */}
                        <div className="flex items-center gap-2 flex-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={match.home.shield} alt={match.home.name} className="w-8 h-8 object-contain" />
                          <span className="text-sm font-bold text-gray-700 truncate">{match.home.shortName}</span>
                        </div>

                        {/* Score inputs */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <input
                            type="number"
                            min={0}
                            max={20}
                            value={score.home}
                            onChange={(e) => setScores((prev) => ({ ...prev, [match.id]: { ...score, home: Math.max(0, parseInt(e.target.value) || 0) } }))}
                            className="w-12 h-12 text-center text-xl font-black border-2 rounded-xl focus:outline-none"
                            style={{ borderColor: "#00217E", color: "#00217E" }}
                          />
                          <span className="text-gray-300 font-bold">—</span>
                          <input
                            type="number"
                            min={0}
                            max={20}
                            value={score.away}
                            onChange={(e) => setScores((prev) => ({ ...prev, [match.id]: { ...score, away: Math.max(0, parseInt(e.target.value) || 0) } }))}
                            className="w-12 h-12 text-center text-xl font-black border-2 rounded-xl focus:outline-none"
                            style={{ borderColor: "#00217E", color: "#00217E" }}
                          />
                        </div>

                        {/* Away */}
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <span className="text-sm font-bold text-gray-700 truncate">{match.away.shortName}</span>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={match.away.shield} alt={match.away.name} className="w-8 h-8 object-contain" />
                        </div>
                      </div>

                      <button
                        onClick={() => saveResult(match.id)}
                        disabled={isSaving}
                        className="w-full mt-3 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity"
                        style={{ backgroundColor: "#00217E", opacity: isSaving ? 0.6 : 1 }}
                      >
                        {isSaving ? "Guardando..." : existing ? "Actualizar resultado" : "Guardar resultado"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
