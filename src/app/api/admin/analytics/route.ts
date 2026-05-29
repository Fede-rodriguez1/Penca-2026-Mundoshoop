import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/isAdmin";
import { matches } from "@/data/fixture";

const TOTAL_MATCHES = matches.length;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const [pencas, users, predictions, events] = await Promise.all([
    prisma.penca.findMany({
      select: { id: true, name: true, _count: { select: { users: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, pencaId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.prediction.findMany({
      select: { userId: true, createdAt: true },
    }),
    prisma.event.findMany({
      select: { type: true, duration: true },
    }),
  ]);

  // Predicciones por usuario
  const predCountByUser = new Map<string, number>();
  for (const p of predictions) {
    predCountByUser.set(p.userId, (predCountByUser.get(p.userId) ?? 0) + 1);
  }

  // Registros por día
  const regByDay = new Map<string, number>();
  for (const u of users) {
    const day = u.createdAt.toISOString().slice(0, 10);
    regByDay.set(day, (regByDay.get(day) ?? 0) + 1);
  }
  const registrationsByDay = Array.from(regByDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));

  // Engagement global
  const totalUsers = users.length;
  const usersWithPredictions = users.filter(u => (predCountByUser.get(u.id) ?? 0) > 0).length;
  const totalPredictions = predictions.length;
  const avgPredictions = totalUsers > 0 ? Math.round((totalPredictions / totalUsers) * 10) / 10 : 0;
  const avgCompletion = totalUsers > 0 ? Math.round((totalPredictions / (totalUsers * TOTAL_MATCHES)) * 100) : 0;

  // Por penca
  const pencaStats = pencas.map(p => {
    const pencaUsers = users.filter(u => u.pencaId === p.id);
    const pencaPreds = pencaUsers.reduce((acc, u) => acc + (predCountByUser.get(u.id) ?? 0), 0);
    const pencaActive = pencaUsers.filter(u => (predCountByUser.get(u.id) ?? 0) > 0).length;
    return {
      id: p.id,
      name: p.name,
      totalUsers: pencaUsers.length,
      activeUsers: pencaActive,
      totalPredictions: pencaPreds,
      avgCompletion: pencaUsers.length > 0
        ? Math.round((pencaPreds / (pencaUsers.length * TOTAL_MATCHES)) * 100)
        : 0,
    };
  });

  // Top 10 usuarios más activos
  const topUsers = users
    .map(u => ({
      name: u.name,
      email: u.email,
      pencaId: u.pencaId,
      pencaName: pencas.find(p => p.id === u.pencaId)?.name ?? "—",
      predictions: predCountByUser.get(u.id) ?? 0,
      completion: Math.round(((predCountByUser.get(u.id) ?? 0) / TOTAL_MATCHES) * 100),
    }))
    .sort((a, b) => b.predictions - a.predictions)
    .slice(0, 10);

  // Distribución de actividad
  const dist = { inactive: 0, low: 0, mid: 0, high: 0 };
  for (const u of users) {
    const n = predCountByUser.get(u.id) ?? 0;
    if (n === 0) dist.inactive++;
    else if (n <= 10) dist.low++;
    else if (n <= 50) dist.mid++;
    else dist.high++;
  }

  // Eventos: clicks y sesiones
  const clickMl = events.filter(e => e.type === "click_ml").length;
  const clickInstagram = events.filter(e => e.type === "click_instagram").length;
  const sessionEvents = events.filter(e => e.type === "session" && typeof e.duration === "number");
  const avgSessionSeconds = sessionEvents.length > 0
    ? Math.round(sessionEvents.reduce((acc, e) => acc + (e.duration ?? 0), 0) / sessionEvents.length)
    : 0;

  return NextResponse.json({
    totalMatches: TOTAL_MATCHES,
    totalUsers,
    usersWithPredictions,
    totalPredictions,
    avgPredictions,
    avgCompletion,
    pencaStats,
    registrationsByDay,
    topUsers,
    distribution: dist,
    clickMl,
    clickInstagram,
    avgSessionSeconds,
    totalSessions: sessionEvents.length,
  });
}
