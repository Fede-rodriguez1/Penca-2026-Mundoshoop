import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/isAdmin";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const pencas = await prisma.penca.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { users: true } },
      users: { select: { id: true, name: true, email: true, ci: true, phone: true, createdAt: true }, orderBy: { createdAt: "asc" } },
    },
  });

  return NextResponse.json(pencas);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { name, code } = await req.json();

  if (!name?.trim() || !code?.trim()) {
    return NextResponse.json({ error: "Nombre y código son obligatorios" }, { status: 400 });
  }

  const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, "");

  const existing = await prisma.penca.findUnique({ where: { code: normalizedCode } });
  if (existing) {
    return NextResponse.json({ error: "Ya existe una penca con ese código" }, { status: 409 });
  }

  const penca = await prisma.penca.create({
    data: { name: name.trim(), code: normalizedCode },
  });

  return NextResponse.json(penca, { status: 201 });
}
