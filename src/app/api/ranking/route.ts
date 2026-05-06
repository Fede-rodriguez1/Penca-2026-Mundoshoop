import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { matches } from "@/data/fixture";
import { calcPoints } from "@/lib/scoring";

export async function GET(req: NextRequest) {
  try {
  const dbResults = await prisma.matchResult.findMany();
  const dbResultMap = new Map(dbResults.map((r) => [r.matchId, r]));

  const scoredMatches = matches
    .map((m) => {
      const dbResult = dbResultMap.get(m.id);
      if (dbResult) return { ...m, homeScore: dbResult.homeScore, awayScore: dbResult.awayScore, status: dbResult.status as "live" | "finished" };
      if (m.status === "finished" && m.homeScore !== undefined && m.awayScore !== undefined) return m;
      return null;
    })
    .filter(Boolean) as typeof matches;

  const hasLive = scoredMatches.some((m) => m.status === "live");

  // Filtrar por penca del usuario logueado
  const session = await getServerSession(authOptions);
  let pencaId: string | null = null;
  if (session?.user?.id) {
    const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { pencaId: true } });
    pencaId = me?.pencaId ?? null;
  }

  const users = await prisma.user.findMany({
    where: pencaId ? { pencaId } : {},
    include: { predictions: true },
  });

  const ranking = users
    .map((user) => {
      let points = 0;
      let exact = 0;
      let correct = 0;

      for (const match of scoredMatches) {
        const pred = user.predictions.find((p) => p.matchId === match.id);
        if (!pred) continue;
        const pts = calcPoints(pred.homeScore, pred.awayScore, match.homeScore!, match.awayScore!);
        points += pts;
        if (pts === 8) exact++;
        if (pts >= 3) correct++;
      }

      const initials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
      return {
        id: user.id,
        name: user.name,
        initials,
        avatarColor: user.avatarColor,
        points,
        exact,
        correct,
        predictions: user.predictions.length,
      };
    })
    .sort((a, b) => b.points - a.points || b.exact - a.exact)
    .map((u, i) => ({ ...u, pos: i + 1 }));

  return NextResponse.json({ ranking, hasLive });
  } catch (e) {
    console.error("[ranking] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
