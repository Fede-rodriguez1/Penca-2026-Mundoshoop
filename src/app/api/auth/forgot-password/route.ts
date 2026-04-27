import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Si el usuario existe pero se registró con Google, no tiene contraseña
  if (user?.provider === "google") {
    return NextResponse.json({
      message: "Esta cuenta usa Google para ingresar. Usá el botón 'Continuar con Google'.",
    });
  }

  // Siempre respondemos ok aunque el email no exista (seguridad)
  if (!user) {
    return NextResponse.json({ message: "ok" });
  }

  // Borrar tokens anteriores del mismo email
  await prisma.passwordResetToken.deleteMany({ where: { email } });

  // Crear nuevo token (expira en 1 hora)
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.passwordResetToken.create({ data: { email, token, expiresAt } });

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: email,
    subject: "Restablecer contraseña — Penca Mundial 2026",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <p style="color: #FFCA61; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 8px;">Mundo Shop</p>
        <h1 style="color: #00217E; font-size: 24px; font-weight: 800; margin: 0 0 16px;">Restablecé tu contraseña</h1>
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px;">
          Recibimos una solicitud para restablecer la contraseña de tu cuenta en la Penca Mundial 2026.
          Si no fuiste vos, ignorá este mail.
        </p>
        <a href="${resetUrl}"
          style="display: inline-block; background-color: #00217E; color: white; font-weight: 700; font-size: 14px;
                 padding: 14px 28px; border-radius: 12px; text-decoration: none;">
          Restablecer contraseña
        </a>
        <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0;">
          Este link expira en 1 hora.
        </p>
      </div>
    `,
  });

  return NextResponse.json({ message: "ok" });
}
