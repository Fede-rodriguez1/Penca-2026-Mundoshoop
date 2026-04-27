"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const passwordMatch = confirm === "" || password === confirm;
  const canSubmit = password.length >= 8 && confirm && passwordMatch;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Error al restablecer la contraseña");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 3000);
  }

  if (!token) {
    return (
      <p className="text-sm text-red-500 text-center">Link inválido. Pedí uno nuevo desde el login.</p>
    );
  }

  if (done) {
    return (
      <div className="rounded-xl px-4 py-4 text-sm font-medium text-center" style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}>
        ¡Contraseña actualizada! Redirigiendo al login...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="password" className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
          Nueva contraseña
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:border-transparent transition"
          style={{ "--tw-ring-color": "#00217E" } as React.CSSProperties}
        />
      </div>

      <div>
        <label htmlFor="confirm" className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
          Confirmar contraseña
        </label>
        <input
          id="confirm"
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repetí tu contraseña"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:border-transparent transition"
          style={{
            "--tw-ring-color": passwordMatch ? "#00217E" : "#ef4444",
            borderColor: !passwordMatch ? "#ef4444" : undefined,
          } as React.CSSProperties}
        />
        {!passwordMatch && <p className="text-xs text-red-500 mt-1.5">Las contraseñas no coinciden</p>}
      </div>

      {error && <p className="text-xs text-red-500 text-center">{error}</p>}

      <button
        type="submit"
        disabled={!canSubmit || loading}
        className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity"
        style={{ backgroundColor: "#00217E", opacity: canSubmit && !loading ? 1 : 0.4 }}
      >
        {loading ? "Guardando..." : "Guardar nueva contraseña"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex flex-col" style={{ backgroundColor: "#f3f4f6" }}>
      <div className="px-6 py-5" style={{ backgroundColor: "#00217E" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mundoshop-logo.png" alt="Mundo Shop" className="h-7 w-auto object-contain" />
        <p className="text-sm font-semibold mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>Penca Mundial 2026</p>
      </div>

      <div className="flex-1 flex items-start justify-center px-6 pt-10">
        <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-sm">
          <h1 className="text-xl font-bold mb-1" style={{ color: "#00217E" }}>Nueva contraseña</h1>
          <p className="text-sm text-gray-500 mb-6">Elegí una contraseña nueva para tu cuenta.</p>
          <Suspense fallback={<div className="h-10 bg-gray-100 rounded-xl animate-pulse" />}>
            <ResetPasswordForm />
          </Suspense>
          <p className="text-center text-xs text-gray-400 mt-6">
            <Link href="/login" className="font-semibold hover:underline" style={{ color: "#00217E" }}>
              Volver al login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
