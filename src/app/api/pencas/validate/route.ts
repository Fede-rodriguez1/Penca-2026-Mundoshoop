import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Código requerido" }, { status: 400 });

  const penca = await prisma.penca.findUnique({
    where: { code: code.toUpperCase() },
    select: { id: true, name: true, code: true },
  });

  if (!penca) return NextResponse.json({ error: "Código inválido" }, { status: 404 });

  return NextResponse.json(penca);
}
