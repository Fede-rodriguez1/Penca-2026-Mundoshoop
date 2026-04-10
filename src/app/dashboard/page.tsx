"use client";

import { useState } from "react";
import { matches, groupByDate, formatDate, type Match } from "@/data/fixture";

type Tab = "upcoming" | "finished" | "ranking";
type NavItem = "home" | "matches" | "groups" | "ranking" | "profile";

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
  const [tab, setTab] = useState<Tab>("upcoming");
  const [nav, setNav] = useState<NavItem>("matches");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [viewMatch, setViewMatch] = useState<Match | null>(null);

  const upcoming = matches.filter((m) => m.status === "upcoming");
  const finished = matches.filter((m) => m.status === "finished");

  const upcomingByDate = groupByDate(upcoming);
  const finishedByDate = groupByDate(finished);
  const upcomingDates = Object.keys(upcomingByDate).sort();
  const finishedDates = Object.keys(finishedByDate).sort().reverse();

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#f3f4f6" }}>
      {selectedMatch && (
        <PredictionModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      )}
      {viewMatch && (
        <MatchInfoModal match={viewMatch} onClose={() => setViewMatch(null)} />
      )}
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-gray-100 py-8 px-5 flex-shrink-0">
        <div className="mb-10 px-1">
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "#FFCA61" }}>
            Mundo Shop
          </p>
          <h1 className="text-xl font-bold leading-tight mt-1" style={{ color: "#00217E" }}>
            Penca Mundial
            <br />
            <span>2026</span>
          </h1>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active = nav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setNav(item.id as NavItem)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors text-left"
                style={active ? { backgroundColor: "#00217E", color: "white" } : { color: "#6b7280" }}
              >
                <item.Icon active={active} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-5 lg:px-8 h-16 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div className="leading-tight">
              <p className="text-sm font-bold text-gray-900">Mundial 2026</p>
              <p className="text-xs text-gray-400">FIFA WC 26</p>
            </div>
          </div>
          <button className="lg:hidden p-2 rounded-lg hover:bg-gray-50 transition-colors">
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
                      <MatchRow match={match} onPredict={() => setSelectedMatch(match)} />
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
                        <MatchRow match={match} onPredict={() => setSelectedMatch(match)} />
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

          {/* ── Ranking ── */}
          {nav === "matches" && tab === "ranking" && (
            <div className="max-w-lg mx-auto">
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {sampleRanking.map((user, idx) => (
                  <div key={user.pos}>
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
                        style={{ backgroundColor: "#00217E" }}
                      >
                        {user.initials}
                      </div>
                      <span className="flex-1 text-sm font-semibold text-gray-900">{user.name}</span>
                      <span className="text-sm font-bold" style={{ color: "#00217E" }}>
                        {user.pts} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* ── Mobile Bottom Nav ── */}
        <nav className="lg:hidden bg-white border-t border-gray-100 px-2 py-2 flex justify-around flex-shrink-0">
          {navItems.map((item) => {
            const active = nav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setNav(item.id as NavItem)}
                className="flex flex-col items-center gap-1 px-3 py-1"
              >
                <item.Icon active={active} />
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: active ? "#00217E" : "#9ca3af" }}
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

function MatchRow({ match, onPredict }: { match: Match; onPredict: () => void }) {
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
        <button
          onClick={onPredict}
          className="px-5 py-2 rounded-full text-xs font-bold tracking-wider transition-opacity hover:opacity-80"
          style={{ backgroundColor: "#FFCA61", color: "#00217E" }}
        >
          PREDECIR
        </button>
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
const iconStroke = (active: boolean) => (active ? "#00217E" : "#9ca3af");

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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
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

function PredictionModal({ match, onClose }: { match: Match; onClose: () => void }) {
  const [home, setHome] = useState<number | null>(null);
  const [away, setAway] = useState<number | null>(null);

  const bothFilled = home !== null && away !== null;

  // Mock stats — replaced with real data when DB is connected
  const stats = { homeWin: 52, draw: 18, awayWin: 30, totalVotes: 34 };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
                <ScoreButton onClick={() => setHome((v) => Math.max(0, (v ?? 0) + 1))}>+</ScoreButton>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold border-2 transition-colors"
                  style={{ borderColor: home !== null ? "#00217E" : "#e5e7eb", color: home !== null ? "#00217E" : "#d1d5db" }}
                >
                  {home ?? 0}
                </div>
                <ScoreButton onClick={() => setHome((v) => Math.max(0, (v ?? 0) - 1))}>−</ScoreButton>
              </div>

              <span className="text-xl font-bold text-gray-200 mb-0.5">—</span>

              <div className="flex flex-col items-center gap-1.5">
                <ScoreButton onClick={() => setAway((v) => Math.max(0, (v ?? 0) + 1))}>+</ScoreButton>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold border-2 transition-colors"
                  style={{ borderColor: away !== null ? "#00217E" : "#e5e7eb", color: away !== null ? "#00217E" : "#d1d5db" }}
                >
                  {away ?? 0}
                </div>
                <ScoreButton onClick={() => setAway((v) => Math.max(0, (v ?? 0) - 1))}>−</ScoreButton>
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
          <button
            type="submit"
            onClick={() => { if (!bothFilled) { setHome(home ?? 0); setAway(away ?? 0); } }}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white transition-all"
            style={{ backgroundColor: "#00217E" }}
          >
            Confirmar predicción
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
