import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { name, email, password, pencaCode } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Todos los campos son obligatorios" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
  }

  // Resolver la penca — si viene código lo usamos, si no la default
  const penca = pencaCode
    ? await prisma.penca.findUnique({ where: { code: pencaCode.toUpperCase() } })
    : await prisma.penca.findFirst({ where: { isDefault: true } });

  if (!penca) {
    return NextResponse.json({ error: "Código de penca inválido" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Ya existe una cuenta con ese email" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, pencaId: penca.id },
  });

  return NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 });
}
