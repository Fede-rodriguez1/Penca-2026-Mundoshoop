"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { matches, groupByDate, formatDate } from "@/data/fixture";
import { QRCodeCanvas } from "qrcode.react";

type MatchResult = { matchId: string; homeScore: number; awayScore: number };
type PencaUser = { id: string; name: string; email: string; ci: string | null; phone: string | null; createdAt: string };
type Penca = { id: string; name: string; code: string; isDefault: boolean; _count: { users: number }; users: PencaUser[] };
type Analytics = {
  totalMatches: number;
  totalUsers: number;
  usersWithPredictions: number;
  totalPredictions: number;
  avgPredictions: number;
  avgCompletion: number;
  pencaStats: { id: string; name: string; totalUsers: number; activeUsers: number; totalPredictions: number; avgCompletion: number }[];
  registrationsByDay: { date: string; count: number }[];
  topUsers: { name: string; email: string; pencaName: string; predictions: number; completion: number }[];
  distribution: { inactive: number; low: number; mid: number; high: number };
  clickMl: number;
  clickInstagram: number;
  avgSessionSeconds: number;
  totalSessions: number;
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Resultados
  const [results, setResults] = useState<MatchResult[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, { home: number; away: number }>>({});

  // Pencas
  const [pencas, setPencas] = useState<Penca[]>([]);
  const [newPencaName, setNewPencaName] = useState("");
  const [newPencaCode, setNewPencaCode] = useState("");
  const [pencaError, setPencaError] = useState("");
  const [pencaSaving, setPencaSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"matches" | "pencas" | "analytics" | "reset">("matches");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState<string | null>(null);
  const [myPencaId, setMyPencaId] = useState<string | null>(null);
  const [switchingPenca, setSwitchingPenca] = useState(false);
  const [expandedPenca, setExpandedPenca] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

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
    fetch("/api/admin/pencas")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setPencas(data); });
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((data) => { if (data?.penca?.id) setMyPencaId(data.penca.id); });
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((data) => { if (data?.totalUsers !== undefined) setAnalytics(data); });
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

  async function createPenca(e: React.FormEvent) {
    e.preventDefault();
    setPencaError("");
    setPencaSaving(true);
    const res = await fetch("/api/admin/pencas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newPencaName, code: newPencaCode }),
    });
    const data = await res.json();
    setPencaSaving(false);
    if (!res.ok) { setPencaError(data.error ?? "Error al crear la penca"); return; }
    setPencas((prev) => [...prev, { ...data, _count: { users: 0 } }]);
    setNewPencaName("");
    setNewPencaCode("");
  }

  async function switchPenca(pencaId: string) {
    setSwitchingPenca(true);
    await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pencaId }),
    });
    setMyPencaId(pencaId);
    setSwitchingPenca(false);
  }

  async function doReset(scope: "results" | "predictions" | "all") {
    setResetting(scope);
    setResetDone(null);
    await fetch("/api/admin/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope }),
    });
    if (scope === "results" || scope === "all") {
      setResults([]);
      setScores({});
    }
    setResetting(null);
    setResetDone(scope);
    setTimeout(() => setResetDone(null), 3000);
  }

  const registerUrl = (code: string) =>
    `${typeof window !== "undefined" ? window.location.origin : ""}/login?code=${code}`;

  function downloadQR(code: string, name: string) {
    const canvas = document.getElementById(`qr-${code}`) as HTMLCanvasElement;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-penca-${name.toLowerCase().replace(/\s+/g, "-")}.png`;
    a.click();
  }

  const upcoming = matches.filter((m) => m.status === "upcoming" || m.status === "live");
  const byDate = groupByDate(upcoming);
  const dates = Object.keys(byDate).sort();

  if (status === "loading") return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f3f4f6" }}>
      {/* Header */}
      <header className="px-5 h-16 flex items-center justify-between" style={{ backgroundColor: "#00217E" }}>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mundoshop-logo.png" alt="Mundo Shop" className="h-7 w-auto object-contain" />
          <span className="text-sm font-bold text-white opacity-60">Panel de Admin</span>
        </div>
        <button onClick={() => router.push("/dashboard")} className="text-sm font-semibold text-white opacity-80 hover:opacity-100 transition-opacity">
          Volver al dashboard
        </button>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-5">
        <div className="flex gap-1 py-2">
          {(["matches", "pencas", "analytics", "reset"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={
                activeTab === t
                  ? { backgroundColor: t === "reset" ? "#dc2626" : "#00217E", color: "white" }
                  : { color: t === "reset" ? "#dc2626" : "#6b7280" }
              }
            >
              {t === "matches" ? "Resultados" : t === "pencas" ? "Pencas" : t === "analytics" ? "Analytics" : "Reset"}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* ── Tab Resultados ── */}
        {activeTab === "matches" && (
          <>
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
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}>Cargado</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 flex-1">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={match.home.shield} alt={match.home.name} className="w-8 h-8 object-contain" />
                              <span className="text-sm font-bold text-gray-700 truncate">{match.home.shortName}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <input type="number" min={0} max={20} value={score.home}
                                onChange={(e) => setScores((prev) => ({ ...prev, [match.id]: { ...score, home: Math.max(0, parseInt(e.target.value) || 0) } }))}
                                className="w-12 h-12 text-center text-xl font-black border-2 rounded-xl focus:outline-none"
                                style={{ borderColor: "#00217E", color: "#00217E" }} />
                              <span className="text-gray-300 font-bold">—</span>
                              <input type="number" min={0} max={20} value={score.away}
                                onChange={(e) => setScores((prev) => ({ ...prev, [match.id]: { ...score, away: Math.max(0, parseInt(e.target.value) || 0) } }))}
                                className="w-12 h-12 text-center text-xl font-black border-2 rounded-xl focus:outline-none"
                                style={{ borderColor: "#00217E", color: "#00217E" }} />
                            </div>
                            <div className="flex items-center gap-2 flex-1 justify-end">
                              <span className="text-sm font-bold text-gray-700 truncate">{match.away.shortName}</span>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={match.away.shield} alt={match.away.name} className="w-8 h-8 object-contain" />
                            </div>
                          </div>
                          <button onClick={() => saveResult(match.id)} disabled={isSaving}
                            className="w-full mt-3 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity"
                            style={{ backgroundColor: "#00217E", opacity: isSaving ? 0.6 : 1 }}>
                            {isSaving ? "Guardando..." : existing ? "Actualizar resultado" : "Guardar resultado"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── Tab Pencas ── */}
        {activeTab === "pencas" && (
          <>
            {/* Mi penca activa */}
            {pencas.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h2 className="text-sm font-bold mb-3" style={{ color: "#00217E" }}>Mi penca activa</h2>
                <p className="text-xs text-gray-400 mb-3">Cambiá de penca para ver el ranking y las predicciones desde esa perspectiva.</p>
                <div className="flex flex-col gap-2">
                  {pencas.map((penca) => (
                    <button
                      key={penca.id}
                      onClick={() => switchPenca(penca.id)}
                      disabled={switchingPenca || myPencaId === penca.id}
                      className="flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left"
                      style={
                        myPencaId === penca.id
                          ? { borderColor: "#00217E", backgroundColor: "#eff6ff" }
                          : { borderColor: "#e5e7eb", backgroundColor: "white" }
                      }
                    >
                      <div>
                        <p className="text-sm font-bold text-gray-800">{penca.name}</p>
                        <p className="text-xs text-gray-400">{penca.code} · {penca._count.users} usuarios</p>
                      </div>
                      {myPencaId === penca.id && (
                        <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: "#00217E", color: "white" }}>Activa</span>
                      )}
                    </button>
                  ))}
                </div>
                {switchingPenca && <p className="text-xs text-gray-400 mt-2 text-center">Cambiando...</p>}
              </div>
            )}

            {/* Crear penca */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h2 className="text-sm font-bold mb-4" style={{ color: "#00217E" }}>Nueva penca</h2>
              <form onSubmit={createPenca} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={newPencaName}
                    onChange={(e) => setNewPencaName(e.target.value)}
                    placeholder="Ej: Empleados, Clientes"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
                    style={{ "--tw-ring-color": "#00217E" } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Código de acceso</label>
                  <input
                    type="text"
                    required
                    value={newPencaCode}
                    onChange={(e) => setNewPencaCode(e.target.value.toUpperCase())}
                    placeholder="Ej: EMPLEADOS2026"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2"
                    style={{ "--tw-ring-color": "#00217E" } as React.CSSProperties}
                  />
                  <p className="text-xs text-gray-400 mt-1">Este código va en el QR de registro. Solo letras y números, sin espacios.</p>
                </div>
                {pencaError && <p className="text-xs text-red-500">{pencaError}</p>}
                <button type="submit" disabled={pencaSaving}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: "#00217E", opacity: pencaSaving ? 0.6 : 1 }}>
                  {pencaSaving ? "Creando..." : "Crear penca"}
                </button>
              </form>
            </div>

            {/* Lista de pencas */}
            {pencas.length > 0 && (
              <div className="space-y-3">
                {pencas.map((penca) => (
                  <div key={penca.id} className="bg-white rounded-2xl shadow-sm p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-900">{penca.name}</p>
                          {penca.isDefault && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#fef9c3", color: "#854d0e" }}>Default</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{penca._count.users} participante{penca._count.users !== 1 ? "s" : ""}</p>
                      </div>
                      <span className="text-xs font-mono font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: "#f3f4f6", color: "#00217E" }}>{penca.code}</span>
                    </div>

                    {/* QR */}
                    <div className="flex flex-col items-center gap-3 py-4 rounded-xl mb-4" style={{ backgroundColor: "#f9fafb" }}>
                      <QRCodeCanvas
                        id={`qr-${penca.code}`}
                        value={registerUrl(penca.code)}
                        size={400}
                        bgColor="#ffffff"
                        fgColor="#00217E"
                        level="H"
                        imageSettings={{
                          src: "/mundoshop-logo-dark.png",
                          x: undefined,
                          y: undefined,
                          height: 40,
                          width: 120,
                          excavate: true,
                        }}
                        style={{ width: 180, height: 180 }}
                      />
                      <button
                        onClick={() => downloadQR(penca.code, penca.name)}
                        className="flex items-center gap-1.5 text-xs font-semibold hover:opacity-70 transition-opacity"
                        style={{ color: "#00217E" }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Descargar QR
                      </button>
                    </div>

                    {/* Link de registro */}
                    <div className="flex items-center gap-2 p-2.5 rounded-xl mb-3" style={{ backgroundColor: "#f3f4f6" }}>
                      <p className="text-xs text-gray-400 flex-1 truncate">{registerUrl(penca.code)}</p>
                      <button
                        onClick={() => navigator.clipboard.writeText(registerUrl(penca.code))}
                        className="text-xs font-semibold flex-shrink-0 hover:opacity-70 transition-opacity"
                        style={{ color: "#00217E" }}
                      >
                        Copiar link
                      </button>
                    </div>

                    {/* Inscriptos */}
                    <button
                      onClick={() => setExpandedPenca(expandedPenca === penca.id ? null : penca.id)}
                      className="w-full flex items-center justify-between px-1 py-1"
                    >
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                        Inscriptos ({penca._count.users})
                      </span>
                      <span className="text-gray-400 text-xs">{expandedPenca === penca.id ? "▲" : "▼"}</span>
                    </button>

                    {expandedPenca === penca.id && (
                      <div className="mt-2 rounded-xl overflow-hidden border border-gray-100">
                        {penca.users.length === 0 ? (
                          <p className="text-xs text-gray-400 px-4 py-3">Nadie inscripto todavía</p>
                        ) : (
                          penca.users.map((user, idx) => (
                            <div key={user.id}>
                              {idx > 0 && <div className="h-px bg-gray-50" />}
                              <div className="flex items-center justify-between px-4 py-2.5 gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-gray-800">{user.name}</p>
                                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                  {(user.ci || user.phone) && (
                                    <p className="text-xs text-gray-300 mt-0.5">
                                      {user.ci && <span>CI: {user.ci}</span>}
                                      {user.ci && user.phone && <span className="mx-1">·</span>}
                                      {user.phone && <span>📱 {user.phone}</span>}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <p className="text-xs text-gray-300">
                                    {new Date(user.createdAt).toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit" })}
                                  </p>
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`¿Eliminar a ${user.name}? Esta acción no se puede deshacer.`)) return;
                                      setDeletingUser(user.id);
                                      await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
                                      setPencas(prev => prev.map(p => p.id === penca.id
                                        ? { ...p, users: p.users.filter(u => u.id !== user.id), _count: { users: p._count.users - 1 } }
                                        : p
                                      ));
                                      setDeletingUser(null);
                                    }}
                                    disabled={deletingUser === user.id}
                                    className="text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40"
                                    title="Eliminar usuario"
                                  >
                                    {deletingUser === user.id ? "..." : "✕"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Tab Analytics ── */}
        {activeTab === "analytics" && (
          <div className="space-y-4">
            {!analytics ? (
              <p className="text-xs text-gray-400 text-center py-8">Cargando...</p>
            ) : (
              <>
                {/* Cards globales */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Usuarios totales", value: analytics.totalUsers },
                    { label: "Con predicciones", value: analytics.usersWithPredictions },
                    { label: "Predicciones totales", value: analytics.totalPredictions },
                    { label: "Completitud promedio", value: `${analytics.avgCompletion}%` },
                  ].map((c) => (
                    <div key={c.label} className="bg-white rounded-2xl shadow-sm p-4">
                      <p className="text-xs text-gray-400 mb-1">{c.label}</p>
                      <p className="text-2xl font-black" style={{ color: "#00217E" }}>{c.value}</p>
                    </div>
                  ))}
                </div>

                {/* Engagement — clicks y sesiones */}
                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <h2 className="text-sm font-bold mb-3" style={{ color: "#00217E" }}>Engagement</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: "#FFCA6120" }}>
                      <p className="text-xs text-gray-400 mb-1">Clicks Mercado Libre</p>
                      <p className="text-2xl font-black" style={{ color: "#FF8C00" }}>{analytics.clickMl}</p>
                    </div>
                    <div className="p-3 rounded-xl" style={{ backgroundColor: "#e040fb18" }}>
                      <p className="text-xs text-gray-400 mb-1">Clicks Instagram</p>
                      <p className="text-2xl font-black" style={{ color: "#c2185b" }}>{analytics.clickInstagram}</p>
                    </div>
                    <div className="p-3 rounded-xl" style={{ backgroundColor: "#eff6ff" }}>
                      <p className="text-xs text-gray-400 mb-1">Sesiones registradas</p>
                      <p className="text-2xl font-black" style={{ color: "#00217E" }}>{analytics.totalSessions}</p>
                    </div>
                    <div className="p-3 rounded-xl" style={{ backgroundColor: "#f0fdf4" }}>
                      <p className="text-xs text-gray-400 mb-1">Tiempo promedio</p>
                      <p className="text-2xl font-black" style={{ color: "#16a34a" }}>
                        {analytics.avgSessionSeconds >= 60
                          ? `${Math.floor(analytics.avgSessionSeconds / 60)}m ${analytics.avgSessionSeconds % 60}s`
                          : `${analytics.avgSessionSeconds}s`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Por penca */}
                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <h2 className="text-sm font-bold mb-3" style={{ color: "#00217E" }}>Por penca</h2>
                  <div className="space-y-3">
                    {analytics.pencaStats.map((p) => (
                      <div key={p.id} className="p-3 rounded-xl bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-bold text-gray-800">{p.name}</p>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#eff6ff", color: "#00217E" }}>
                            {p.totalUsers} usuarios
                          </span>
                        </div>
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>Activos: <b className="text-gray-800">{p.activeUsers}</b></span>
                          <span>Predicciones: <b className="text-gray-800">{p.totalPredictions}</b></span>
                          <span>Completitud: <b className="text-gray-800">{p.avgCompletion}%</b></span>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${p.avgCompletion}%`, backgroundColor: "#00217E" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Distribución de actividad */}
                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <h2 className="text-sm font-bold mb-3" style={{ color: "#00217E" }}>Distribución de actividad</h2>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { label: "Sin predicciones", value: analytics.distribution.inactive, color: "#e5e7eb" },
                      { label: "1–10 partidos", value: analytics.distribution.low, color: "#FFCA61" },
                      { label: "11–50 partidos", value: analytics.distribution.mid, color: "#00217E" },
                      { label: "51+ partidos", value: analytics.distribution.high, color: "#16a34a" },
                    ].map((d) => (
                      <div key={d.label} className="p-3 rounded-xl" style={{ backgroundColor: `${d.color}18` }}>
                        <p className="text-xl font-black" style={{ color: d.color === "#e5e7eb" ? "#9ca3af" : d.color }}>{d.value}</p>
                        <p className="text-xs text-gray-400 mt-0.5 leading-tight">{d.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Registros por día */}
                {analytics.registrationsByDay.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm p-5">
                    <h2 className="text-sm font-bold mb-3" style={{ color: "#00217E" }}>Registros por día</h2>
                    <div className="space-y-1.5">
                      {analytics.registrationsByDay.map((d) => {
                        const max = Math.max(...analytics.registrationsByDay.map(x => x.count));
                        return (
                          <div key={d.date} className="flex items-center gap-3">
                            <span className="text-xs text-gray-400 w-24 flex-shrink-0">{d.date.slice(5)}</span>
                            <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${(d.count / max) * 100}%`, backgroundColor: "#00217E" }} />
                            </div>
                            <span className="text-xs font-bold text-gray-700 w-4 text-right">{d.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Top usuarios */}
                {analytics.topUsers.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-50">
                      <h2 className="text-sm font-bold" style={{ color: "#00217E" }}>Top usuarios más activos</h2>
                    </div>
                    {analytics.topUsers.map((u, idx) => (
                      <div key={u.email}>
                        {idx > 0 && <div className="h-px bg-gray-50" />}
                        <div className="flex items-center gap-3 px-5 py-3">
                          <span className="text-xs font-bold w-4 text-gray-300">{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{u.name}</p>
                            <p className="text-xs text-gray-400 truncate">{u.pencaName}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-bold" style={{ color: "#00217E" }}>{u.predictions} pred.</p>
                            <p className="text-xs text-gray-400">{u.completion}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Tab Reset ── */}
        {activeTab === "reset" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-5 border-2 border-red-100">
              <h2 className="text-sm font-bold text-red-600 mb-1">Zona de pruebas</h2>
              <p className="text-xs text-gray-400 mb-5">Usá estos botones entre tests para limpiar datos y empezar de cero. Los usuarios registrados no se borran.</p>

              {resetDone && (
                <div className="mb-4 px-4 py-3 rounded-xl text-sm font-semibold text-green-700" style={{ backgroundColor: "#dcfce7" }}>
                  ✓ Reset completado
                </div>
              )}

              <div className="space-y-3">
                {/* Resultados */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
                  <div>
                    <p className="text-sm font-bold text-gray-800">Resultados</p>
                    <p className="text-xs text-gray-400 mt-0.5">Borra los scores y status de todos los partidos. Los partidos vuelven a verse como "próximos".</p>
                  </div>
                  <button
                    onClick={() => { if (confirm("¿Borrar todos los resultados?")) doReset("results"); }}
                    disabled={resetting !== null}
                    className="ml-4 flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold text-white transition-opacity"
                    style={{ backgroundColor: "#f97316", opacity: resetting !== null ? 0.5 : 1 }}
                  >
                    {resetting === "results" ? "Borrando..." : "Limpiar"}
                  </button>
                </div>

                {/* Predicciones */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
                  <div>
                    <p className="text-sm font-bold text-gray-800">Predicciones</p>
                    <p className="text-xs text-gray-400 mt-0.5">Borra todas las predicciones de todos los usuarios. El ranking vuelve a cero.</p>
                  </div>
                  <button
                    onClick={() => { if (confirm("¿Borrar todas las predicciones?")) doReset("predictions"); }}
                    disabled={resetting !== null}
                    className="ml-4 flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold text-white transition-opacity"
                    style={{ backgroundColor: "#f97316", opacity: resetting !== null ? 0.5 : 1 }}
                  >
                    {resetting === "predictions" ? "Borrando..." : "Limpiar"}
                  </button>
                </div>

                {/* Todo */}
                <div className="flex items-center justify-between p-4 rounded-xl border-2 border-red-200 bg-red-50">
                  <div>
                    <p className="text-sm font-bold text-red-700">Reset completo</p>
                    <p className="text-xs text-red-400 mt-0.5">Borra resultados + predicciones. Reset total para el siguiente test.</p>
                  </div>
                  <button
                    onClick={() => { if (confirm("¿Reset completo? Se borran resultados y todas las predicciones.")) doReset("all"); }}
                    disabled={resetting !== null}
                    className="ml-4 flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold text-white transition-opacity"
                    style={{ backgroundColor: "#dc2626", opacity: resetting !== null ? 0.5 : 1 }}
                  >
                    {resetting === "all" ? "Borrando..." : "Reset todo"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
