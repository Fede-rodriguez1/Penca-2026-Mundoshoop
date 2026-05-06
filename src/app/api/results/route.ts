import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const results = await prisma.matchResult.findMany({
    select: { matchId: true, homeScore: true, awayScore: true, elapsed: true, status: true },
  });

  return NextResponse.json(results);
}
