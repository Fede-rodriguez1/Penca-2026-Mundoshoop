import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const body = await req.json().catch(() => ({}));

  const { type, duration } = body as { type?: string; duration?: number };

  const validTypes = ["click_ml", "click_instagram", "session"];
  if (!type || !validTypes.includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  await prisma.event.create({
    data: {
      type,
      userId: session?.user?.id ?? null,
      duration: type === "session" && typeof duration === "number" ? Math.round(duration) : null,
    },
  });

  return NextResponse.json({ ok: true });
}
