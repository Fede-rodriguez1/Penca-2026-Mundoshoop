export default function LoginPage() {
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
            La penca ya terminó. ¡Gracias a todos por participar!
          </p>
        </div>
        <p className="relative z-10 text-blue-300 text-xs">© 2026 Mundo Shop. Todos los derechos reservados.</p>
      </div>

      {/* Right panel — winner card */}
      <div className="flex flex-col justify-center items-center w-full lg:w-1/2 px-6 sm:px-12 py-12" style={{ backgroundColor: "#0d1b2a" }}>
        {/* Mobile logo */}
        <div className="lg:hidden w-full -mx-6 sm:-mx-12 -mt-12 px-6 sm:px-12 py-6 mb-8" style={{ backgroundColor: "#00217E" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mundoshop-logo.png" alt="Mundo Shop" className="h-7 w-auto object-contain mb-2" />
          <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>Penca Mundial 2026</p>
        </div>

        <div className="w-full max-w-md">
          <div
            className="relative overflow-hidden rounded-2xl shadow-[0_0_40px_rgba(255,202,97,0.15)] ring-1 ring-[#FFCA61]/20"
            style={{ background: "linear-gradient(145deg, #0a1628 0%, #122040 40%, #1a2d50 100%)" }}
          >
            {/* Decorative glows */}
            <div className="absolute top-0 left-0 w-40 h-40 opacity-[0.06]" style={{ background: "radial-gradient(circle at top left, #FFCA61, transparent 70%)" }} />
            <div className="absolute top-0 right-0 w-40 h-40 opacity-[0.06]" style={{ background: "radial-gradient(circle at top right, #FFCA61, transparent 70%)" }} />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-32 opacity-[0.04]" style={{ background: "radial-gradient(circle at bottom, #FFCA61, transparent 70%)" }} />

            <div className="relative px-6 pt-8 pb-7">
              {/* Trophy */}
              <div className="flex justify-center mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/trophy.png"
                  alt="Copa del Mundo"
                  className="object-contain"
                  style={{ width: 100, height: 100, filter: "drop-shadow(0 0 20px rgba(255,202,97,0.35))" }}
                />
              </div>

              {/* Title */}
              <div className="text-center mb-1">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="h-px flex-1 max-w-[60px]" style={{ background: "linear-gradient(90deg, transparent, rgba(255,202,97,0.3))" }} />
                  <span className="text-[10px] font-black tracking-[0.3em] uppercase" style={{ color: "#FFCA61" }}>
                    PENCA MUNDOSHOP 2026
                  </span>
                  <div className="h-px flex-1 max-w-[60px]" style={{ background: "linear-gradient(90deg, rgba(255,202,97,0.3), transparent)" }} />
                </div>
                <h2 className="text-xl font-black uppercase tracking-wide text-white">
                  Ganador de la Penca
                </h2>
              </div>

              {/* Winner */}
              <div className="flex flex-col items-center mb-5">
                <div className="w-16 h-16 rounded-full mb-3 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FFCA61, #e5a800)", boxShadow: "0 0 30px rgba(255,202,97,0.4)" }}>
                  <span className="text-xl font-black" style={{ color: "#0a1628" }}>DV</span>
                </div>
                <p className="text-lg font-bold text-white leading-tight">Daniel Varela</p>
                <p className="text-[28px] font-black mt-1" style={{ color: "#FFCA61" }}>328</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,202,97,0.6)" }}>puntos</p>
              </div>

              {/* Stats row */}
              <div className="flex justify-center gap-6 mb-5">
                {[
                  { value: "17", label: "Exactos" },
                  { value: "15", label: "Dif. goles" },
                  { value: "39", label: "Ganador" },
                  { value: "33", label: "Errados" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-sm font-bold text-white">{s.value}</p>
                    <p className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div className="h-px mb-4" style={{ background: "linear-gradient(90deg, transparent, rgba(255,202,97,0.2), transparent)" }} />

              {/* Sorteo result */}
              <div className="text-center rounded-lg px-4 py-3" style={{ background: "rgba(255,202,97,0.06)" }}>
                <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
                  Ganador del sorteo entre Daniel Varela y Adriana Ercoli
                </p>
                <p className="text-[10px] mt-1.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Ambos terminaron con 328 puntos y estad&iacute;sticas id&eacute;nticas.
                  <br />
                  El ganador se defini&oacute; por sorteo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
