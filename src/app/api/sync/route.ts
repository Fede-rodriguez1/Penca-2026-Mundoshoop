import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// IDs de la API-Football que mapean a los matchIds del fixture local
// Para el Mundial 2026, acá van los IDs reales de cada partido.
// Por ahora tiene partidos de prueba para testear el flujo.
const FIXTURE_MAP: Record<number, string> = {
  // apiFootballId: matchId local
  // ⚠️ TEST ONLY — mapeo temporal para probar el flujo. Borrar antes del Mundial 2026.
  1540843: "A1", // Arsenal vs Atlético Madrid (Champions 05/05) → mapeado a México vs Sudáfrica para test
  // Cuando llegue el 2026, acá van los IDs reales de cada partido del Mundial
};

// Cuando haya partidos del Mundial 2026, activar este ID de liga:
// const WORLD_CUP_LEAGUE_ID = 1; // FIFA World Cup en API-Football

// Para test: ID de liga = null significa que sincronizamos por IDs específicos del mapa
async function fetchLiveFixtures(fixtureIds: number[]): Promise<ApiFixture[]> {
  if (fixtureIds.length === 0) return [];
  const ids = fixtureIds.join("-");
  const res = await fetch(`https://v3.football.api-sports.io/fixtures?ids=${ids}`, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
    next: { revalidate: 0 },
  });
  const data = await res.json();
  return data.response ?? [];
}

async function fetchLiveByLeague(leagueId: number, season: number): Promise<ApiFixture[]> {
  const res = await fetch(
    `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}&live=all`,
    {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
      next: { revalidate: 0 },
    }
  );
  const data = await res.json();
  return data.response ?? [];
}

type ApiFixture = {
  fixture: { id: number; status: { short: string; elapsed: number | null } };
  teams: { home: { name: string }; away: { name: string } };
  goals: { home: number | null; away: number | null };
};

function isFinishedOrLive(status: string) {
  // FT = full time, AET = after extra time, PEN = penalties, 1H/2H = in play, HT = half time
  return ["FT", "AET", "PEN", "1H", "2H", "HT", "ET", "BT", "P"].includes(status);
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret");
  if (secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!process.env.API_FOOTBALL_KEY) {
    return NextResponse.json({ error: "API_FOOTBALL_KEY no configurada" }, { status: 500 });
  }

  if (Object.keys(FIXTURE_MAP).length === 0) {
    return NextResponse.json({ message: "Sin partidos mapeados todavía", synced: 0 });
  }

  // Plan gratis solo soporta ?live=all — traemos todos y filtramos por FIXTURE_MAP
  const res = await fetch("https://v3.football.api-sports.io/fixtures?live=all", {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY },
    next: { revalidate: 0 },
  });
  const data = await res.json();
  const fixtures: ApiFixture[] = data.response ?? [];

  let synced = 0;
  for (const f of fixtures) {
    const matchId = FIXTURE_MAP[f.fixture.id];
    if (!matchId) continue;
    if (!isFinishedOrLive(f.fixture.status.short)) continue;
    if (f.goals.home === null || f.goals.away === null) continue;

    await prisma.matchResult.upsert({
      where: { matchId },
      update: { homeScore: f.goals.home, awayScore: f.goals.away },
      create: { matchId, homeScore: f.goals.home, awayScore: f.goals.away },
    });
    synced++;
  }

  return NextResponse.json({ message: "ok", synced });
}

// GET para test manual desde el admin — muestra partidos en vivo de cualquier liga
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret");
  if (secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!process.env.API_FOOTBALL_KEY) {
    return NextResponse.json({ error: "API_FOOTBALL_KEY no configurada" }, { status: 500 });
  }

  const leagueId = req.nextUrl.searchParams.get("league");
  const season = req.nextUrl.searchParams.get("season");
  const fixtureId = req.nextUrl.searchParams.get("fixture");

  let fixtures: ApiFixture[] = [];

  if (fixtureId) {
    fixtures = await fetchLiveFixtures([Number(fixtureId)]);
  } else if (leagueId && season) {
    fixtures = await fetchLiveByLeague(Number(leagueId), Number(season));
  } else {
    // Sin params: devuelve todos los partidos en vivo ahora
    const res = await fetch("https://v3.football.api-sports.io/fixtures?live=all", {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY },
    });
    const data = await res.json();
    fixtures = data.response ?? [];
  }

  return NextResponse.json(
    fixtures.map((f) => ({
      apiId: f.fixture.id,
      home: f.teams.home.name,
      away: f.teams.away.name,
      score: `${f.goals.home ?? "?"} - ${f.goals.away ?? "?"}`,
      status: f.fixture.status.short,
      elapsed: f.fixture.status.elapsed,
    }))
  );
}
