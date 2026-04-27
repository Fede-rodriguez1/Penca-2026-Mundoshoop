"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { matches, groupByDate, formatDate, type Match } from "@/data/fixture";
import { calcPoints } from "@/lib/scoring";

type Prediction = { matchId: string; homeScore: number; awayScore: number };
type RankingEntry = { id: string; name: string; initials: string; points: number; exact: number; correct: number; predictions: number; pos: number };

type Tab = "upcoming" | "finished" | "ranking";
type NavItem = "home" | "matches" | "groups" | "ranking" | "profile";

const GROUP_LETTERS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

type Standing = {
  team: Match["home"];
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  pts: number;
};

function computeStandings(group: string): Standing[] {
  const groupMatches = matches.filter((m) => m.group === group);
  const table: Record<string, Standing> = {};

  // Init all teams
  groupMatches.forEach((m) => {
    if (!table[m.home.name]) table[m.home.name] = { team: m.home, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 };
    if (!table[m.away.name]) table[m.away.name] = { team: m.away, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 };
  });

  // Compute from finished matches only
  groupMatches
    .filter((m) => m.status === "finished" && m.homeScore !== undefined && m.awayScore !== undefined)
    .forEach((m) => {
      const h = table[m.home.name];
      const a = table[m.away.name];
      const hg = m.homeScore!;
      const ag = m.awayScore!;
      h.played++; a.played++;
      h.gf += hg; h.ga += ag;
      a.gf += ag; a.ga += hg;
      if (hg > ag) { h.won++; h.pts += 3; a.lost++; }
      else if (hg < ag) { a.won++; a.pts += 3; h.lost++; }
      else { h.drawn++; h.pts++; a.drawn++; a.pts++; }
    });

  return Object.values(table).sort((a, b) =>
    b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf
  );
}

const sampleRanking = [
  { pos: 1, name: "Lucas G.", pts: 42, initials: "LG" },
  { pos: 2, name: "Sofía M.", pts: 38, initials: "SM" },
  { pos: 3, name: "Pablo D.", pts: 35, initials: "PD" },
  { pos: 4, name: "Camila R.", pts: 31, initials: "CR" },
  { pos: 5, name: "Martín V.", pts: 28, initials: "MV" },
  { pos: 6, name: "Ana L.", pts: 24, initials: "AL" },
  { pos: 7, name: "Diego F.", pts: 21, initials: "DF" },
  { pos: 8, name: "Laura B.", pts: 17, initials: "LB" },
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<Tab>("upcoming");
  const [nav, setNav] = useState<NavItem>("matches");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [viewMatch, setViewMatch] = useState<Match | null>(null);
  const [selectedGroup, setSelectedGroup] = useState("A");

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [profileView, setProfileView] = useState<"main" | "edit" | "history" | "rules" | "terms">("main");
  const [editName, setEditName] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState(false);
  const [userProvider, setUserProvider] = useState<string>("credentials");
  const [avatarColor, setAvatarColor] = useState("#00217E");
  const [editAvatarColor, setEditAvatarColor] = useState("#00217E");

  useEffect(() => {
    fetch("/api/predictions")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setPredictions(data); });
    fetch("/api/ranking")
      .then((r) => { if (!r.ok) return []; return r.json(); })
      .then((data) => { if (Array.isArray(data)) setRanking(data); });
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((data) => {
        if (data?.provider) setUserProvider(data.provider);
        if (data?.name) setEditName(data.name);
        if (data?.avatarColor) { setAvatarColor(data.avatarColor); setEditAvatarColor(data.avatarColor); }
      });
  }, []);

  function onPredictionSaved(p: Prediction) {
    setPredictions((prev) => {
      const idx = prev.findIndex((x) => x.matchId === p.matchId);
      if (idx >= 0) { const next = [...prev]; next[idx] = p; return next; }
      return [...prev, p];
    });
  }

  const userName = session?.user?.name ?? "";
  const userEmail = session?.user?.email ?? "";
  const userInitials = userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const myRank = ranking.find((r) => r.id === session?.user?.id);
  const myPoints = myRank?.points ?? 0;
  const myPos = myRank?.pos ?? "—";
  const myPredictions = predictions.length;

  const upcoming = matches.filter((m) => m.status === "upcoming");
  const finished = matches.filter((m) => m.status === "finished");

  const upcomingByDate = groupByDate(upcoming);
  const finishedByDate = groupByDate(finished);
  const upcomingDates = Object.keys(upcomingByDate).sort();
  const finishedDates = Object.keys(finishedByDate).sort().reverse();

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#f3f4f6" }}>
      {selectedMatch && (
        <PredictionModal
          match={selectedMatch}
          existing={predictions.find((p) => p.matchId === selectedMatch.id)}
          onClose={() => setSelectedMatch(null)}
          onSaved={onPredictionSaved}
        />
      )}
      {viewMatch && (
        <MatchInfoModal match={viewMatch} onClose={() => setViewMatch(null)} />
      )}
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-56 py-8 px-4 flex-shrink-0" style={{ backgroundColor: "#00217E" }}>
        <div className="mb-10 px-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mundoshop-logo.png" alt="Mundo Shop" className="h-7 w-auto object-contain" />
          <p className="text-xs font-semibold mt-3" style={{ color: "rgba(255,255,255,0.5)" }}>
            Penca Mundial 2026
          </p>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item, idx) => {
            const active = nav === item.id;
            const isProfile = item.id === "profile";
            return (
              <div key={item.id}>
                {isProfile && (
                  <div className="my-3 mx-1" style={{ height: 1, backgroundColor: "rgba(255,255,255,0.12)" }} />
                )}
                <button
                  onClick={() => { setNav(item.id as NavItem); setProfileView("main"); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left"
                  style={active
                    ? { backgroundColor: "rgba(255,202,97,0.15)", color: "#FFCA61" }
                    : { color: "rgba(255,255,255,0.55)" }}
                >
                  <item.Icon active={active} />
                  {item.label}
                </button>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="lg:bg-white lg:border-b lg:border-gray-100 px-5 lg:px-8 h-16 flex items-center justify-between flex-shrink-0" style={{ backgroundColor: "#00217E" }}>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mundoshop-logo.png" alt="Mundo Shop" className="h-7 w-auto object-contain lg:hidden" />
            <img src="/wc2026.png" alt="FIFA World Cup 2026" className="hidden lg:block h-10 w-auto object-contain" />
            <div className="leading-tight hidden lg:block">
              <p className="text-sm font-bold text-gray-900">Mundial 2026</p>
              <p className="text-xs text-gray-400">FIFA WC 26</p>
            </div>
          </div>
          <button className="lg:hidden p-2 rounded-lg transition-colors" style={{ color: "rgba(255,255,255,0.7)" }}>
            <IconMenu />
          </button>
        </header>

        {/* Tabs — solo en Partidos */}
        {nav === "matches" && (
          <div className="bg-white border-b border-gray-100 px-5 lg:px-8 py-3 flex-shrink-0">
            <div className="inline-flex bg-gray-100 rounded-full p-1 gap-1">
              {(["finished", "upcoming", "ranking"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="px-5 py-2 rounded-full text-sm font-semibold transition-all"
                  style={tab === t ? { backgroundColor: "#00217E", color: "white" } : { color: "#9ca3af" }}
                >
                  {t === "finished" ? "Finalizados" : t === "upcoming" ? "Próximos" : "Ranking"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-4 lg:px-8 py-6">
          {/* ── Home ── */}
          {nav === "home" && (
            <div className="max-w-2xl mx-auto space-y-6">

              {/* En vivo */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: "#ef4444" }} />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                  <h2 className="text-sm font-bold text-gray-800">En vivo</h2>
                </div>
                {matches.filter(m => m.status === "live").length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm px-5 py-6 text-center">
                    <p className="text-gray-400 text-sm">No hay partidos en curso ahora</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {matches.filter(m => m.status === "live").map((match, idx) => (
                      <div key={match.id}>
                        {idx > 0 && <div className="h-px bg-gray-100 mx-4" />}
                        <button className="w-full text-left" onClick={() => setViewMatch(match)}>
                          <FinishedRow match={match} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Próximos partidos */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 rounded-full" style={{ backgroundColor: "#FFCA61" }} />
                    <h2 className="text-sm font-bold text-gray-800">Próximos partidos</h2>
                  </div>
                  <button
                    onClick={() => setNav("matches")}
                    className="text-xs font-semibold hover:underline"
                    style={{ color: "#00217E" }}
                  >
                    Ver todos
                  </button>
                </div>
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {upcoming.slice(0, 4).map((match, idx) => (
                    <div key={match.id}>
                      {idx > 0 && <div className="h-px bg-gray-100 mx-4" />}
                      <MatchRow match={match} onPredict={() => setSelectedMatch(match)} prediction={predictions.find((p) => p.matchId === match.id)} />
                    </div>
                  ))}
                </div>
              </section>

              {/* Tu posición */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-5 rounded-full bg-gray-300" />
                  <h2 className="text-sm font-bold text-gray-800">Tu posición</h2>
                </div>
                <div className="bg-white rounded-2xl shadow-sm px-5 py-4 flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: "#00217E" }}
                  >
                    —
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">Tu nombre</p>
                    <p className="text-xs text-gray-400 mt-0.5">0 puntos · Posición —</p>
                  </div>
                  <button
                    onClick={() => setNav("ranking")}
                    className="text-xs font-semibold hover:underline"
                    style={{ color: "#00217E" }}
                  >
                    Ver ranking
                  </button>
                </div>
              </section>

            </div>
          )}

          {/* ── Partidos ── */}
          {nav === "matches" && tab === "upcoming" && (
            <div className="max-w-2xl mx-auto space-y-6">
              {upcomingDates.map((date) => (
                <section key={date}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-5 rounded-full" style={{ backgroundColor: "#FFCA61" }} />
                    <h2 className="text-sm font-bold text-gray-800">{formatDate(date)}</h2>
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {upcomingByDate[date].map((match, idx) => (
                      <div key={match.id}>
                        {idx > 0 && <div className="h-px bg-gray-100 mx-4" />}
                        <MatchRow match={match} onPredict={() => setSelectedMatch(match)} prediction={predictions.find((p) => p.matchId === match.id)} />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {/* ── Finalizados ── */}
          {nav === "matches" && tab === "finished" && (
            <div className="max-w-2xl mx-auto">
              {finishedDates.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <p className="text-5xl mb-4">⏳</p>
                  <p className="font-semibold">Todavía no hay partidos finalizados</p>
                  <p className="text-sm mt-1">El mundial empieza el 11 de junio</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {finishedDates.map((date) => (
                    <section key={date}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1 h-5 rounded-full bg-gray-300" />
                        <h2 className="text-sm font-bold text-gray-800">{formatDate(date)}</h2>
                      </div>
                      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        {finishedByDate[date].map((match, idx) => (
                          <div key={match.id}>
                            {idx > 0 && <div className="h-px bg-gray-100 mx-4" />}
                            <FinishedRow match={match} />
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Grupos ── */}
          {nav === "groups" && (
            <div className="max-w-2xl mx-auto space-y-5">
              {/* Group selector */}
              <div className="flex gap-1.5 flex-wrap">
                {GROUP_LETTERS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setSelectedGroup(g)}
                    className="w-9 h-9 rounded-xl text-sm font-bold transition-colors"
                    style={
                      selectedGroup === g
                        ? { backgroundColor: "#00217E", color: "white" }
                        : { backgroundColor: "white", color: "#6b7280" }
                    }
                  >
                    {g}
                  </button>
                ))}
              </div>

              {/* Standings table */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h2 className="text-sm font-bold text-gray-900">Grupo {selectedGroup}</h2>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 w-8">#</th>
                      <th className="text-left px-2 py-2 text-xs font-semibold text-gray-400">Equipo</th>
                      <th className="text-center py-2 text-xs font-semibold text-gray-400 w-8">PJ</th>
                      <th className="text-center py-2 text-xs font-semibold text-gray-400 w-8">G</th>
                      <th className="text-center py-2 text-xs font-semibold text-gray-400 w-8">E</th>
                      <th className="text-center py-2 text-xs font-semibold text-gray-400 w-8">P</th>
                      <th className="text-center py-2 text-xs font-semibold text-gray-400 w-8">DG</th>
                      <th className="text-center py-2 text-xs font-semibold text-gray-400 w-10 pr-4">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {computeStandings(selectedGroup).map((row, idx) => {
                      const qualified = idx < 2;
                      return (
                        <tr key={row.team.name} className="border-b border-gray-50 last:border-0">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {qualified && (
                                <div className="w-1 h-5 rounded-full" style={{ backgroundColor: idx === 0 ? "#FFCA61" : "#00217E" }} />
                              )}
                              <span className="text-xs font-bold text-gray-400">{idx + 1}</span>
                            </div>
                          </td>
                          <td className="px-2 py-3">
                            <div className="flex items-center gap-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={row.team.shield} alt={row.team.name} className="w-6 h-6 object-contain flex-shrink-0" />
                              <span className="text-xs font-semibold text-gray-800 truncate">{row.team.shortName}</span>
                            </div>
                          </td>
                          <td className="text-center text-xs text-gray-500 py-3">{row.played}</td>
                          <td className="text-center text-xs text-gray-500 py-3">{row.won}</td>
                          <td className="text-center text-xs text-gray-500 py-3">{row.drawn}</td>
                          <td className="text-center text-xs text-gray-500 py-3">{row.lost}</td>
                          <td className="text-center text-xs text-gray-500 py-3">{row.gf - row.ga}</td>
                          <td className="text-center text-xs font-bold py-3 pr-4" style={{ color: "#00217E" }}>{row.pts}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-4 rounded-full" style={{ backgroundColor: "#FFCA61" }} />
                    <span className="text-xs text-gray-400">1° clasifica</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-4 rounded-full" style={{ backgroundColor: "#00217E" }} />
                    <span className="text-xs text-gray-400">2° clasifica</span>
                  </div>
                </div>
              </div>

              {/* Group matches */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h2 className="text-sm font-bold text-gray-900">Partidos</h2>
                </div>
                {matches.filter((m) => m.group === selectedGroup).map((match, idx, arr) => (
                  <div key={match.id}>
                    {idx > 0 && <div className="h-px bg-gray-100 mx-4" />}
                    {match.status === "finished" ? (
                      <FinishedRow match={match} />
                    ) : match.status === "live" ? (
                      <button className="w-full text-left" onClick={() => setViewMatch(match)}>
                        <FinishedRow match={match} />
                      </button>
                    ) : (
                      <MatchRow match={match} onPredict={() => setSelectedMatch(match)} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Ranking ── */}
          {nav === "matches" && tab === "ranking" && (
            <div className="max-w-lg mx-auto">
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {ranking.map((user, idx) => (
                  <div key={user.id}>
                    {idx > 0 && <div className="h-px bg-gray-100 mx-4" />}
                    <div className="flex items-center gap-4 px-5 py-4">
                      <span
                        className="text-sm font-bold w-5 text-center"
                        style={{ color: user.pos === 1 ? "#FFCA61" : "#9ca3af" }}
                      >
                        {user.pos}
                      </span>
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: user.id === session?.user?.id ? "#FFCA61" : "#00217E", color: user.id === session?.user?.id ? "#00217E" : "white" }}
                      >
                        {user.initials}
                      </div>
                      <span className="flex-1 text-sm font-semibold text-gray-900">{user.name}</span>
                      <span className="text-sm font-bold" style={{ color: "#00217E" }}>
                        {user.points} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* ── Ranking ── */}
          {nav === "ranking" && (
            <div className="max-w-lg mx-auto space-y-6">

              {/* Podio top 3 */}
              <style>{`
                @keyframes podium-up {
                  from { transform: scaleY(0); opacity: 0; }
                  to   { transform: scaleY(1); opacity: 1; }
                }
                @keyframes trophy-float {
                  0%, 100% { transform: translateY(0); }
                  50%       { transform: translateY(-6px); }
                }
                .podium-bar { transform-origin: bottom; animation: podium-up 0.5s ease-out forwards; }
                .trophy-float { animation: trophy-float 2s ease-in-out infinite; }
              `}</style>
              <div className="flex items-end justify-center gap-3 pt-4 pb-2">

                {/* 2° — plata */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white ring-2 ring-slate-300"
                    style={{ background: "linear-gradient(135deg, #94a3b8, #cbd5e1)" }}>
                    {ranking[1]?.initials ?? "—"}
                  </div>
                  <p className="text-xs font-bold text-gray-700 text-center">{ranking[1]?.name ?? "—"}</p>
                  <p className="text-xs font-semibold text-slate-400">{ranking[1]?.points ?? 0} pts</p>
                  <div className="podium-bar w-full rounded-t-xl flex items-center justify-center py-3"
                    style={{ background: "linear-gradient(180deg, #cbd5e1, #94a3b8)", minHeight: 60, animationDelay: "0.1s" }}>
                    <span className="text-xl font-black text-white drop-shadow">2</span>
                  </div>
                </div>

                {/* 1° — oro */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <span className="text-3xl trophy-float">🏆</span>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-base font-bold text-white ring-4 ring-yellow-200"
                    style={{ background: "linear-gradient(135deg, #00217E, #1a3a9e)" }}>
                    {ranking[0]?.initials ?? "—"}
                  </div>
                  <p className="text-xs font-bold text-gray-700 text-center">{ranking[0]?.name ?? "—"}</p>
                  <p className="text-xs font-bold" style={{ color: "#FFCA61" }}>{ranking[0]?.points ?? 0} pts</p>
                  <div className="podium-bar w-full rounded-t-xl flex items-center justify-center py-4"
                    style={{ background: "linear-gradient(180deg, #FFD87A, #FFCA61)", minHeight: 80, animationDelay: "0s" }}>
                    <span className="text-2xl font-black drop-shadow" style={{ color: "#00217E" }}>1</span>
                  </div>
                </div>

                {/* 3° — bronce */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white ring-2 ring-amber-600"
                    style={{ background: "linear-gradient(135deg, #b87333, #cd9b4a)" }}>
                    {ranking[2]?.initials ?? "—"}
                  </div>
                  <p className="text-xs font-bold text-gray-700 text-center">{ranking[2]?.name ?? "—"}</p>
                  <p className="text-xs font-semibold" style={{ color: "#b87333" }}>{ranking[2]?.points ?? 0} pts</p>
                  <div className="podium-bar w-full rounded-t-xl flex items-center justify-center py-2"
                    style={{ background: "linear-gradient(180deg, #cd9b4a, #b87333)", minHeight: 44, animationDelay: "0.2s" }}>
                    <span className="text-lg font-black text-white drop-shadow">3</span>
                  </div>
                </div>

              </div>

              {/* Lista completa */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {ranking.map((user, idx) => (
                  <div key={user.id}>
                    {idx > 0 && <div className="h-px bg-gray-100 mx-4" />}
                    <div
                      className="flex items-center gap-4 px-5 py-4"
                      style={user.id === session?.user?.id ? { backgroundColor: "#eff6ff" } : idx === 0 ? { backgroundColor: "#fffbeb" } : {}}
                    >
                      <span
                        className="text-sm font-bold w-5 text-center flex-shrink-0"
                        style={{ color: idx === 0 ? "#FFCA61" : idx === 1 ? "#9ca3af" : idx === 2 ? "#b45309" : "#d1d5db" }}
                      >
                        {user.pos}
                      </span>
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: user.id === session?.user?.id ? "#FFCA61" : "#00217E", color: user.id === session?.user?.id ? "#00217E" : "white" }}
                      >
                        {user.initials}
                      </div>
                      <span className="flex-1 text-sm font-semibold text-gray-900">{user.name}</span>
                      <span className="text-sm font-bold" style={{ color: "#00217E" }}>{user.points} pts</span>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-center text-xs text-gray-400">{ranking.length} participantes</p>
            </div>
          )}

          {/* ── Perfil ── */}
          {nav === "profile" && profileView === "main" && (
            <div className="max-w-lg mx-auto space-y-6 pb-4">
              {/* Avatar + stats */}
              <div className="bg-white rounded-2xl shadow-sm px-5 py-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ backgroundColor: avatarColor }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/trophy.png" alt="avatar" className="w-10 h-10 object-contain drop-shadow" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900">{userName}</p>
                    <p className="text-sm text-gray-400">{userEmail}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Puntos", value: String(myPoints) },
                    { label: "Posición", value: String(myPos) },
                    { label: "Predicciones", value: String(myPredictions) },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl py-3 text-center" style={{ backgroundColor: "#f3f4f6" }}>
                      <p className="text-lg font-bold" style={{ color: "#00217E" }}>{stat.value}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CUENTA */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">Cuenta</p>
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <ProfileRow icon={<IconUser />} label="Editar perfil" onClick={() => setProfileView("edit")} />
                  <div className="h-px bg-gray-100 mx-4" />
                  <ProfileRow icon={<IconRules />} label="Historial de predicciones" onClick={() => setProfileView("history")} />
                </div>
              </div>

              {/* INFORMACIÓN */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">Información</p>
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <ProfileRow icon={<IconRules />} label="Reglas del juego" onClick={() => setProfileView("rules")} />
                  <div className="h-px bg-gray-100 mx-4" />
                  <ProfileRow icon={<IconTerms />} label="Términos y condiciones" onClick={() => setProfileView("terms")} />
                </div>
              </div>

              {/* Panel admin — solo visible para el admin */}
              {userEmail === "fede16rodriguez@gmail.com" && (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <button onClick={() => window.location.href = "/admin"} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-blue-50 transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00217E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                    <span className="text-sm font-bold" style={{ color: "#00217E" }}>Panel de admin</span>
                  </button>
                </div>
              )}

              {/* Cerrar sesión */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <button onClick={() => signOut({ callbackUrl: "/login" })} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-red-50 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  <span className="text-sm font-bold text-red-500">Cerrar sesión</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Editar perfil ── */}
          {nav === "profile" && profileView === "edit" && (
            <div className="max-w-lg mx-auto space-y-4 pb-4">
              <button onClick={() => { setProfileView("main"); setEditError(""); setEditSuccess(false); }} className="flex items-center gap-2 text-sm font-semibold px-1" style={{ color: "#00217E" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                Volver
              </button>
              <div className="bg-white rounded-2xl shadow-sm px-5 py-6 space-y-5">
                {/* Avatar + color picker */}
                <div className="flex flex-col items-center gap-3">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: editAvatarColor }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/trophy.png" alt="avatar" className="w-13 h-13 object-contain drop-shadow" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 text-center mb-2">Color de fondo</p>
                    <div className="flex gap-2 flex-wrap justify-center">
                      {["#00217E","#1d4ed8","#7c3aed","#be185d","#dc2626","#ea580c","#d97706","#16a34a","#0d9488","#374151"].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditAvatarColor(c)}
                          className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                          style={{ backgroundColor: c, outline: editAvatarColor === c ? `3px solid ${c}` : "none", outlineOffset: "2px" }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                {/* Nombre */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Nombre</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => { setEditName(e.target.value); setEditSuccess(false); }}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ "--tw-ring-color": "#00217E" } as React.CSSProperties}
                  />
                </div>
                {/* Email (solo lectura) */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Email</label>
                  <p className="text-sm text-gray-500 px-1">{userEmail}</p>
                </div>
                {/* Proveedor */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Ingresaste con</label>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: "#f3f4f6", color: "#374151" }}>
                    {userProvider === "google" ? (
                      <><svg width="12" height="12" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>Google</>
                    ) : (
                      <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>Email</>
                    )}
                  </span>
                </div>
                {editError && <p className="text-xs text-red-500">{editError}</p>}
                {editSuccess && <p className="text-xs font-semibold" style={{ color: "#00217E" }}>Cambios guardados</p>}
                <button
                  disabled={editLoading || !editName.trim()}
                  onClick={async () => {
                    setEditLoading(true); setEditError(""); setEditSuccess(false);
                    const res = await fetch("/api/users/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editName, avatarColor: editAvatarColor }) });
                    setEditLoading(false);
                    if (!res.ok) { const d = await res.json(); setEditError(d.error ?? "Error al guardar"); return; }
                    setAvatarColor(editAvatarColor);
                    setEditSuccess(true);
                  }}
                  className="w-full py-3 rounded-2xl text-sm font-bold text-white transition-opacity"
                  style={{ backgroundColor: "#00217E", opacity: editLoading || !editName.trim() ? 0.5 : 1 }}
                >
                  {editLoading ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>
          )}

          {/* ── Historial ── */}
          {nav === "profile" && profileView === "history" && (
            <div className="max-w-lg mx-auto space-y-4 pb-4">
              <button onClick={() => setProfileView("main")} className="flex items-center gap-2 text-sm font-semibold px-1" style={{ color: "#00217E" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                Volver
              </button>
              {predictions.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm px-5 py-10 text-center">
                  <p className="text-gray-400 text-sm">Todavía no hiciste ninguna predicción.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {predictions.map((pred, idx) => {
                    const match = matches.find((m) => m.id === pred.matchId);
                    if (!match) return null;
                    const finished = match.status === "finished" && match.homeScore !== undefined && match.awayScore !== undefined;
                    const pts = finished ? calcPoints(pred.homeScore, pred.awayScore, match.homeScore!, match.awayScore!) : null;
                    return (
                      <div key={pred.matchId}>
                        {idx > 0 && <div className="h-px bg-gray-100 mx-4" />}
                        <div className="px-4 py-4 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-400 mb-1">Grupo {match.group} — {match.home.shortName} vs {match.away.shortName}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-700">Tu predicción: {pred.homeScore}–{pred.awayScore}</span>
                              {finished && (
                                <span className="text-xs text-gray-400">| Real: {match.homeScore}–{match.awayScore}</span>
                              )}
                            </div>
                          </div>
                          {pts !== null ? (
                            <span className="text-sm font-black flex-shrink-0" style={{ color: pts >= 8 ? "#16a34a" : pts >= 5 ? "#00217E" : pts >= 3 ? "#d97706" : "#9ca3af" }}>
                              +{pts} pts
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300 flex-shrink-0">Pendiente</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Reglas ── */}
          {nav === "profile" && profileView === "rules" && (
            <div className="max-w-lg mx-auto space-y-3 pb-6">
              {/* Header */}
              <div className="flex items-center justify-between px-1 pt-1">
                <button onClick={() => setProfileView("main")} className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: "#00217E" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Volver
                </button>
                <span className="text-sm font-bold text-gray-700">Reglas del juego</span>
                <span className="w-16" />
              </div>
              <p className="text-xs text-gray-400 text-center px-1">Aprendé cómo funciona la penca y cómo ganar puntos</p>

              {/* Cómo jugar */}
              <div className="bg-white rounded-2xl shadow-sm p-4 flex items-start gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#e0f2e9" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 mb-0.5">¿Cómo jugar?</p>
                  <p className="text-xs text-gray-500 leading-relaxed">Predecí el resultado de cada partido antes de que empiece. Entrá a la sección &quot;Partidos&quot; y tocá PREDECIR.</p>
                </div>
              </div>

              {/* Sistema de puntos */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 flex items-center gap-3 border-b border-gray-100">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#fef9e7" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFCA61"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  </div>
                  <p className="text-sm font-bold text-gray-900">Sistema de puntos</p>
                </div>
                {[
                  { pts: "+8", label: "Resultado exacto", desc: "Predijiste 2-1 y terminó 2-1. ¡Máximo de puntos!", bg: "#e0f2e9", color: "#16a34a",
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="#16a34a"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> },
                  { pts: "+5", label: "Ganador + diferencia correcta", desc: "Predijiste 3-1 y terminó 2-0. Ganador y diferencia de goles correctos.", bg: "#dbeafe", color: "#00217E",
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00217E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
                  { pts: "+3", label: "Ganador o empate correcto", desc: "Predijiste 2-0 y terminó 1-0. Solo el resultado es correcto.", bg: "#fef3c7", color: "#d97706",
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
                  { pts: "+0", label: "Predicción incorrecta", desc: "Predijiste 2-0 pero terminó 0-1. El resultado no coincidió.", bg: "#fee2e2", color: "#ef4444",
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> },
                ].map((r, i, arr) => (
                  <div key={r.pts}>
                    {i > 0 && <div className="h-px bg-gray-100 mx-4" />}
                    <div className="p-4 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: r.bg }}>
                        <span className="text-sm font-black" style={{ color: r.color }}>{r.pts}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {r.icon}
                          <p className="text-sm font-bold text-gray-800">{r.label}</p>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">{r.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tiempo reglamentario */}
              <div className="bg-white rounded-2xl shadow-sm p-4 flex items-start gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#ccfbf1" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 mb-0.5">Tiempo reglamentario</p>
                  <p className="text-xs text-gray-500 leading-relaxed">Los puntos se calculan con el resultado al final de los 90 minutos. No se cuentan el tiempo extra ni los penales.</p>
                </div>
              </div>

              {/* Fechas límite */}
              <div className="bg-white rounded-2xl shadow-sm p-4 flex items-start gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#ffedd5" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 mb-0.5">Fecha límite</p>
                  <p className="text-xs text-gray-500 leading-relaxed">Las predicciones cierran cuando empieza el partido. Asegurate de ingresar la tuya antes del inicio.</p>
                </div>
              </div>

              {/* Ranking */}
              <div className="bg-white rounded-2xl shadow-sm p-4 flex items-start gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#ede9fe" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 mb-0.5">Ranking</p>
                  <p className="text-xs text-gray-500 leading-relaxed">El ranking se actualiza automáticamente después de cada partido. Podés ver tu posición global en la sección Ranking.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Términos ── */}
          {nav === "profile" && profileView === "terms" && (
            <div className="max-w-lg mx-auto pb-6">
              {/* Header */}
              <div className="flex items-center justify-between px-1 pt-1 mb-5">
                <button onClick={() => setProfileView("main")} className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: "#00217E" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Volver
                </button>
                <span className="text-sm font-bold text-gray-700">Términos y condiciones</span>
                <span className="w-16" />
              </div>

              <div className="bg-white rounded-2xl shadow-sm px-5 py-6 space-y-6">
                <div>
                  <h2 className="text-lg font-black text-gray-900 mb-1">Términos y Condiciones de Uso</h2>
                  <p className="text-xs text-gray-400 mb-3">Última actualización: abril de 2026</p>
                  <p className="text-sm text-gray-500 leading-relaxed">Bienvenido a la Penca Mundial 2026 de Mundo Shop (en adelante, &quot;la Aplicación&quot;). Al registrarte y utilizar la Aplicación, aceptás estos Términos y Condiciones. Si no estás de acuerdo, no utilices la Aplicación.</p>
                </div>

                {[
                  {
                    num: "1", title: "Descripción del Servicio",
                    content: <p className="text-sm text-gray-500 leading-relaxed">La Penca Mundial 2026 es una aplicación gratuita de pronósticos deportivos con fines recreativos, organizada por Mundo Shop para sus colaboradores y participantes invitados. Los usuarios pueden realizar predicciones sobre resultados de partidos del Mundial 2026 y competir en el ranking general.</p>
                  },
                  {
                    num: "2", title: "Registro y Cuenta",
                    content: <ul className="space-y-1.5">{["Para participar debés registrarte con una cuenta válida (Google o correo electrónico).", "Sos responsable de mantener la confidencialidad de tu cuenta y contraseña.", "La información proporcionada debe ser veraz y actualizada.", "Mundo Shop se reserva el derecho de suspender cuentas que violen estos términos."].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-500 leading-relaxed"><span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#00217E" }} />{item}</li>
                    ))}</ul>
                  },
                  {
                    num: "3", title: "Uso Aceptable",
                    content: <><p className="text-sm text-gray-500 leading-relaxed mb-2">Al utilizar la Aplicación, te comprometés a:</p><ul className="space-y-1.5">{["No utilizar la Aplicación con fines ilegales o no autorizados.", "No intentar acceder de forma no autorizada a los sistemas de la Aplicación.", "No utilizar bots, scripts u otros medios automatizados.", "Respetar a los demás participantes."].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-500 leading-relaxed"><span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#00217E" }} />{item}</li>
                    ))}</ul></>
                  },
                  {
                    num: "4", title: "Privacidad y Datos Personales",
                    content: <><p className="text-sm text-gray-500 leading-relaxed mb-2">Recopilamos y procesamos los siguientes datos:</p><ul className="space-y-1.5">{["Información de registro (nombre y correo electrónico).", "Predicciones realizadas y puntos obtenidos."].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-500 leading-relaxed"><span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#00217E" }} />{item}</li>
                    ))}</ul><p className="text-sm text-gray-500 leading-relaxed mt-2">Tus datos no serán compartidos con terceros salvo cuando sea necesario para el funcionamiento del servicio o cuando la ley lo requiera.</p></>
                  },
                  {
                    num: "5", title: "Naturaleza del Juego",
                    content: <p className="text-sm text-gray-500 leading-relaxed">La Aplicación es un juego de entretenimiento sin apuestas monetarias. No se realizan transacciones económicas. Los puntos y el ranking son exclusivamente con fines recreativos y no tienen valor monetario.</p>
                  },
                  {
                    num: "6", title: "Resultados y Puntuación",
                    content: <p className="text-sm text-gray-500 leading-relaxed">Los resultados de los partidos son cargados por el administrador de la penca. Una vez publicados, el ranking y los puntos son definitivos. No se aceptan reclamos sobre puntuaciones.</p>
                  },
                  {
                    num: "7", title: "Disponibilidad del Servicio",
                    content: <p className="text-sm text-gray-500 leading-relaxed">Nos esforzamos por mantener la Aplicación disponible, pero no garantizamos un funcionamiento ininterrumpido. Mundo Shop puede modificar, suspender o discontinuar cualquier aspecto del servicio sin previo aviso.</p>
                  },
                  {
                    num: "8", title: "Modificaciones",
                    content: <p className="text-sm text-gray-500 leading-relaxed">Nos reservamos el derecho de modificar estos Términos y Condiciones en cualquier momento. Los cambios entrarán en vigor al publicarse en la Aplicación. El uso continuado implica su aceptación.</p>
                  },
                  {
                    num: "9", title: "Contacto",
                    content: <p className="text-sm text-gray-500 leading-relaxed">Para consultas sobre estos términos podés contactarnos a través de Mundo Shop.</p>
                  },
                  {
                    num: "10", title: "Ley Aplicable",
                    content: <p className="text-sm text-gray-500 leading-relaxed">Estos términos se rigen por las leyes de la República Oriental del Uruguay. Cualquier disputa será sometida a los tribunales competentes de Montevideo, Uruguay.</p>
                  },
                ].map((section, i, arr) => (
                  <div key={section.num}>
                    {i > 0 && <div className="h-px bg-gray-100 -mx-5 mb-6" />}
                    <h3 className="text-sm font-black text-gray-900 mb-2">{section.num}. {section.title}</h3>
                    {section.content}
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>

        {/* ── Mobile Bottom Nav ── */}
        <nav className="lg:hidden px-2 py-2 flex justify-around flex-shrink-0" style={{ backgroundColor: "#00217E" }}>
          {navItems.map((item) => {
            const active = nav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setNav(item.id as NavItem); setProfileView("main"); }}
                className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all"
                style={active ? { backgroundColor: "rgba(255,202,97,0.15)" } : {}}
              >
                <item.Icon active={active} />
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: active ? "#FFCA61" : "rgba(255,255,255,0.55)" }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function TeamDisplay({ team }: { team: Match["home"] }) {
  return (
    <div className="flex flex-col items-center gap-1.5 w-24">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={team.shield}
        alt={team.name}
        width={52}
        height={52}
        className="object-contain"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      <span className="text-xs font-semibold text-gray-700 text-center leading-tight">
        {team.shortName}
      </span>
    </div>
  );
}

function MatchRow({ match, onPredict, prediction }: { match: Match; onPredict: () => void; prediction?: Prediction }) {
  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-400 font-medium">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-300 mr-1.5 mb-0.5" />
          Grupo {match.group} — Fecha {match.matchday}
        </span>
        <span className="text-xs font-semibold text-gray-500">{match.time}</span>
      </div>
      <div className="flex items-center justify-between">
        <TeamDisplay team={match.home} />
        <div className="flex flex-col items-center gap-1.5">
          {prediction && (
            <span className="text-xs font-bold" style={{ color: "#00217E" }}>
              {prediction.homeScore} — {prediction.awayScore}
            </span>
          )}
          <button
            onClick={onPredict}
            className="px-5 py-2 rounded-full text-xs font-bold tracking-wider transition-opacity hover:opacity-80"
            style={{ backgroundColor: prediction ? "#e0e7ff" : "#FFCA61", color: "#00217E" }}
          >
            {prediction ? "EDITAR" : "PREDECIR"}
          </button>
        </div>
        <TeamDisplay team={match.away} />
      </div>
    </div>
  );
}

function FinishedRow({ match }: { match: Match }) {
  const isLive = match.status === "live";
  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
          {isLive ? (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
          ) : (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-300" />
          )}
          Grupo {match.group} — Fecha {match.matchday}
        </span>
        {isLive ? (
          <span className="text-xs font-bold text-red-500 uppercase tracking-wide">En vivo</span>
        ) : (
          <span className="text-xs font-semibold text-gray-500">{match.time}</span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <TeamDisplay team={match.home} />
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-gray-900">{match.homeScore ?? 0}</span>
            <span className="text-gray-300 text-lg">–</span>
            <span className="text-3xl font-bold text-gray-900">{match.awayScore ?? 0}</span>
          </div>
          {isLive && (
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">En curso</span>
          )}
        </div>
        <TeamDisplay team={match.away} />
      </div>
    </div>
  );
}

// ── Icons ──
const iconStroke = (active: boolean) => (active ? "#FFCA61" : "rgba(255,255,255,0.55)");

const navItems = [
  {
    id: "home",
    label: "Home",
    Icon: ({ active }: { active: boolean }) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={iconStroke(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.55 5.45 21 6 21H9M19 10V20C19 20.55 18.55 21 18 21H15M9 21C9 21 9 15 12 15C15 15 15 21 15 21M9 21H15" />
      </svg>
    ),
  },
  {
    id: "matches",
    label: "Partidos",
    Icon: ({ active }: { active: boolean }) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={iconStroke(active)} strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3C12 3 8.5 7 8.5 12C8.5 17 12 21 12 21" />
        <path d="M12 3C12 3 15.5 7 15.5 12C15.5 17 12 21 12 21" />
        <path d="M3.5 9H20.5M3.5 15H20.5" />
      </svg>
    ),
  },
  {
    id: "groups",
    label: "Grupos",
    Icon: ({ active }: { active: boolean }) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={iconStroke(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: "ranking",
    label: "Ranking",
    Icon: ({ active }: { active: boolean }) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={iconStroke(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    id: "profile",
    label: "Perfil",
    Icon: ({ active }: { active: boolean }) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={iconStroke(active)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

// ── Prediction Modal ──
function ScoreButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold transition-colors hover:opacity-80"
      style={{ backgroundColor: "#f3f4f6", color: "#00217E" }}
    >
      {children}
    </button>
  );
}

function PredictionModal({ match, existing, onClose, onSaved }: {
  match: Match;
  existing?: Prediction;
  onClose: () => void;
  onSaved: (p: Prediction) => void;
}) {
  const [home, setHome] = useState<number>(existing?.homeScore ?? 0);
  const [away, setAway] = useState<number>(existing?.awayScore ?? 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Mock stats — replaced with real data when DB is connected
  const stats = { homeWin: 52, draw: 18, awayWin: 30, totalVotes: 34 };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId: match.id, homeScore: home, awayScore: away }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al guardar");
      return;
    }
    onSaved({ matchId: match.id, homeScore: home, awayScore: away });
    onClose();
  }

  const statusLabel: Record<string, string> = {
    upcoming: "Próximo",
    live: "En vivo",
    finished: "Finalizado",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full lg:w-[460px] rounded-t-3xl lg:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">

        {/* Handle mobile */}
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Close button */}
        <div className="flex justify-end px-5 pt-4">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-8 space-y-5">

          {/* ── Teams + score ── */}
          <div className="flex items-center justify-between gap-2">
            {/* Home */}
            <div className="flex flex-col items-center gap-1.5 flex-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={match.home.shield} alt={match.home.name} className="w-16 h-16 object-contain" />
              <span className="text-xs font-bold text-gray-800 text-center leading-tight">{match.home.shortName}</span>
            </div>

            {/* Score inputs */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1.5">
                <ScoreButton onClick={() => setHome((v) => v + 1)}>+</ScoreButton>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold border-2 transition-colors"
                  style={{ borderColor: "#00217E", color: "#00217E" }}
                >
                  {home}
                </div>
                <ScoreButton onClick={() => setHome((v) => Math.max(0, v - 1))}>−</ScoreButton>
              </div>

              <span className="text-xl font-bold text-gray-200 mb-0.5">—</span>

              <div className="flex flex-col items-center gap-1.5">
                <ScoreButton onClick={() => setAway((v) => v + 1)}>+</ScoreButton>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold border-2 transition-colors"
                  style={{ borderColor: "#00217E", color: "#00217E" }}
                >
                  {away}
                </div>
                <ScoreButton onClick={() => setAway((v) => Math.max(0, v - 1))}>−</ScoreButton>
              </div>
            </div>

            {/* Away */}
            <div className="flex flex-col items-center gap-1.5 flex-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={match.away.shield} alt={match.away.name} className="w-16 h-16 object-contain" />
              <span className="text-xs font-bold text-gray-800 text-center leading-tight">{match.away.shortName}</span>
            </div>
          </div>

          {/* Confirm button */}
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white transition-all"
            style={{ backgroundColor: "#00217E", opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Guardando..." : existing ? "Actualizar predicción" : "Confirmar predicción"}
          </button>

          {/* ── Stats ── */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Predicciones</p>
              <span className="text-xs text-gray-400">{stats.totalVotes} votos</span>
            </div>

            {/* Bar */}
            <div className="flex rounded-full overflow-hidden h-2.5 mb-3 gap-0.5">
              <div style={{ width: `${stats.homeWin}%`, backgroundColor: "#00217E" }} />
              <div style={{ width: `${stats.draw}%`, backgroundColor: "#FFCA61" }} />
              <div style={{ width: `${stats.awayWin}%`, backgroundColor: "#e5e7eb" }} />
            </div>

            {/* Labels */}
            <div className="flex justify-between text-xs font-semibold">
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: "#00217E" }} />
                  <span className="text-gray-500">Local</span>
                </div>
                <span style={{ color: "#00217E" }}>{stats.homeWin}%</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: "#FFCA61" }} />
                  <span className="text-gray-500">Empate</span>
                </div>
                <span style={{ color: "#b8942a" }}>{stats.draw}%</span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block bg-gray-300" />
                  <span className="text-gray-500">Visitante</span>
                </div>
                <span className="text-gray-400">{stats.awayWin}%</span>
              </div>
            </div>
          </div>

          {/* ── Match info ── */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            {[
              {
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00217E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>,
                label: "Torneo",
                value: "Mundial 2026",
              },
              {
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00217E" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
                label: "Fecha",
                value: `Grupo ${match.group} — Fecha ${match.matchday}`,
              },
              {
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00217E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
                label: "Día y hora",
                value: `${formatDate(match.date)}, ${match.time}`,
              },
              {
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00217E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
                label: "Estadio",
                value: match.venue,
              },
              {
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00217E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
                label: "Estado",
                value: statusLabel[match.status] ?? "Próximo",
              },
            ].map((row, idx, arr) => (
              <div key={row.label}>
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    {row.icon}
                    <span className="text-sm text-gray-400">{row.label}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 text-right max-w-[55%]">{row.value}</span>
                </div>
                {idx < arr.length - 1 && <div className="h-px bg-gray-100 mx-4" />}
              </div>
            ))}
          </div>

        </form>
      </div>
    </div>
  );
}

// ── Match Info Modal (live / finished — read only) ──
function MatchInfoModal({ match, onClose }: { match: Match; onClose: () => void }) {
  const stats = { homeWin: 52, draw: 18, awayWin: 30, totalVotes: 34 };
  const isLive = match.status === "live";

  const statusLabel: Record<string, string> = {
    upcoming: "Próximo",
    live: "En vivo",
    finished: "Finalizado",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full lg:w-[460px] rounded-t-3xl lg:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">

        {/* Handle mobile */}
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Close */}
        <div className="flex justify-end px-5 pt-4">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-5 pb-8 space-y-5">

          {/* Teams + score */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col items-center gap-1.5 flex-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={match.home.shield} alt={match.home.name} className="w-16 h-16 object-contain" />
              <span className="text-xs font-bold text-gray-800 text-center">{match.home.shortName}</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-3">
                <span className="text-4xl font-bold text-gray-900">{match.homeScore ?? 0}</span>
                <span className="text-gray-200 text-2xl">–</span>
                <span className="text-4xl font-bold text-gray-900">{match.awayScore ?? 0}</span>
              </div>
              {isLive && (
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                  </span>
                  En vivo
                </span>
              )}
            </div>

            <div className="flex flex-col items-center gap-1.5 flex-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={match.away.shield} alt={match.away.name} className="w-16 h-16 object-contain" />
              <span className="text-xs font-bold text-gray-800 text-center">{match.away.shortName}</span>
            </div>
          </div>

          {/* Predicciones cerradas */}
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-2xl"
            style={{ backgroundColor: "#fef2f2" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <p className="text-xs font-semibold text-red-500">
              Predicciones cerradas — el partido ya comenzó
            </p>
          </div>

          {/* Stats */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Predicciones</p>
              <span className="text-xs text-gray-400">{stats.totalVotes} votos</span>
            </div>
            <div className="flex rounded-full overflow-hidden h-2.5 mb-3 gap-0.5">
              <div style={{ width: `${stats.homeWin}%`, backgroundColor: "#00217E" }} />
              <div style={{ width: `${stats.draw}%`, backgroundColor: "#FFCA61" }} />
              <div style={{ width: `${stats.awayWin}%`, backgroundColor: "#e5e7eb" }} />
            </div>
            <div className="flex justify-between text-xs font-semibold">
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#00217E" }} />
                  <span className="text-gray-500">Local</span>
                </div>
                <span style={{ color: "#00217E" }}>{stats.homeWin}%</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#FFCA61" }} />
                  <span className="text-gray-500">Empate</span>
                </div>
                <span style={{ color: "#b8942a" }}>{stats.draw}%</span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-300" />
                  <span className="text-gray-500">Visitante</span>
                </div>
                <span className="text-gray-400">{stats.awayWin}%</span>
              </div>
            </div>
          </div>

          {/* Match info */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            {[
              {
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00217E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>,
                label: "Torneo", value: "Mundial 2026",
              },
              {
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00217E" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
                label: "Fecha", value: `Grupo ${match.group} — Fecha ${match.matchday}`,
              },
              {
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00217E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
                label: "Día y hora", value: `${formatDate(match.date)}, ${match.time}`,
              },
              {
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00217E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
                label: "Estadio", value: match.venue,
              },
              {
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00217E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
                label: "Estado", value: statusLabel[match.status] ?? "Próximo",
              },
            ].map((row, idx, arr) => (
              <div key={row.label}>
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    {row.icon}
                    <span className="text-sm text-gray-400">{row.label}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 text-right max-w-[55%]">{row.value}</span>
                </div>
                {idx < arr.length - 1 && <div className="h-px bg-gray-100 mx-4" />}
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Profile components ──
function ProfileRow({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
      <span style={{ color: "#00217E" }}>{icon}</span>
      <span className="flex-1 text-sm font-semibold text-gray-800 text-left">{label}</span>
      {value && <span className="text-sm text-gray-400 mr-1">{value}</span>}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

function IconUser() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function IconRules() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}

function IconHelp() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}

function IconTerms() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
    </svg>
  );
}
