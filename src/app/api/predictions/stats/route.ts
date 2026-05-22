import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const matchId = req.nextUrl.searchParams.get("matchId");
  if (!matchId) {
    return NextResponse.json({ error: "matchId requerido" }, { status: 400 });
  }

  // Obtener la penca del usuario logueado para filtrar solo sus compañeros
  const session = await getServerSession(authOptions);
  let pencaId: string | null = null;
  if (session?.user?.id) {
    const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { pencaId: true } });
    pencaId = me?.pencaId ?? null;
  }

  const predictions = await prisma.prediction.findMany({
    where: {
      matchId,
      ...(pencaId ? { user: { pencaId } } : {}),
    },
    select: { homeScore: true, awayScore: true },
  });

  const total = predictions.length;
  if (total === 0) {
    return NextResponse.json({ homeWin: 0, draw: 0, awayWin: 0, total: 0 });
  }

  let homeWin = 0, draw = 0, awayWin = 0;
  for (const p of predictions) {
    if (p.homeScore > p.awayScore) homeWin++;
    else if (p.homeScore === p.awayScore) draw++;
    else awayWin++;
  }

  return NextResponse.json({
    homeWin: Math.round((homeWin / total) * 100),
    draw: Math.round((draw / total) * 100),
    awayWin: Math.round((awayWin / total) * 100),
    total,
  });
}
