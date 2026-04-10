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

        {/* Tabs */}
        <div className="bg-white border-b border-gray-100 px-5 lg:px-8 py-3 flex-shrink-0">
          <div className="inline-flex bg-gray-100 rounded-full p-1 gap-1">
            {(["finished", "upcoming", "ranking"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-5 py-2 rounded-full text-sm font-semibold transition-all"
                style={
                  tab === t
                    ? { backgroundColor: "#00217E", color: "white" }
                    : { color: "#9ca3af" }
                }
              >
                {t === "finished" ? "Finalizados" : t === "upcoming" ? "Próximos" : "Ranking"}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-4 lg:px-8 py-6">
          {/* ── Próximos ── */}
          {tab === "upcoming" && (
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
          {tab === "finished" && (
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
          {tab === "ranking" && (
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
  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-400 font-medium">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5 mb-0.5" />
          Grupo {match.group} — Fecha {match.matchday}
        </span>
        <span className="text-xs font-semibold text-gray-500">{match.time}</span>
      </div>
      <div className="flex items-center justify-between">
        <TeamDisplay team={match.home} />
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold text-gray-900">{match.homeScore ?? 0}</span>
          <span className="text-gray-300 text-lg">–</span>
          <span className="text-3xl font-bold text-gray-900">{match.awayScore ?? 0}</span>
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
function PredictionModal({ match, onClose }: { match: Match; onClose: () => void }) {
  const [homeGoals, setHomeGoals] = useState<string>("");
  const [awayGoals, setAwayGoals] = useState<string>("");

  const home = parseInt(homeGoals);
  const away = parseInt(awayGoals);
  const bothFilled = homeGoals !== "" && awayGoals !== "";

  function previewPoints(): { pts: number; label: string } | null {
    if (!bothFilled) return null;
    // Just a preview — real calc happens server-side after match ends
    if (home === away) return { pts: 3, label: "Empate correcto ✓" };
    if (home > away) return { pts: 3, label: "Ganador correcto ✓" };
    return { pts: 3, label: "Ganador correcto ✓" };
  }

  const preview = previewPoints();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // submit logic goes here
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full lg:w-[440px] rounded-t-3xl lg:rounded-2xl overflow-hidden shadow-2xl">
        {/* Handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4 pb-2">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Grupo {match.group} — Fecha {match.matchday}
            </p>
            <p className="text-sm font-bold text-gray-700 mt-0.5">
              {match.venue} · {match.time}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Teams + inputs */}
        <form onSubmit={handleSubmit} className="px-6 pt-4 pb-8">
          <div className="flex items-center justify-between gap-3 mb-6">
            {/* Home team */}
            <div className="flex flex-col items-center gap-2 flex-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={match.home.shield} alt={match.home.name} className="w-14 h-14 object-contain" />
              <span className="text-xs font-bold text-gray-700 text-center">{match.home.shortName}</span>
            </div>

            {/* Score inputs */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="20"
                value={homeGoals}
                onChange={(e) => setHomeGoals(e.target.value)}
                placeholder="0"
                className="w-16 h-16 text-center text-2xl font-bold text-gray-900 border-2 rounded-2xl focus:outline-none transition-colors"
                style={{ borderColor: homeGoals !== "" ? "#00217E" : "#e5e7eb" }}
              />
              <span className="text-xl font-bold text-gray-300">–</span>
              <input
                type="number"
                min="0"
                max="20"
                value={awayGoals}
                onChange={(e) => setAwayGoals(e.target.value)}
                placeholder="0"
                className="w-16 h-16 text-center text-2xl font-bold text-gray-900 border-2 rounded-2xl focus:outline-none transition-colors"
                style={{ borderColor: awayGoals !== "" ? "#00217E" : "#e5e7eb" }}
              />
            </div>

            {/* Away team */}
            <div className="flex flex-col items-center gap-2 flex-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={match.away.shield} alt={match.away.name} className="w-14 h-14 object-contain" />
              <span className="text-xs font-bold text-gray-700 text-center">{match.away.shortName}</span>
            </div>
          </div>

          {/* Points system reminder */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-5 space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Sistema de puntos</p>
            {[
              { pts: 8, label: "Marcador exacto" },
              { pts: 5, label: "Ganador + diferencia de goles" },
              { pts: 3, label: "Ganador o empate correcto" },
              { pts: 0, label: "Predicción incorrecta" },
            ].map((row) => (
              <div key={row.pts} className="flex items-center gap-3">
                <span
                  className="text-xs font-bold w-8 h-6 flex items-center justify-center rounded-full"
                  style={{
                    backgroundColor: row.pts === 8 ? "#00217E" : row.pts === 5 ? "#1a3a9e" : row.pts === 3 ? "#FFCA61" : "#f3f4f6",
                    color: row.pts === 3 ? "#00217E" : row.pts === 0 ? "#9ca3af" : "white",
                  }}
                >
                  +{row.pts}
                </span>
                <span className="text-xs text-gray-600">{row.label}</span>
              </div>
            ))}
          </div>

          {/* Preview */}
          {preview && (
            <div className="text-center mb-4">
              <span className="text-xs font-semibold" style={{ color: "#00217E" }}>
                {preview.label} — podés sumar hasta <strong>+8 pts</strong> si acertás el marcador exacto
              </span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!bothFilled}
            className="w-full py-4 rounded-2xl text-sm font-bold text-white transition-opacity"
            style={{
              backgroundColor: "#00217E",
              opacity: bothFilled ? 1 : 0.35,
              cursor: bothFilled ? "pointer" : "not-allowed",
            }}
          >
            Confirmar predicción
          </button>
        </form>
      </div>
    </div>
  );
}
