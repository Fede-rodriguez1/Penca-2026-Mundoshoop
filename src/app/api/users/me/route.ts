import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/isAdmin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, provider: true, avatarColor: true, penca: { select: { id: true, name: true, code: true } } },
  });

  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { name, avatarColor, pencaId, pencaCode } = await req.json();

  // Cambio de penca — admin puede hacerlo directo por ID, usuarios comunes necesitan el código
  if (pencaId !== undefined || pencaCode !== undefined) {
    let targetPencaId: string | null = null;

    if (isAdmin(session.user.email)) {
      // Admin puede cambiar por ID directamente
      targetPencaId = pencaId === null ? null : pencaId;
    } else if (pencaCode) {
      // Usuario común debe presentar el código válido
      const penca = await prisma.penca.findUnique({ where: { code: pencaCode.toUpperCase() } });
      if (!penca) return NextResponse.json({ error: "Código de penca inválido" }, { status: 400 });
      targetPencaId = penca.id;
    } else {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { pencaId: targetPencaId },
      select: { id: true, name: true, email: true, provider: true, avatarColor: true, penca: { select: { id: true, name: true, code: true } } },
    });
    return NextResponse.json(user);
  }

  if (!name?.trim()) return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { name: name.trim(), ...(avatarColor ? { avatarColor } : {}) },
    select: { id: true, name: true, email: true, provider: true, avatarColor: true },
  });

  return NextResponse.json(user);
}
