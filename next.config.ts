import type { NextConfig } from "next";

const securityHeaders = [
  // Bloquea que la app se cargue dentro de un iframe (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // Evita que el browser adivine el tipo de archivo
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No manda la URL completa como referrer al navegar a otros sitios
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Deshabilita features del browser que no usamos
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
