import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { matches } from "@/data/fixture";
import { calcPoints } from "@/lib/scoring";

export async function GET() {
  const finishedMatches = matches.filter(
    (m) => m.status === "finished" && m.homeScore !== undefined && m.awayScore !== undefined
  );

  const users = await prisma.user.findMany({
    include: { predictions: true },
  });

  const ranking = users
    .map((user) => {
      let points = 0;
      let exact = 0;
      let correct = 0;

      for (const match of finishedMatches) {
        const pred = user.predictions.find((p) => p.matchId === match.id);
        if (!pred) continue;
        const pts = calcPoints(pred.homeScore, pred.awayScore, match.homeScore!, match.awayScore!);
        points += pts;
        if (pts === 3) exact++;
        if (pts >= 1) correct++;
      }

      const initials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
      return {
        id: user.id,
        name: user.name,
        initials,
        points,
        exact,
        correct,
        predictions: user.predictions.length,
      };
    })
    .sort((a, b) => b.points - a.points || b.exact - a.exact)
    .map((u, i) => ({ ...u, pos: i + 1 }));

  return NextResponse.json(ranking);
}
