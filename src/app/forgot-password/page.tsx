"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);

    if (data.message && data.message !== "ok") {
      setError(data.message);
    } else {
      setMessage("Si tu email está registrado, te mandamos un link para restablecer tu contraseña. Revisá tu bandeja.");
    }
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ backgroundColor: "#f3f4f6" }}>
      {/* Header */}
      <div className="px-6 py-5" style={{ backgroundColor: "#00217E" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mundoshop-logo.png" alt="Mundo Shop" className="h-7 w-auto object-contain" />
        <p className="text-sm font-semibold mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>Penca Mundial 2026</p>
      </div>

      <div className="flex-1 flex items-start justify-center px-6 pt-10">
        <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-sm">
          <h1 className="text-xl font-bold mb-1" style={{ color: "#00217E" }}>¿Olvidaste tu contraseña?</h1>
          <p className="text-sm text-gray-500 mb-6">Ingresá tu email y te mandamos un link para restablecerla.</p>

          {message ? (
            <div className="rounded-xl px-4 py-4 text-sm font-medium text-center" style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}>
              {message}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:border-transparent transition"
                  style={{ "--tw-ring-color": "#00217E" } as React.CSSProperties}
                />
              </div>

              {error && <p className="text-xs text-red-500 text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity"
                style={{ backgroundColor: "#00217E", opacity: loading ? 0.6 : 1 }}
              >
                {loading ? "Enviando..." : "Enviar link"}
              </button>
            </form>
          )}

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
