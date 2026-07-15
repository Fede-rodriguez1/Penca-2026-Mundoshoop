import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcPoints } from "@/lib/scoring";
import { matches as fixtureMatches } from "@/data/fixture";

// IDs reales de API-Football para el Mundial 2026 — verificados el 13/05/2026
const FIXTURE_MAP: Record<number, string> = {
  // GRUPO A
  1489369: "A1",  // Mexico vs South Africa        (11/06)
  1538999: "A2",  // South Korea vs Czech Republic  (12/06)
  1539004: "A3",  // Czech Republic vs South Africa (18/06)
  1489388: "A4",  // Mexico vs South Korea          (19/06)
  1539010: "A5",  // Czech Republic vs Mexico       (25/06)
  1489407: "A6",  // South Africa vs South Korea    (25/06)
  // GRUPO B
  1539000: "B1",  // Canada vs Bosnia & Herzegovina (12/06)
  1489373: "B2",  // Qatar vs Switzerland           (13/06)
  1539005: "B3",  // Switzerland vs Bosnia          (18/06)
  1489387: "B4",  // Canada vs Qatar                (18/06)
  1489408: "B5",  // Switzerland vs Canada          (24/06)
  1539009: "B6",  // Bosnia vs Qatar                (24/06)
  // GRUPO C
  1489371: "C1",  // Brazil vs Morocco              (13/06)
  1489372: "C2",  // Haiti vs Scotland              (14/06)
  1489390: "C3",  // Scotland vs Morocco            (19/06)
  1489389: "C4",  // Brazil vs Haiti                (20/06)
  1489406: "C5",  // Scotland vs Brazil             (24/06)
  1489405: "C6",  // Morocco vs Haiti               (24/06)
  // GRUPO D
  1489370: "D1",  // USA vs Paraguay                (13/06)
  1539001: "D2",  // Australia vs Türkiye           (14/06)
  1539006: "D3",  // Türkiye vs Paraguay            (20/06)
  1489391: "D4",  // USA vs Australia               (19/06)
  1539012: "D5",  // Türkiye vs USA                 (26/06)
  1489411: "D6",  // Paraguay vs Australia          (26/06)
  // GRUPO E
  1489374: "E1",  // Germany vs Curaçao             (14/06)
  1489375: "E2",  // Ivory Coast vs Ecuador         (14/06)
  1489393: "E3",  // Germany vs Ivory Coast         (20/06)
  1489392: "E4",  // Ecuador vs Curaçao             (21/06)
  1489410: "E5",  // Ecuador vs Germany             (25/06)
  1489409: "E6",  // Curaçao vs Ivory Coast         (25/06)
  // GRUPO F
  1489376: "F1",  // Netherlands vs Japan           (14/06)
  1539002: "F2",  // Sweden vs Tunisia              (15/06)
  1539007: "F3",  // Netherlands vs Sweden          (20/06)
  1489394: "F4",  // Tunisia vs Japan               (21/06)
  1539011: "F5",  // Japan vs Sweden                (25/06)
  1489412: "F6",  // Tunisia vs Netherlands         (25/06)
  // GRUPO G
  1489377: "G1",  // Belgium vs Egypt               (15/06)
  1489378: "G2",  // Iran vs New Zealand            (16/06)
  1489395: "G3",  // Belgium vs Iran                (21/06)
  1489396: "G4",  // New Zealand vs Egypt           (22/06)
  1489415: "G5",  // New Zealand vs Belgium         (27/06)
  1489414: "G6",  // Egypt vs Iran                  (27/06)
  // GRUPO H
  1489380: "H1",  // Spain vs Cape Verde Islands    (15/06)
  1489379: "H2",  // Saudi Arabia vs Uruguay        (15/06)
  1489397: "H3",  // Spain vs Saudi Arabia          (21/06)
  1489398: "H4",  // Uruguay vs Cape Verde Islands  (21/06)
  1489417: "H5",  // Uruguay vs Spain               (27/06)
  1489413: "H6",  // Cape Verde Islands vs Saudi Arabia (27/06)
  // GRUPO I
  1489383: "I1",  // France vs Senegal              (16/06)
  1539016: "I2",  // Iraq vs Norway                 (16/06)
  1539017: "I3",  // France vs Iraq                 (22/06)
  1489401: "I4",  // Norway vs Senegal              (23/06)
  1489416: "I5",  // Norway vs France               (26/06)
  1539074: "I6",  // Senegal vs Iraq                (26/06)
  // GRUPO J
  1489381: "J1",  // Argentina vs Algeria           (17/06)
  1489382: "J2",  // Austria vs Jordan              (17/06)
  1489399: "J3",  // Argentina vs Austria           (22/06)
  1489400: "J4",  // Jordan vs Algeria              (23/06)
  1489421: "J5",  // Jordan vs Argentina            (28/06)
  1489418: "J6",  // Algeria vs Austria             (28/06)
  // GRUPO K
  1539003: "K1",  // Portugal vs Congo DR           (17/06)
  1489386: "K2",  // Uzbekistan vs Colombia         (18/06)
  1489404: "K3",  // Portugal vs Uzbekistan         (23/06)
  1539008: "K4",  // Colombia vs Congo DR           (24/06)
  1489419: "K5",  // Colombia vs Portugal           (27/06)
  1539013: "K6",  // Congo DR vs Uzbekistan         (27/06)
  // GRUPO L
  1489384: "L1",  // England vs Croatia             (17/06)
  1489385: "L2",  // Ghana vs Panama                (17/06)
  1489402: "L3",  // England vs Ghana               (23/06)
  1489403: "L4",  // Panama vs Croatia              (23/06)
  1489422: "L5",  // Panama vs England              (27/06)
  1489420: "L6",  // Croatia vs Ghana               (27/06)
  // ELIMINATORIAS — 16vos de final
  1561329: "P73",  // South Africa vs Canada           (28/06)
  1565176: "P74",  // Germany vs Paraguay              (29/06)
  1562345: "P75",  // Netherlands vs Morocco            (29/06)
  1562344: "P76",  // Brazil vs Japan                  (29/06)
  1565177: "P77",  // France vs Sweden                 (30/06)
  1564789: "P78",  // Ivory Coast vs Norway             (30/06)
  1567306: "P79",  // Mexico vs Ecuador                (30/06)
  1567307: "P80",  // England vs Congo DR              (01/07)
  1562586: "P81",  // USA vs Bosnia & Herzegovina       (01/07)
  1567308: "P82",  // Belgium vs Senegal               (01/07)
  1567309: "P83",  // Portugal vs Croatia              (02/07)
  1567311: "P84",  // Spain vs Austria                 (02/07)
  1567312: "P85",  // Switzerland vs Algeria           (03/07)
  1565179: "P86",  // Argentina vs Cape Verde          (03/07)
  1567310: "P87",  // Colombia vs Ghana                (03/07)
  1565178: "P88",  // Australia vs Egypt               (03/07)
  // ELIMINATORIAS — Octavos de final
  1569870: "P89",  // Paraguay vs France               (04/07)
  1567824: "P90",  // Canada vs Morocco                (04/07)
  1568100: "P91",  // Brazil vs Norway                 (05/07)
  1570714: "P92",  // Mexico vs England                (05/07)
  1576756: "P93",  // Portugal vs Spain                 (06/07)
  1570715: "P94",  // USA vs Belgium                   (06/07)
  1576804: "P95",  // Argentina vs Egypt               (07/07)
  1576805: "P96",  // Switzerland vs Colombia           (07/07)
  // ELIMINATORIAS — Cuartos de final
  1578539: "P97",  // France vs Morocco                (09/07)
  1581821: "P98",  // Spain vs Belgium                 (10/07)
  1581037: "P99",  // Norway vs England                (11/07)
  1582681: "P100", // Argentina vs Switzerland          (11/07)
  // ELIMINATORIAS — Semifinales
  1585131: "P101", // France vs Spain                   (14/07)
  1586077: "P102", // England vs Argentina              (15/07)
  // ELIMINATORIAS — Final
  1591866: "P104", // Spain vs Argentina                (19/07)
};

type ApiFixture = {
  fixture: { id: number; status: { short: string; elapsed: number | null } };
  teams: { home: { name: string }; away: { name: string } };
  goals: { home: number | null; away: number | null };
  score: {
    fulltime: { home: number | null; away: number | null };
  };
};

function getMatchStatus(apiStatus: string): "live" | "finished" | null {
  if (["1H", "2H", "HT", "ET", "BT", "P"].includes(apiStatus)) return "live";
  if (["FT", "AET", "PEN"].includes(apiStatus)) return "finished";
  return null; // NS, TBD, PST, CANC, etc — ignorar
}

async function fetchFixturesByIds(ids: number[]): Promise<ApiFixture[]> {
  if (ids.length === 0) return [];

  const BATCH_SIZE = 20;
  const results: ApiFixture[] = [];

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(
        `https://v3.football.api-sports.io/fixtures?ids=${batch.join("-")}`,
        {
          headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
          next: { revalidate: 0 },
          signal: controller.signal,
        }
      );
      const data = await res.json();
      results.push(...(data.response ?? []));
    } finally {
      clearTimeout(timeout);
    }
  }

  return results;
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret");
  if (secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!process.env.API_FOOTBALL_KEY) {
    return NextResponse.json({ error: "API_FOOTBALL_KEY no configurada" }, { status: 500 });
  }

  // Solo sincronizar partidos de hoy, ayer y mañana en hora Argentina
  // (fixture.ts usa fechas en hora Argentina, no UTC)
  const nowAR = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
  const todayStr = nowAR.toISOString().slice(0, 10);
  const yesterday = new Date(nowAR);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const tomorrow = new Date(nowAR);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const relevantMatchIds = new Set(
    fixtureMatches
      .filter(m => m.date === todayStr || m.date === yesterdayStr || m.date === tomorrowStr)
      .map(m => m.id)
  );

  const mappedIds = Object.entries(FIXTURE_MAP)
    .filter(([, matchId]) => relevantMatchIds.has(matchId))
    .map(([apiId]) => Number(apiId));

  if (mappedIds.length === 0) {
    return NextResponse.json({ message: "Sin partidos hoy/ayer", synced: 0 });
  }

  const fixtures = await fetchFixturesByIds(mappedIds);

  let synced = 0;
  let pointsCalculated = 0;

  for (const f of fixtures) {
    const matchId = FIXTURE_MAP[f.fixture.id];
    if (!matchId) continue;

    const matchStatus = getMatchStatus(f.fixture.status.short);
    if (!matchStatus) continue; // partido no empezó o cancelado
    if (f.goals.home === null || f.goals.away === null) continue;

    // Para AET/PEN usar score.fulltime (90 min) en vez de goals (que incluye prórroga)
    const apiStatus = f.fixture.status.short;
    const useFulltime = (apiStatus === "AET" || apiStatus === "PEN") &&
      f.score.fulltime.home !== null && f.score.fulltime.away !== null;
    const scoreHome = useFulltime ? f.score.fulltime.home! : f.goals.home!;
    const scoreAway = useFulltime ? f.score.fulltime.away! : f.goals.away!;

    // Verificar si ya estaba finished antes de upsert
    const existing = await prisma.matchResult.findUnique({ where: { matchId } });

    await prisma.matchResult.upsert({
      where: { matchId },
      update: {
        homeScore: scoreHome,
        awayScore: scoreAway,
        elapsed: f.fixture.status.elapsed,
        status: matchStatus,
      },
      create: {
        matchId,
        homeScore: scoreHome,
        awayScore: scoreAway,
        elapsed: f.fixture.status.elapsed,
        status: matchStatus,
      },
    });
    synced++;

    // Calcular puntos solo cuando el partido pasa a finished por primera vez
    if (matchStatus === "finished" && existing?.status !== "finished") {

      const predictions = await prisma.prediction.findMany({ where: { matchId } });
      await Promise.all(
        predictions.map((p) =>
          prisma.prediction.update({
            where: { id: p.id },
            data: {
              points: calcPoints(p.homeScore, p.awayScore, scoreHome, scoreAway),
            },
          })
        )
      );
      pointsCalculated += predictions.length;
    }
  }

  return NextResponse.json({ message: "ok", synced, pointsCalculated });
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
