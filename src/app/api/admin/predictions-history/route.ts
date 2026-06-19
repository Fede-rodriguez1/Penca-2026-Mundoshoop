import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/isAdmin";

// GET: ver historial de cambios de un partido
// ?matchId=D4
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const matchId = req.nextUrl.searchParams.get("matchId");
  if (!matchId) {
    return NextResponse.json({ error: "matchId requerido" }, { status: 400 });
  }

  const predictions = await prisma.prediction.findMany({
    where: { matchId },
    include: {
      user: { select: { name: true, email: true, penca: { select: { name: true } } } },
      history: { orderBy: { changedAt: "desc" } },
    },
  });

  const result = predictions
    .filter((p) => p.history.length > 0)
    .map((p) => ({
      predictionId: p.id,
      user: p.user.name,
      email: p.user.email,
      penca: p.user.penca?.name ?? "Sin penca",
      current: { homeScore: p.homeScore, awayScore: p.awayScore, updatedAt: p.updatedAt },
      history: p.history.map((h) => ({
        homeScore: h.homeScore,
        awayScore: h.awayScore,
        changedAt: h.changedAt,
      })),
    }));

  return NextResponse.json(result);
}

// POST: revertir una predicción a un valor del historial
// body: { predictionId, historyId }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { predictionId, historyId } = await req.json();

  const history = await prisma.predictionHistory.findUnique({
    where: { id: historyId },
  });

  if (!history || history.predictionId !== predictionId) {
    return NextResponse.json({ error: "Historial no encontrado" }, { status: 404 });
  }

  // Guardar el valor actual en historial antes de revertir
  const current = await prisma.prediction.findUnique({ where: { id: predictionId } });
  if (!current) {
    return NextResponse.json({ error: "Predicción no encontrada" }, { status: 404 });
  }

  await prisma.predictionHistory.create({
    data: {
      predictionId,
      homeScore: current.homeScore,
      awayScore: current.awayScore,
    },
  });

  const updated = await prisma.prediction.update({
    where: { id: predictionId },
    data: { homeScore: history.homeScore, awayScore: history.awayScore },
  });

  return NextResponse.json({ reverted: true, prediction: updated });
}
