"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pencaCode = searchParams.get("code")?.toUpperCase() ?? "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pencaName, setPencaName] = useState<string | null>(null);

  useEffect(() => {
    if (!pencaCode) return;
    fetch(`/api/pencas/validate?code=${pencaCode}`)
      .then((r) => r.json())
      .then((d) => { if (d.name) setPencaName(d.name); else setError("Código de penca inválido"); });
  }, [pencaCode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Email o contraseña incorrectos");
    } else {
      router.push(pencaCode ? `/dashboard?pencaCode=${pencaCode}` : "/dashboard");
    }
  }

  return (
    <main className="min-h-screen flex">
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden"
        style={{ backgroundColor: "#00217E" }}
      >
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/login-bg.jpg')", opacity: 0.35 }} />
        <div className="relative z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mundoshop-logo.png" alt="Mundo Shop" className="h-8 w-auto object-contain" />
        </div>
        <div className="relative z-10">
          <h1 className="text-white text-5xl font-bold leading-tight mb-4">
            Penca<br />Mundial<br />
            <span style={{ color: "#FFCA61" }}>2026</span>
          </h1>
          <p className="text-blue-200 text-base max-w-xs">
            Predecí los resultados, sumá puntos y participá por un gran premio.
          </p>
        </div>
        <p className="relative z-10 text-blue-300 text-xs">© 2026 Mundo Shop. Todos los derechos reservados.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-col justify-center w-full lg:w-1/2 px-8 sm:px-16 lg:px-20 py-12">
        {/* Mobile logo */}
        <div className="lg:hidden -mx-8 sm:-mx-16 -mt-12 px-8 sm:px-16 py-6 mb-8" style={{ backgroundColor: "#00217E" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mundoshop-logo.png" alt="Mundo Shop" className="h-7 w-auto object-contain mb-2" />
          <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>Penca Mundial 2026</p>
        </div>

        <div className="max-w-sm w-full mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Bienvenido</h2>
          <p className="text-sm text-gray-500 mb-4">Ingresá con tu cuenta para continuar</p>

          {/* Badge penca */}
          {pencaName && (
            <div className="flex items-center gap-2 mb-6 px-3 py-2 rounded-xl text-sm font-semibold" style={{ backgroundColor: "#eff6ff", color: "#00217E" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00217E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Te unís a: {pencaName}
            </div>
          )}

          {/* Google */}
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: pencaCode ? `/dashboard?pencaCode=${pencaCode}` : "/dashboard" })}
            className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-6"
          >
            <GoogleIcon />
            Continuar con Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">o ingresá con email</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:border-transparent transition"
                style={{ "--tw-ring-color": "#00217E" } as React.CSSProperties}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Contraseña
                </label>
                <Link href="/forgot-password" className="text-xs font-medium hover:underline" style={{ color: "#00217E" }}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:border-transparent transition"
                style={{ "--tw-ring-color": "#00217E" } as React.CSSProperties}
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 mt-2"
              style={{ backgroundColor: "#00217E", opacity: loading ? 0.6 : 1 }}
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-8">
            ¿No tenés cuenta?{" "}
            <Link
              href={pencaCode ? `/register?code=${pencaCode}` : "/register"}
              className="font-semibold hover:underline"
              style={{ color: "#00217E" }}
            >
              Registrate
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}
