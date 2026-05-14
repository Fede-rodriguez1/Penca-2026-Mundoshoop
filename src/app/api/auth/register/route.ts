import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Rate limiting: máx 5 registros por IP cada hora
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Demasiados intentos. Esperá un momento." }, { status: 429 });
  }

  const { name, email, password, pencaCode, ci, phone } = await req.json();

  if (!name || !email || !password || !ci || !phone) {
    return NextResponse.json({ error: "Todos los campos son obligatorios" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
  }

  if (!/^\d{6,8}$/.test(ci.replace(/[.\-]/g, ""))) {
    return NextResponse.json({ error: "Cédula inválida" }, { status: 400 });
  }

  if (!/^\d{8,15}$/.test(phone.replace(/[\s\-\+\(\)]/g, ""))) {
    return NextResponse.json({ error: "Celular inválido" }, { status: 400 });
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
    data: {
      name,
      email,
      password: hashed,
      pencaId: penca.id,
      ci: ci ? ci.replace(/[.\-]/g, "") : null,
      phone: phone ? phone.replace(/[\s\-\+\(\)]/g, "") : null,
    },
  });

  return NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 });
}
