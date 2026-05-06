import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// IDs de la API-Football que mapean a los matchIds del fixture local
// ⚠️ TEST ONLY — borrar antes del Mundial 2026 y poner los IDs reales
const FIXTURE_MAP: Record<number, string> = {
  // apiFootballId: matchId local
  1540844: "A1", // Bayern München vs PSG (Champions 06/05) → test
  // Cuando llegue el 2026, acá van los IDs reales de cada partido del Mundial
};

type ApiFixture = {
  fixture: { id: number; status: { short: string; elapsed: number | null } };
  teams: { home: { name: string }; away: { name: string } };
  goals: { home: number | null; away: number | null };
};

function getMatchStatus(apiStatus: string): "live" | "finished" | null {
  if (["1H", "2H", "HT", "ET", "BT", "P"].includes(apiStatus)) return "live";
  if (["FT", "AET", "PEN"].includes(apiStatus)) return "finished";
  return null; // NS, TBD, PST, CANC, etc — ignorar
}

async function fetchFixturesByIds(ids: number[]): Promise<ApiFixture[]> {
  if (ids.length === 0) return [];
  const res = await fetch(
    `https://v3.football.api-sports.io/fixtures?ids=${ids.join("-")}`,
    {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
      next: { revalidate: 0 },
    }
  );
  const data = await res.json();
  return data.response ?? [];
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret");
  if (secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!process.env.API_FOOTBALL_KEY) {
    return NextResponse.json({ error: "API_FOOTBALL_KEY no configurada" }, { status: 500 });
  }

  const mappedIds = Object.keys(FIXTURE_MAP).map(Number);
  if (mappedIds.length === 0) {
    return NextResponse.json({ message: "Sin partidos mapeados todavía", synced: 0 });
  }

  const fixtures = await fetchFixturesByIds(mappedIds);

  let synced = 0;
  for (const f of fixtures) {
    const matchId = FIXTURE_MAP[f.fixture.id];
    if (!matchId) continue;

    const matchStatus = getMatchStatus(f.fixture.status.short);
    if (!matchStatus) continue; // partido no empezó o cancelado
    if (f.goals.home === null || f.goals.away === null) continue;

    await prisma.matchResult.upsert({
      where: { matchId },
      update: {
        homeScore: f.goals.home,
        awayScore: f.goals.away,
        elapsed: f.fixture.status.elapsed,
        status: matchStatus,
      },
      create: {
        matchId,
        homeScore: f.goals.home,
        awayScore: f.goals.away,
        elapsed: f.fixture.status.elapsed,
        status: matchStatus,
      },
    });
    synced++;
  }

  return NextResponse.json({ message: "ok", synced });
}

// GET para explorar partidos desde el admin
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret");
  if (secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!process.env.API_FOOTBALL_KEY) {
    return NextResponse.json({ error: "API_FOOTBALL_KEY no configurada" }, { status: 500 });
  }

  const fixtureId = req.nextUrl.searchParams.get("fixture");
  const leagueId = req.nextUrl.searchParams.get("league");
  const season = req.nextUrl.searchParams.get("season");

  let fixtures: ApiFixture[] = [];

  if (fixtureId) {
    fixtures = await fetchFixturesByIds([Number(fixtureId)]);
  } else if (leagueId && season) {
    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}&live=all`,
      { headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY }, next: { revalidate: 0 } }
    );
    const data = await res.json();
    fixtures = data.response ?? [];
  } else {
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
