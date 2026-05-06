import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/isAdmin";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { scope } = await req.json();

  if (scope === "results") {
    // Borra todos los resultados — el dashboard vuelve a usar status de fixture.ts
    await prisma.matchResult.deleteMany();
    return NextResponse.json({ ok: true, deleted: "results" });
  }

  if (scope === "predictions") {
    await prisma.prediction.deleteMany();
    return NextResponse.json({ ok: true, deleted: "predictions" });
  }

  if (scope === "all") {
    // Borra resultados y predicciones — los usuarios quedan intactos
    await prisma.matchResult.deleteMany();
    await prisma.prediction.deleteMany();
    return NextResponse.json({ ok: true, deleted: "all" });
  }

  return NextResponse.json({ error: "scope inválido (results | predictions | all)" }, { status: 400 });
}
