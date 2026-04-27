import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const matchId = req.nextUrl.searchParams.get("matchId");
  if (!matchId) {
    return NextResponse.json({ error: "matchId requerido" }, { status: 400 });
  }

  const predictions = await prisma.prediction.findMany({
    where: { matchId },
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
