import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { matches } from "@/data/fixture";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const predictions = await prisma.prediction.findMany({
    where: { userId: session.user.id },
  });

  return NextResponse.json(predictions);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { matchId, homeScore, awayScore } = await req.json();

  if (matchId === undefined || homeScore === undefined || awayScore === undefined) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const match = matches.find((m) => m.id === matchId);
  if (!match) {
    return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
  }

  // Verificar status real en DB (el fixture.ts queda siempre "upcoming")
  const dbResult = await prisma.matchResult.findUnique({ where: { matchId } });
  if (dbResult || match.status !== "upcoming") {
    return NextResponse.json({ error: "El partido ya no acepta predicciones" }, { status: 400 });
  }

  // Guardar historial si ya existe una predicción con valores distintos
  const existing = await prisma.prediction.findUnique({
    where: { userId_matchId: { userId: session.user.id, matchId } },
  });

  if (existing && (existing.homeScore !== homeScore || existing.awayScore !== awayScore)) {
    await prisma.predictionHistory.create({
      data: {
        predictionId: existing.id,
        homeScore: existing.homeScore,
        awayScore: existing.awayScore,
      },
    });
  }

  const prediction = await prisma.prediction.upsert({
    where: { userId_matchId: { userId: session.user.id, matchId } },
    update: { homeScore, awayScore },
    create: { userId: session.user.id, matchId, homeScore, awayScore },
  });

  return NextResponse.json(prediction);
}
