"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSession, signOut } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { matches, groupByDate, formatDate, type Match } from "@/data/fixture";
import { calcPoints } from "@/lib/scoring";

type Prediction = { matchId: string; homeScore: number; awayScore: number };
type MatchResult = { matchId: string; homeScore: number; awayScore: number; elapsed: number | null; status: string };
type RankingEntry = { id: string; name: string; initials: string; avatarColor: string; points: number; exact: number; correct: number; predictions: number; pos: number };

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

function DashboardPageInner() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("upcoming");
  const [nav, setNav] = useState<NavItem>("home");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [viewMatch, setViewMatch] = useState<Match | null>(null);
  const [selectedGroup, setSelectedGroup] = useState("A");

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [rankingHasLive, setRankingHasLive] = useState(false);
  const [rankingLoading, setRankingLoading] = useState(true);
  const [profileView, setProfileView] = useState<"main" | "edit" | "history" | "rules" | "terms">("main");
  const [editName, setEditName] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState(false);
  const [userProvider, setUserProvider] = useState<string>("credentials");
  const [avatarColor, setAvatarColor] = useState("#00217E");
  const [editAvatarColor, setEditAvatarColor] = useState("#00217E");
  const [pencaName, setPencaName] = useState<string | null>(null);
  const [pencaCode, setPencaCode] = useState<string | null>(null);
  const [showPrizePopup, setShowPrizePopup] = useState(false);

  // Admin: ver ranking de cualquier penca sin cambiar la propia
  const [adminPencas, setAdminPencas] = useState<{ id: string; name: string }[]>([]);
  const [viewPencaId, setViewPencaIdState] = useState<string | null>(null);
  const viewPencaIdRef = useRef<string | null>(null);

  function setViewPencaId(id: string | null) {
    viewPencaIdRef.current = id;
    setViewPencaIdState(id);
    if (id) localStorage.setItem("admin-view-pencaId", id);
    else localStorage.removeItem("admin-view-pencaId");
  }

  // Si viene de Google con ?pencaCode=, actualizar la penca y limpiar la URL
  useEffect(() => {
    const code = searchParams.get("pencaCode");
    if (!code || !session?.user?.id) return;
    fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pencaCode: code }),
    }).then((r) => r.json()).then((data) => {
      if (data?.penca) {
        setPencaCode(data.penca.code);
        setPencaName(data.penca.name);
        router.replace("/dashboard");
      }
    });
  }, [searchParams, session?.user?.id]);

  function fetchResults() {
    fetch("/api/results")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setResults(data); });
  }

  function fetchRanking() {
    const pid = viewPencaIdRef.current;
    const url = pid ? `/api/ranking?pencaId=${pid}` : "/api/ranking";
    fetch(url)
      .then((r) => { if (!r.ok) return null; return r.json(); })
      .then((data) => {
        if (!data) return;
        if (Array.isArray(data)) { setRanking(data); } // backward compat
        else if (Array.isArray(data.ranking)) { setRanking(data.ranking); setRankingHasLive(data.hasLive ?? false); }
        setRankingLoading(false);
      });
  }

  useEffect(() => {
    fetch("/api/predictions")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setPredictions(data); });
    fetchResults();
    fetchRanking();
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((data) => {
        if (data?.provider) setUserProvider(data.provider);
        if (data?.name) setEditName(data.name);
        if (data?.avatarColor) { setAvatarColor(data.avatarColor); setEditAvatarColor(data.avatarColor); }
        if (data?.penca?.name) setPencaName(data.penca.name);
        if (data?.penca?.code) setPencaCode(data.penca.code);
        if (data?.penca?.code === "GENERAL2026") {
          const seen = sessionStorage.getItem("prize-popup-seen");
          if (!seen) setShowPrizePopup(true);
        }
      });

    // Poll results + ranking every 60s for live match updates
    const interval = setInterval(() => {
      fetchResults();
      fetchRanking();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Admin: cargar pencas disponibles y restaurar la vista guardada
  useEffect(() => {
    if (!session?.user?.isAdmin) return;
    const saved = localStorage.getItem("admin-view-pencaId");
    if (saved) { viewPencaIdRef.current = saved; setViewPencaIdState(saved); }
    fetch("/api/admin/pencas")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAdminPencas(data.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))); });
  }, [session?.user?.isAdmin]);

  // Session duration tracking
  useEffect(() => {
    const startTime = Date.now();
    const handleUnload = () => {
      const duration = Math.round((Date.now() - startTime) / 1000);
      navigator.sendBeacon("/api/events", JSON.stringify({ type: "session", duration }));
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  function trackEvent(type: "click_ml" | "click_instagram") {
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    }).catch(() => {});
  }

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

  // Use DB status when available, falling back to fixture.ts
  function effectiveStatus(m: Match): string {
    const r = results.find((r) => r.matchId === m.id);
    return r?.status ?? m.status;
  }

  const live = matches.filter((m) => effectiveStatus(m) === "live");
  const upcoming = matches.filter((m) => effectiveStatus(m) === "upcoming");
  const finished = matches.filter((m) => effectiveStatus(m) === "finished");

  const upcomingByDate = groupByDate([...live, ...upcoming]);
  const finishedByDate = groupByDate(finished);
  const upcomingDates = Object.keys(upcomingByDate).sort();
  const finishedDates = Object.keys(finishedByDate).sort().reverse();

  function withResult(match: Match): Match & { elapsed?: number | null } {
    const r = results.find((r) => r.matchId === match.id);
    if (!r) return match;
    return {
      ...match,
      homeScore: r.homeScore,
      awayScore: r.awayScore,
      elapsed: r.elapsed,
      status: (r.status as Match["status"]) ?? match.status,
    };
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#f3f4f6" }}>
      {/* ── Premio popup ── */}
      {showPrizePopup && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl">
            {/* Imagen Río */}
            <div className="relative h-56">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/rio.avif" alt="Río de Janeiro" className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)" }} />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-white text-xl font-black leading-tight">¡El ganador viaja a<br />Río de Janeiro! 🇧🇷</p>
              </div>
            </div>
            {/* Contenido */}
            <div className="bg-white px-5 py-5">
              <p className="text-sm font-bold text-gray-900 mb-2">Viaje para 2 personas a Río de Janeiro</p>
              <ul className="space-y-1 mb-3">
                {[
                  "Pasaje aéreo con tasas e impuestos",
                  "Equipaje de mano (carry on) y bolso de mano",
                  "Traslado compartido aeropuerto / hotel / aeropuerto",
                  "7 noches de alojamiento",
                  "Asistencia al viajero plan AC 60",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-gray-500">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#FFCA61" }} />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-400 mb-4">Fecha a coordinar en temporada baja. Premio financiado por Mundo Shop.</p>
              <button
                onClick={() => { sessionStorage.setItem("prize-popup-seen", "1"); setShowPrizePopup(false); }}
                className="w-full py-3 rounded-2xl text-sm font-bold text-white"
                style={{ backgroundColor: "#00217E" }}
              >
                ¡Vamos a ganar!
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedMatch && (
        <PredictionModal
          match={selectedMatch}
          existing={predictions.find((p) => p.matchId === selectedMatch.id)}
          onClose={() => setSelectedMatch(null)}
          onSaved={onPredictionSaved}
        />
      )}
      {viewMatch && (
        <MatchInfoModal match={viewMatch} onClose={() => setViewMatch(null)} prediction={predictions.find((p) => p.matchId === viewMatch.id)} />
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

        {/* Botones sociales — parte inferior del sidebar */}
        <div className="mt-auto pt-6 px-1 space-y-4">
          {/* Instagram */}
          <a
            href="https://www.instagram.com/mundoshop.uy/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.7)",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.14)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.08)"; }}
            onClick={() => trackEvent("click_instagram")}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
            </svg>
            Seguinos en Instagram
          </a>

          {/* Mercado Libre */}
          <a
            href="https://www.mercadolibre.com.uy/tienda/mundoshop"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-btn"
            onClick={() => trackEvent("click_ml")}
          >
            <div className="ml-btn-border" />
            <div className="ml-btn-inner">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Visitanos en Mercado Libre
            </div>
          </a>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header mobile — azul con logo MundoShop */}
        <header className="lg:hidden px-5 h-16 flex items-center flex-shrink-0" style={{ backgroundColor: "#00217E" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mundoshop-logo.png" alt="Mundo Shop" className="h-7 w-auto object-contain" />
        </header>

        {/* Header desktop — blanco con logo FIFA */}
        <header className="hidden lg:flex bg-white border-b border-gray-100 px-8 h-16 items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/wc2026.png" alt="FIFA World Cup 2026" className="h-10 w-auto object-contain" />
            <div className="leading-tight">
              <p className="text-sm font-bold text-gray-900">Mundial 2026</p>
              <p className="text-xs text-gray-400">FIFA WC 26</p>
            </div>
          </div>
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
                {live.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm px-5 py-6 text-center">
                    <p className="text-gray-400 text-sm">No hay partidos en curso ahora</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {live.map((match, idx) => (
                      <div key={match.id}>
                        {idx > 0 && <div className="h-px bg-gray-100 mx-4" />}
                        <button className="w-full text-left" onClick={() => setViewMatch(withResult(match))}>
                          <FinishedRow match={withResult(match)} />
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
                  {[...upcoming].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)).slice(0, 6).map((match, idx) => (
                    <div key={match.id}>
                      {idx > 0 && <div className="h-px bg-gray-100 mx-4" />}
                      <MatchRow match={match} onPredict={() => setSelectedMatch(match)} prediction={predictions.find((p) => p.matchId === match.id)} />
                    </div>
                  ))}
                </div>
              </section>

              {/* Tu posición */}
              {(() => {
                const me = ranking.find((u) => u.id === session?.user?.id);
                return (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-5 rounded-full bg-gray-300" />
                      <h2 className="text-sm font-bold text-gray-800">Tu posición</h2>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm px-5 py-4 flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                        style={{ backgroundColor: avatarColor }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/ball.png" alt="avatar" className="w-8 h-8 object-contain" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900">{session?.user?.name ?? "—"}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {me ? `${me.points} pts · Posición ${me.pos}` : "0 pts · Sin posición aún"}
                        </p>
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
                );
              })()}

              {/* Botones sociales — solo mobile (en desktop están en el sidebar) */}
              <section className="lg:hidden space-y-3 pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1 h-5 rounded-full bg-gray-200" />
                  <h2 className="text-sm font-bold text-gray-800">Seguinos</h2>
                </div>
                <a
                  href="https://www.instagram.com/mundoshop.uy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white shadow-sm text-sm font-semibold transition-all hover:shadow-md"
                  style={{ color: "#00217E" }}
                  onClick={() => trackEvent("click_instagram")}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                  Seguinos en Instagram
                </a>
                <a
                  href="https://www.mercadolibre.com.uy/tienda/mundoshop"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-btn"
                  onClick={() => trackEvent("click_ml")}
                >
                  <div className="ml-btn-border" />
                  <div className="ml-btn-inner">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                    Visitanos en Mercado Libre
                  </div>
                </a>
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
                    {upcomingByDate[date].map((match, idx) => {
                      const eff = effectiveStatus(match);
                      return (
                        <div key={match.id}>
                          {idx > 0 && <div className="h-px bg-gray-100 mx-4" />}
                          {eff === "live" ? (
                            <button className="w-full text-left" onClick={() => setViewMatch(withResult(match))}>
                              <FinishedRow match={withResult(match)} />
                            </button>
                          ) : (
                            <MatchRow match={match} onPredict={() => setSelectedMatch(match)} prediction={predictions.find((p) => p.matchId === match.id)} />
                          )}
                        </div>
                      );
                    })}
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
                            <FinishedRow match={withResult(match)} />
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
                {matches.filter((m) => m.group === selectedGroup).map((match, idx) => {
                  const eff = effectiveStatus(match);
                  return (
                    <div key={match.id}>
                      {idx > 0 && <div className="h-px bg-gray-100 mx-4" />}
                      {eff === "finished" ? (
                        <FinishedRow match={withResult(match)} />
                      ) : eff === "live" ? (
                        <button className="w-full text-left" onClick={() => setViewMatch(withResult(match))}>
                          <FinishedRow match={withResult(match)} />
                        </button>
                      ) : (
                        <MatchRow match={match} onPredict={() => setSelectedMatch(match)} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Ranking ── */}
          {nav === "matches" && tab === "ranking" && (
            <div className="max-w-lg mx-auto space-y-3">
              {session?.user?.isAdmin && adminPencas.length > 1 && (
                <div className="flex items-center gap-1.5 p-1 rounded-2xl" style={{ backgroundColor: "#f3f4f6" }}>
                  <span className="text-xs font-bold text-gray-400 px-2">Vista:</span>
                  {adminPencas.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setViewPencaId(viewPencaId === p.id ? null : p.id); setRankingLoading(true); setTimeout(fetchRanking, 0); }}
                      className="flex-1 py-1.5 rounded-xl text-xs font-bold transition-all"
                      style={viewPencaId === p.id ? { backgroundColor: "#00217E", color: "white" } : { color: "#6b7280" }}
                    >
                      {p.name}
                    </button>
                  ))}
                  {viewPencaId && (
                    <button onClick={() => { setViewPencaId(null); setRankingLoading(true); setTimeout(fetchRanking, 0); }} className="px-2 text-xs text-gray-400 hover:text-gray-600">✕</button>
                  )}
                </div>
              )}
              {rankingHasLive && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl" style={{ backgroundColor: "#fef2f2" }}>
                  <span className="relative flex h-2 w-2 flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <p className="text-xs font-semibold text-red-600">En vivo · ranking provisional — puede cambiar con el resultado final</p>
                </div>
              )}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {rankingLoading ? (
                  [0,1,2,3].map((i) => (
                    <div key={i}>
                      {i > 0 && <div className="h-px bg-gray-100 mx-4" />}
                      <div className="flex items-center gap-4 px-5 py-4 animate-pulse">
                        <div className="w-5 h-3 rounded-full bg-gray-100" />
                        <div className="w-9 h-9 rounded-full flex-shrink-0" style={{ backgroundColor: "rgba(0,33,126,0.08)" }} />
                        <div className="flex-1 h-3 rounded-full bg-gray-100" />
                        <div className="w-12 h-3 rounded-full" style={{ backgroundColor: "rgba(0,33,126,0.08)" }} />
                      </div>
                    </div>
                  ))
                ) : (
                  ranking.map((user, idx) => (
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
                  ))
                )}
              </div>
            </div>
          )}
          {/* ── Ranking ── */}
          {nav === "ranking" && (
            <div className="max-w-lg mx-auto space-y-6">

              {/* Toggle de penca para admin */}
              {session?.user?.isAdmin && adminPencas.length > 1 && (
                <div className="flex items-center gap-1.5 p-1 rounded-2xl" style={{ backgroundColor: "#f3f4f6" }}>
                  <span className="text-xs font-bold text-gray-400 px-2">Vista:</span>
                  {adminPencas.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setViewPencaId(viewPencaId === p.id ? null : p.id); setRankingLoading(true); setTimeout(fetchRanking, 0); }}
                      className="flex-1 py-1.5 rounded-xl text-xs font-bold transition-all"
                      style={viewPencaId === p.id ? { backgroundColor: "#00217E", color: "white" } : { color: "#6b7280" }}
                    >
                      {p.name}
                    </button>
                  ))}
                  {viewPencaId && (
                    <button onClick={() => { setViewPencaId(null); setRankingLoading(true); setTimeout(fetchRanking, 0); }} className="px-2 text-xs text-gray-400 hover:text-gray-600">✕</button>
                  )}
                </div>
              )}

              {/* Podio top 3 */}
              <style>{`
                @keyframes podium-up {
                  from { transform: scaleY(0); opacity: 0; }
                  to   { transform: scaleY(1); opacity: 1; }
                }
                @keyframes trophy-float {
                  0%, 100% { transform: translateY(0); }
                  50%       { transform: translateY(-8px); }
                }
                .podium-bar { transform-origin: bottom; animation: podium-up 0.5s ease-out forwards; }
                .trophy-float { animation: trophy-float 2s ease-in-out infinite; }
                @keyframes shimmer {
                  0%   { background-position: -200% center; }
                  100% { background-position: 200% center; }
                }
                @media (hover: hover) {
                  .btn-predict { position: relative; overflow: hidden; }
                  .btn-predict::after {
                    content: "";
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.55) 50%, transparent 60%);
                    background-size: 200% 100%;
                    background-position: -200% center;
                    opacity: 0;
                    transition: opacity 0.2s;
                  }
                  .btn-predict:hover::after {
                    opacity: 1;
                    animation: shimmer 0.7s ease forwards;
                  }
                  .btn-predict:hover { transform: scale(1.04); transition: transform 0.15s ease; }
                }
              `}</style>
              <div className="flex items-end justify-center gap-3 pt-4 pb-2">

                {/* 2° — plata */}
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center ring-2 ring-slate-300 overflow-hidden"
                    style={{ backgroundColor: ranking[1]?.avatarColor ?? "#00217E" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/ball.png" alt="avatar" className="w-8 h-8 object-contain" />
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
                  <div style={{ perspective: "300px" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/trophy.png" alt="🏆" className="w-12 h-12 object-contain trophy-float" />
                  </div>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center ring-4 ring-yellow-200 overflow-hidden"
                    style={{ backgroundColor: ranking[0]?.avatarColor ?? "#00217E" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/ball.png" alt="avatar" className="w-10 h-10 object-contain" />
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
                  <div className="w-12 h-12 rounded-full flex items-center justify-center ring-2 ring-amber-600 overflow-hidden"
                    style={{ backgroundColor: ranking[2]?.avatarColor ?? "#00217E" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/ball.png" alt="avatar" className="w-8 h-8 object-contain" />
                  </div>
                  <p className="text-xs font-bold text-gray-700 text-center">{ranking[2]?.name ?? "—"}</p>
                  <p className="text-xs font-semibold" style={{ color: "#b87333" }}>{ranking[2]?.points ?? 0} pts</p>
                  <div className="podium-bar w-full rounded-t-xl flex items-center justify-center py-2"
                    style={{ background: "linear-gradient(180deg, #cd9b4a, #b87333)", minHeight: 44, animationDelay: "0.2s" }}>
                    <span className="text-lg font-black text-white drop-shadow">3</span>
                  </div>
                </div>

              </div>

              {/* Banner provisional si hay partidos en vivo */}
              {rankingHasLive && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl" style={{ backgroundColor: "#fef2f2" }}>
                  <span className="relative flex h-2 w-2 flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <p className="text-xs font-semibold text-red-600">En vivo · ranking provisional — puede cambiar con el resultado final</p>
                </div>
              )}

              {/* Banner sin resultados aún */}
              {!rankingHasLive && ranking.every((u) => u.points === 0) && ranking.length > 0 && (
                <div className="rounded-2xl px-5 py-4 text-center text-sm font-medium" style={{ backgroundColor: "#eff6ff", color: "#00217E" }}>
                  🕐 Todavía no hay partidos terminados. El ranking se actualiza automáticamente cuando finalicen.
                </div>
              )}

              {/* Lista completa */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {rankingLoading ? (
                  [0,1,2,3].map((i) => (
                    <div key={i}>
                      {i > 0 && <div className="h-px bg-gray-100 mx-4" />}
                      <div className="flex items-center gap-4 px-5 py-4 animate-pulse">
                        <div className="w-5 h-3 rounded-full bg-gray-100" />
                        <div className="w-9 h-9 rounded-full flex-shrink-0" style={{ backgroundColor: "rgba(0,33,126,0.08)" }} />
                        <div className="flex-1 h-3 rounded-full bg-gray-100" />
                        <div className="w-12 h-3 rounded-full" style={{ backgroundColor: "rgba(0,33,126,0.08)" }} />
                      </div>
                    </div>
                  ))
                ) : (
                  ranking.map((user, idx) => (
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
                          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                          style={{ backgroundColor: user.avatarColor ?? "#00217E" }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/ball.png" alt="avatar" className="w-6 h-6 object-contain" />
                        </div>
                        <span className="flex-1 text-sm font-semibold text-gray-900">{user.name}</span>
                        <span className="text-sm font-bold" style={{ color: "#00217E" }}>{user.points} pts</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <p className="text-center text-xs text-gray-400">{rankingLoading ? "" : `${ranking.length} participantes`}</p>
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
                    <img src="/ball.png" alt="avatar" className="w-10 h-10 object-contain drop-shadow" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900">{userName}</p>
                    <p className="text-sm text-gray-400">{userEmail}</p>
                    {pencaName && (
                      <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#eff6ff", color: "#00217E" }}>
                        {pencaName}
                      </span>
                    )}
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
                    <img src="/ball.png" alt="avatar" className="w-13 h-13 object-contain drop-shadow" />
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
                    const result = results.find((r) => r.matchId === match.id);
                    const isFinished = effectiveStatus(match) === "finished";
                    const actualHome = result?.homeScore ?? match.homeScore;
                    const actualAway = result?.awayScore ?? match.awayScore;
                    const pts = isFinished && actualHome !== undefined && actualAway !== undefined
                      ? calcPoints(pred.homeScore, pred.awayScore, actualHome, actualAway)
                      : null;
                    return (
                      <div key={pred.matchId}>
                        {idx > 0 && <div className="h-px bg-gray-100 mx-4" />}
                        <div className="px-4 py-4 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-400 mb-1">Grupo {match.group} — {match.home.shortName} vs {match.away.shortName}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-700">Tu predicción: {pred.homeScore}–{pred.awayScore}</span>
                              {isFinished && actualHome !== undefined && actualAway !== undefined && (
                                <span className="text-xs text-gray-400">| Real: {actualHome}–{actualAway}</span>
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
                <span className="text-sm font-bold text-gray-700">Bases y condiciones</span>
                <span className="w-16" />
              </div>

              <div className="bg-white rounded-2xl shadow-sm px-5 py-6 space-y-6">
                <div>
                  <h2 className="text-lg font-black text-gray-900 mb-1">Bases y Condiciones</h2>
                  <p className="text-xs text-gray-400 mb-3">Última actualización: mayo de 2026</p>
                  <p className="text-sm text-gray-500 leading-relaxed">Al participar en la Penca Mundial 2026 de Mundo Shop, aceptás las siguientes bases y condiciones.</p>
                </div>

                {[
                  {
                    num: "1", title: "Organización",
                    content: <p className="text-sm text-gray-500 leading-relaxed">La Penca Mundial 2026 es organizada por <span className="font-semibold text-gray-700">Mundo Shop</span>, con sede en la República Oriental del Uruguay. La participación es gratuita y tiene fines exclusivamente recreativos.</p>
                  },
                  {
                    num: "2", title: "Participación y Registro",
                    content: <ul className="space-y-1.5">{[
                      "Para participar debés registrarte con una cuenta válida (Google o correo electrónico) usando el código o QR de tu penca.",
                      "Es requisito ser mayor de edad (18 años o más) para participar.",
                      "El registro estará habilitado hasta el inicio del primer partido del Mundial 2026 (11 de junio de 2026). Luego de esa fecha no se aceptarán nuevos participantes.",
                      "La información proporcionada debe ser veraz y actualizada.",
                      "Mundo Shop se reserva el derecho de suspender cuentas que violen estas bases.",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-500 leading-relaxed"><span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#00217E" }} />{item}</li>
                    ))}</ul>
                  },
                  {
                    num: "3", title: "Predicciones",
                    content: <ul className="space-y-1.5">{[
                      "Los participantes podrán realizar predicciones de resultado (goles) para cada partido del Mundial 2026.",
                      "El plazo para predecir cada partido cierra en el momento en que comienza dicho partido. No se aceptan predicciones posteriores.",
                      "Una vez cerrado el plazo, las predicciones no podrán ser modificadas.",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-500 leading-relaxed"><span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#00217E" }} />{item}</li>
                    ))}</ul>
                  },
                  {
                    num: "4", title: "Sistema de Puntuación",
                    content: <ul className="space-y-1.5">{[
                      "Resultado exacto (marcador correcto): 8 puntos.",
                      "Ganador correcto + diferencia de goles correcta (ej: predijiste 2-0 y salió 3-1): 5 puntos.",
                      "Ganador correcto o empate (sin acertar la diferencia): 3 puntos.",
                      "Resultado incorrecto: 0 puntos.",
                      "Los resultados son cargados por el administrador. Una vez publicados, el ranking y los puntos son definitivos.",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-500 leading-relaxed"><span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#00217E" }} />{item}</li>
                    ))}</ul>
                  },
                  ...(pencaCode === "GENERAL2026" ? [
                  {
                    num: "5", title: "Plazo de Vigencia",
                    content: <p className="text-sm text-gray-500 leading-relaxed">La Penca Mundial 2026 estará activa desde el <span className="font-semibold text-gray-700">11 de junio de 2026</span> (inicio del torneo) hasta el <span className="font-semibold text-gray-700">19 de julio de 2026</span> (final del Mundial). Fuera de ese período, la aplicación no recibirá nuevas predicciones ni actualizará puntajes.</p>
                  },
                  {
                    num: "6", title: "Premio",
                    content: <ul className="space-y-1.5">{[
                      "El ganador de la Penca General recibirá un viaje para dos personas a Río de Janeiro, Brasil, financiado por Mundo Shop.",
                      "El premio incluye: pasaje aéreo con tasas e impuestos, bolso de mano, equipaje de mano (carry on en cabina), traslado compartido aeropuerto/hotel/aeropuerto, 7 noches de alojamiento y asistencia al viajero plan AC 60.",
                      "Para ser elegible, el participante debe ser mayor de edad (18 años o más) y cliente de Mundo Shop. Los empleados de Mundo Shop no participan de este premio.",
                      "La fecha del viaje será elegida por el ganador en coordinación con Mundo Shop, debiendo realizarse en temporada baja. En caso de que el ganador desee viajar en una fecha fuera de temporada baja, deberá abonar la diferencia de costo correspondiente.",
                      "En caso de empate en puntos al finalizar el torneo, el ganador se determinará por la mayor cantidad de resultados exactos acertados (marcador exacto).",
                      "Si el empate persiste, se realizará un sorteo entre los participantes empatados.",
                      "El premio es personal e intransferible y no tiene valor en efectivo ni puede ser canjeado por dinero.",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-500 leading-relaxed"><span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#FFCA61" }} />{item}</li>
                    ))}</ul>
                  },
                  {
                    num: "7", title: "Comunicación y Entrega del Premio",
                    content: <ul className="space-y-1.5">{[
                      "El ganador será notificado por correo electrónico a la dirección registrada en la aplicación, dentro de los 7 días hábiles posteriores a la finalización del torneo.",
                      "El ganador dispondrá de 72 horas desde la recepción del correo para confirmar su aceptación. De no recibirse respuesta en ese plazo, el premio pasará al siguiente participante en el ranking.",
                      "El resultado final y el nombre del ganador serán comunicados también a través de las redes sociales de Mundo Shop.",
                      "Mundo Shop queda liberado de toda responsabilidad respecto al premio una vez realizada la entrega formal al ganador.",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-500 leading-relaxed"><span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#FFCA61" }} />{item}</li>
                    ))}</ul>
                  },
                  {
                    num: "8", title: "Veracidad de los Datos",
                    content: <p className="text-sm text-gray-500 leading-relaxed">Si el participante ganador hubiera proporcionado datos incorrectos o incompletos que impidan la entrega del premio, Mundo Shop quedará eximido de toda responsabilidad. Dicho participante podrá continuar en la penca con fines recreativos, pero perderá el derecho al premio, el cual pasará al siguiente en el ranking.</p>
                  },
                  {
                    num: "9", title: "Autorización de Imagen",
                    content: <p className="text-sm text-gray-500 leading-relaxed">El participante ganador autoriza a Mundo Shop a utilizar su nombre y fotografía con fines publicitarios relacionados con la Penca Mundial 2026, sin derecho a remuneración adicional.</p>
                  },
                  {
                    num: "10", title: "Fuerza Mayor",
                    content: <p className="text-sm text-gray-500 leading-relaxed">Mundo Shop no será responsable por el incumplimiento de estas bases cuando sea consecuencia de causas ajenas a su voluntad, incluyendo pero no limitadas a: cancelación o modificación del calendario del Mundial 2026 por parte de la FIFA, desastres naturales, actos de gobierno u otras circunstancias de fuerza mayor. En tales casos, Mundo Shop notificará a los participantes y resolverá la situación de la manera más equitativa posible.</p>
                  },
                  ] : []),
                  {
                    num: pencaCode === "GENERAL2026" ? "11" : "5", title: "Privacidad y Datos Personales",
                    content: <><p className="text-sm text-gray-500 leading-relaxed mb-2">Recopilamos y procesamos los siguientes datos:</p><ul className="space-y-1.5">{["Información de registro (nombre y correo electrónico).", "Predicciones realizadas y puntos obtenidos."].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-500 leading-relaxed"><span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#00217E" }} />{item}</li>
                    ))}</ul><p className="text-sm text-gray-500 leading-relaxed mt-2">Tus datos no serán compartidos con terceros salvo cuando sea necesario para el funcionamiento del servicio o cuando la ley lo requiera.</p></>
                  },
                  {
                    num: pencaCode === "GENERAL2026" ? "12" : "6", title: "Uso Aceptable",
                    content: <ul className="space-y-1.5">{["No utilizar la Aplicación con fines ilegales o no autorizados.", "No intentar acceder de forma no autorizada a los sistemas de la Aplicación.", "No utilizar bots, scripts u otros medios automatizados.", "Respetar a los demás participantes."].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-500 leading-relaxed"><span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#00217E" }} />{item}</li>
                    ))}</ul>
                  },
                  {
                    num: pencaCode === "GENERAL2026" ? "13" : "7", title: "Disponibilidad del Servicio",
                    content: <p className="text-sm text-gray-500 leading-relaxed">Mundo Shop se esfuerza por mantener la Aplicación disponible, pero no garantiza un funcionamiento ininterrumpido. Puede modificar, suspender o discontinuar cualquier aspecto del servicio sin previo aviso.</p>
                  },
                  {
                    num: pencaCode === "GENERAL2026" ? "14" : "8", title: "Ley Aplicable",
                    content: <p className="text-sm text-gray-500 leading-relaxed">Estas bases se rigen por las leyes de la República Oriental del Uruguay. Cualquier disputa será sometida a los tribunales competentes de Montevideo, Uruguay.</p>
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
        <nav className="lg:hidden px-2 pt-2 flex justify-around flex-shrink-0" style={{ backgroundColor: "#00217E", paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
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

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardPageInner />
    </Suspense>
  );
}

function TeamDisplay({ team }: { team: Match["home"] }) {
  return (
    <div className="flex flex-col items-center gap-1.5 w-24">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={team.shield || "/trophy.png"}
        alt={team.name}
        className="object-contain"
        style={{ width: 52, height: 52 }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = "/trophy.png";
        }}
      />
      <span className="text-xs font-semibold text-gray-700 text-center leading-tight">
        {team.shortName}
      </span>
    </div>
  );
}

function useCountdown(match: Match): string | null {
  const [countdown, setCountdown] = useState<string | null>(null);
  useEffect(() => {
    function compute() {
      if (match.status !== "upcoming" || match.time === "--:--") { setCountdown(null); return; }
      const todayAR = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });
      if (match.date !== todayAR) { setCountdown(null); return; }
      const matchDateTime = new Date(`${match.date}T${match.time}:00-03:00`);
      const diff = matchDateTime.getTime() - Date.now();
      if (diff <= 0) { setCountdown(null); return; }
      const totalMin = Math.floor(diff / 60000);
      const hours = Math.floor(totalMin / 60);
      const mins = totalMin % 60;
      if (totalMin < 10) setCountdown(`¡Comienza en ${totalMin}min!`);
      else if (hours > 0) setCountdown(`Faltan ${hours}h${mins > 0 ? ` ${mins}min` : ""}`);
      else setCountdown(`Faltan ${totalMin}min`);
    }
    compute();
    const id = setInterval(compute, 60000);
    return () => clearInterval(id);
  }, [match]);
  return countdown;
}

function MatchRow({ match, onPredict, prediction }: { match: Match; onPredict: () => void; prediction?: Prediction }) {
  const countdown = useCountdown(match);
  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-400 font-medium">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-300 mr-1.5 mb-0.5" />
          Grupo {match.group} — Fecha {match.matchday}
        </span>
        <span className="text-xs font-semibold text-gray-500">{match.time}</span>
      </div>
      {countdown && (
        <div className="mb-3 flex justify-center">
          <span
            className="text-xs font-bold px-3 py-1 rounded-full"
            style={countdown.startsWith("¡")
              ? { backgroundColor: "#fef2f2", color: "#ef4444" }
              : { backgroundColor: "#eff6ff", color: "#00217E" }}
          >
            {countdown}
          </span>
        </div>
      )}
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
            className={`px-5 py-2 rounded-full text-xs font-bold tracking-wider transition-opacity hover:opacity-80${!prediction ? " btn-predict" : ""}`}
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

function FinishedRow({ match }: { match: Match & { elapsed?: number | null } }) {
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
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
              {match.elapsed != null ? `${match.elapsed}'` : "En curso"}
            </span>
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
  const [stats, setStats] = useState<{ homeWin: number; draw: number; awayWin: number; total: number } | null>(null);

  useEffect(() => {
    fetch(`/api/predictions/stats?matchId=${match.id}`)
      .then((r) => r.json())
      .then((data) => { if (data.total !== undefined) setStats(data); });
  }, [match.id]);

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
              <span className="text-xs text-gray-400">{stats ? `${stats.total} votos` : "—"}</span>
            </div>

            {stats && stats.total === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">Nadie predijo este partido todavía.</p>
            ) : stats ? (
              <>
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
            </>
            ) : (
              <div className="h-2.5 bg-gray-200 rounded-full animate-pulse mb-3" />
            )}
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
function MatchInfoModal({ match, onClose, prediction }: { match: Match; onClose: () => void; prediction?: Prediction }) {
  const [stats, setStats] = useState<{ homeWin: number; draw: number; awayWin: number; total: number } | null>(null);
  const isLive = match.status === "live";

  useEffect(() => {
    fetch(`/api/predictions/stats?matchId=${match.id}`)
      .then((r) => r.json())
      .then((data) => { if (data.total !== undefined) setStats(data); });
  }, [match.id]);

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
              {prediction && (
                <span className="text-[11px] text-gray-400 mt-0.5">
                  Tu predicción: {prediction.homeScore}–{prediction.awayScore}
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
              <span className="text-xs text-gray-400">{stats ? `${stats.total} votos` : "—"}</span>
            </div>
            {!stats ? (
              <div className="h-2.5 bg-gray-200 rounded-full animate-pulse mb-3" />
            ) : stats.total === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">Nadie predijo este partido.</p>
            ) : (
              <>
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
              </>
            )}
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
