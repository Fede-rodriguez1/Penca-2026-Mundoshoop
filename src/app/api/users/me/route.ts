import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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

  const { name, avatarColor, pencaId } = await req.json();

  // Cambio de penca (sin requerir nombre)
  if (pencaId !== undefined) {
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { pencaId: pencaId === null ? null : pencaId },
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
