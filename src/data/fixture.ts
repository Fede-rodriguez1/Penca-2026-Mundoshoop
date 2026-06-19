const BASE = "/shields";

export type Team = {
  name: string;
  shortName: string;
  flag: string;
  shield: string;
};

export type Match = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM hora Argentina
  group: string;
  matchday: number;
  home: Team;
  away: Team;
  venue: string;
  status: "upcoming" | "live" | "finished";
  homeScore?: number;
  awayScore?: number;
};

const t: Record<string, Team> = {
  MEX: { name: "México",           shortName: "México",       flag: "🇲🇽", shield: `${BASE}/mexico.png` },
  RSA: { name: "Sudáfrica",        shortName: "Sudáfrica",    flag: "🇿🇦", shield: `${BASE}/sudafrica.png` },
  KOR: { name: "Corea del Sur",    shortName: "R. d. Corea",  flag: "🇰🇷", shield: `${BASE}/coreadelsur.png` },
  CZE: { name: "Rep. Checa",       shortName: "R. Checa",     flag: "🇨🇿", shield: `${BASE}/republicacheca.png` },
  CAN: { name: "Canadá",           shortName: "Canadá",       flag: "🇨🇦", shield: `${BASE}/canada.png` },
  BIH: { name: "Bosnia Herz.",     shortName: "Bosnia-Herz.", flag: "🇧🇦", shield: `${BASE}/bosnia.png` },
  QAT: { name: "Qatar",            shortName: "Qatar",        flag: "🇶🇦", shield: `${BASE}/qatar.png` },
  SUI: { name: "Suiza",            shortName: "Suiza",        flag: "🇨🇭", shield: `${BASE}/suiza.png` },
  BRA: { name: "Brasil",           shortName: "Brasil",       flag: "🇧🇷", shield: `${BASE}/brasil.png` },
  MAR: { name: "Marruecos",        shortName: "Marruecos",    flag: "🇲🇦", shield: `${BASE}/marruecos.png` },
  HAI: { name: "Haití",            shortName: "Haití",        flag: "🇭🇹", shield: `${BASE}/haiti.png` },
  SCO: { name: "Escocia",          shortName: "Escocia",      flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", shield: `${BASE}/escocia.png` },
  USA: { name: "Estados Unidos",   shortName: "E. Unidos",    flag: "🇺🇸", shield: `${BASE}/usa.png` },
  PAR: { name: "Paraguay",         shortName: "Paraguay",     flag: "🇵🇾", shield: `${BASE}/paraguay.png` },
  AUS: { name: "Australia",        shortName: "Australia",    flag: "🇦🇺", shield: `${BASE}/australia.png` },
  TUR: { name: "Turquía",          shortName: "Turquía",      flag: "🇹🇷", shield: `${BASE}/turquia.png` },
  GER: { name: "Alemania",         shortName: "Alemania",     flag: "🇩🇪", shield: `${BASE}/alemania.png` },
  CUW: { name: "Curazao",          shortName: "Curazao",      flag: "🇨🇼", shield: `${BASE}/curazao.png` },
  CIV: { name: "Costa de Marfil",  shortName: "C. de Marfil", flag: "🇨🇮", shield: `${BASE}/costa_de_marfil.png` },
  ECU: { name: "Ecuador",          shortName: "Ecuador",      flag: "🇪🇨", shield: `${BASE}/ecuador.png` },
  NED: { name: "Países Bajos",     shortName: "P. Bajos",     flag: "🇳🇱", shield: `${BASE}/paisesbajos.png` },
  JPN: { name: "Japón",            shortName: "Japón",        flag: "🇯🇵", shield: `${BASE}/japon.png` },
  SWE: { name: "Suecia",           shortName: "Suecia",       flag: "🇸🇪", shield: `${BASE}/suecia.png` },
  TUN: { name: "Túnez",            shortName: "Túnez",        flag: "🇹🇳", shield: `${BASE}/tunez.png` },
  BEL: { name: "Bélgica",          shortName: "Bélgica",      flag: "🇧🇪", shield: `${BASE}/belgica.png` },
  EGY: { name: "Egipto",           shortName: "Egipto",       flag: "🇪🇬", shield: `${BASE}/egipto.png` },
  IRN: { name: "Irán",             shortName: "Irán",         flag: "🇮🇷", shield: `${BASE}/iran.png` },
  NZL: { name: "Nueva Zelanda",    shortName: "N. Zelanda",   flag: "🇳🇿", shield: `${BASE}/nuevazelanda.png` },
  ESP: { name: "España",           shortName: "España",       flag: "🇪🇸", shield: `${BASE}/espana.png` },
  CPV: { name: "Cabo Verde",       shortName: "Cabo Verde",   flag: "🇨🇻", shield: `${BASE}/cabo_verde.png` },
  KSA: { name: "Arabia Saudita",   shortName: "A. Saudita",   flag: "🇸🇦", shield: `${BASE}/arabiasaudita.png` },
  URU: { name: "Uruguay",          shortName: "Uruguay",      flag: "🇺🇾", shield: `${BASE}/uruguay.png` },
  FRA: { name: "Francia",          shortName: "Francia",      flag: "🇫🇷", shield: `${BASE}/francia.png` },
  SEN: { name: "Senegal",          shortName: "Senegal",      flag: "🇸🇳", shield: `${BASE}/senegal.png` },
  IRQ: { name: "Irak",             shortName: "Irak",         flag: "🇮🇶", shield: `${BASE}/irak.png` },
  NOR: { name: "Noruega",          shortName: "Noruega",      flag: "🇳🇴", shield: `${BASE}/noruega.png` },
  ARG: { name: "Argentina",        shortName: "Argentina",    flag: "🇦🇷", shield: `${BASE}/argentina.png` },
  ALG: { name: "Argelia",          shortName: "Argelia",      flag: "🇩🇿", shield: `${BASE}/argelia.png` },
  AUT: { name: "Austria",          shortName: "Austria",      flag: "🇦🇹", shield: `${BASE}/austria.png` },
  JOR: { name: "Jordania",         shortName: "Jordania",     flag: "🇯🇴", shield: `${BASE}/jordan.png` },
  POR: { name: "Portugal",         shortName: "Portugal",     flag: "🇵🇹", shield: `${BASE}/portugal.png` },
  COD: { name: "Congo RD",         shortName: "Congo RD",     flag: "🇨🇩", shield: `${BASE}/congo.png` },
  UZB: { name: "Uzbekistán",       shortName: "Uzbekistán",   flag: "🇺🇿", shield: `${BASE}/uzbekistan.png` },
  COL: { name: "Colombia",         shortName: "Colombia",     flag: "🇨🇴", shield: `${BASE}/colombia.png` },
  ENG: { name: "Inglaterra",       shortName: "Inglaterra",   flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", shield: `${BASE}/inglaterra.png` },
  CRO: { name: "Croacia",          shortName: "Croacia",      flag: "🇭🇷", shield: `${BASE}/croacia.png` },
  GHA: { name: "Ghana",            shortName: "Ghana",        flag: "🇬🇭", shield: `${BASE}/ghana.png` },
  PAN: { name: "Panamá",           shortName: "Panamá",       flag: "🇵🇦", shield: `${BASE}/panama.png` },
};

// Equipos placeholder para fase de eliminación directa
function ph(label: string): Team {
  return { name: label, shortName: label, flag: "❓", shield: "" };
}

export const matches: Match[] = [
  // GRUPO A
  { id: "A1", date: "2026-06-11", time: "16:00", group: "A", matchday: 1, home: t.MEX, away: t.RSA, venue: "Ciudad de México", status: "upcoming" },
  { id: "A2", date: "2026-06-11", time: "23:00", group: "A", matchday: 1, home: t.KOR, away: t.CZE, venue: "Los Ángeles", status: "upcoming" },
  { id: "A3", date: "2026-06-18", time: "13:00", group: "A", matchday: 2, home: t.CZE, away: t.RSA, venue: "Dallas", status: "upcoming" },
  { id: "A4", date: "2026-06-18", time: "22:00", group: "A", matchday: 2, home: t.MEX, away: t.KOR, venue: "Guadalajara", status: "upcoming" },
  { id: "A5", date: "2026-06-24", time: "22:00", group: "A", matchday: 3, home: t.CZE, away: t.MEX, venue: "Monterrey", status: "upcoming" },
  { id: "A6", date: "2026-06-24", time: "22:00", group: "A", matchday: 3, home: t.RSA, away: t.KOR, venue: "Ciudad de México", status: "upcoming" },
  // GRUPO B
  { id: "B1", date: "2026-06-12", time: "16:00", group: "B", matchday: 1, home: t.CAN, away: t.BIH, venue: "Toronto", status: "upcoming" },
  { id: "B2", date: "2026-06-13", time: "16:00", group: "B", matchday: 1, home: t.QAT, away: t.SUI, venue: "Vancouver", status: "upcoming" },
  { id: "B3", date: "2026-06-18", time: "16:00", group: "B", matchday: 2, home: t.SUI, away: t.BIH, venue: "Seattle", status: "upcoming" },
  { id: "B4", date: "2026-06-18", time: "19:00", group: "B", matchday: 2, home: t.CAN, away: t.QAT, venue: "Vancouver", status: "upcoming" },
  { id: "B5", date: "2026-06-24", time: "16:00", group: "B", matchday: 3, home: t.SUI, away: t.CAN, venue: "Toronto", status: "upcoming" },
  { id: "B6", date: "2026-06-24", time: "16:00", group: "B", matchday: 3, home: t.BIH, away: t.QAT, venue: "Seattle", status: "upcoming" },
  // GRUPO C
  { id: "C1", date: "2026-06-13", time: "19:00", group: "C", matchday: 1, home: t.BRA, away: t.MAR, venue: "Los Ángeles", status: "upcoming" },
  { id: "C2", date: "2026-06-13", time: "22:00", group: "C", matchday: 1, home: t.HAI, away: t.SCO, venue: "Kansas City", status: "upcoming" },
  { id: "C3", date: "2026-06-19", time: "19:00", group: "C", matchday: 2, home: t.SCO, away: t.MAR, venue: "Dallas", status: "upcoming" },
  { id: "C4", date: "2026-06-19", time: "21:30", group: "C", matchday: 2, home: t.BRA, away: t.HAI, venue: "Philadelphia", status: "upcoming" },
  { id: "C5", date: "2026-06-24", time: "19:00", group: "C", matchday: 3, home: t.SCO, away: t.BRA, venue: "Atlanta", status: "upcoming" },
  { id: "C6", date: "2026-06-24", time: "19:00", group: "C", matchday: 3, home: t.MAR, away: t.HAI, venue: "Boston", status: "upcoming" },
  // GRUPO D
  { id: "D1", date: "2026-06-12", time: "22:00", group: "D", matchday: 1, home: t.USA, away: t.PAR, venue: "Los Ángeles", status: "upcoming" },
  { id: "D2", date: "2026-06-14", time: "01:00", group: "D", matchday: 1, home: t.AUS, away: t.TUR, venue: "Dallas", status: "upcoming" },
  { id: "D3", date: "2026-06-20", time: "00:00", group: "D", matchday: 2, home: t.TUR, away: t.PAR, venue: "San Francisco", status: "upcoming" },
  { id: "D4", date: "2026-06-19", time: "16:00", group: "D", matchday: 2, home: t.USA, away: t.AUS, venue: "New York", status: "upcoming" },
  { id: "D5", date: "2026-06-25", time: "23:00", group: "D", matchday: 3, home: t.TUR, away: t.USA, venue: "Atlanta", status: "upcoming" },
  { id: "D6", date: "2026-06-25", time: "23:00", group: "D", matchday: 3, home: t.PAR, away: t.AUS, venue: "Dallas", status: "upcoming" },
  // GRUPO E
  { id: "E1", date: "2026-06-14", time: "14:00", group: "E", matchday: 1, home: t.GER, away: t.CUW, venue: "San Francisco", status: "upcoming" },
  { id: "E2", date: "2026-06-14", time: "20:00", group: "E", matchday: 1, home: t.CIV, away: t.ECU, venue: "Houston", status: "upcoming" },
  { id: "E3", date: "2026-06-20", time: "17:00", group: "E", matchday: 2, home: t.GER, away: t.CIV, venue: "Philadelphia", status: "upcoming" },
  { id: "E4", date: "2026-06-20", time: "21:00", group: "E", matchday: 2, home: t.ECU, away: t.CUW, venue: "Miami", status: "upcoming" },
  { id: "E5", date: "2026-06-25", time: "17:00", group: "E", matchday: 3, home: t.ECU, away: t.GER, venue: "Seattle", status: "upcoming" },
  { id: "E6", date: "2026-06-25", time: "17:00", group: "E", matchday: 3, home: t.CUW, away: t.CIV, venue: "San Francisco", status: "upcoming" },
  // GRUPO F
  { id: "F1", date: "2026-06-14", time: "17:00", group: "F", matchday: 1, home: t.NED, away: t.JPN, venue: "New York", status: "upcoming" },
  { id: "F2", date: "2026-06-14", time: "23:00", group: "F", matchday: 1, home: t.SWE, away: t.TUN, venue: "Kansas City", status: "upcoming" },
  { id: "F3", date: "2026-06-20", time: "14:00", group: "F", matchday: 2, home: t.NED, away: t.SWE, venue: "Boston", status: "upcoming" },
  { id: "F4", date: "2026-06-21", time: "01:00", group: "F", matchday: 2, home: t.TUN, away: t.JPN, venue: "Los Ángeles", status: "upcoming" },
  { id: "F5", date: "2026-06-25", time: "20:00", group: "F", matchday: 3, home: t.JPN, away: t.SWE, venue: "Houston", status: "upcoming" },
  { id: "F6", date: "2026-06-25", time: "20:00", group: "F", matchday: 3, home: t.TUN, away: t.NED, venue: "Philadelphia", status: "upcoming" },
  // GRUPO G
  { id: "G1", date: "2026-06-15", time: "16:00", group: "G", matchday: 1, home: t.BEL, away: t.EGY, venue: "Philadelphia", status: "upcoming" },
  { id: "G2", date: "2026-06-15", time: "22:00", group: "G", matchday: 1, home: t.IRN, away: t.NZL, venue: "Atlanta", status: "upcoming" },
  { id: "G3", date: "2026-06-21", time: "16:00", group: "G", matchday: 2, home: t.BEL, away: t.IRN, venue: "New York", status: "upcoming" },
  { id: "G4", date: "2026-06-21", time: "22:00", group: "G", matchday: 2, home: t.NZL, away: t.EGY, venue: "Seattle", status: "upcoming" },
  { id: "G5", date: "2026-06-27", time: "00:00", group: "G", matchday: 3, home: t.NZL, away: t.BEL, venue: "Dallas", status: "upcoming" },
  { id: "G6", date: "2026-06-27", time: "00:00", group: "G", matchday: 3, home: t.EGY, away: t.IRN, venue: "Kansas City", status: "upcoming" },
  // GRUPO H
  { id: "H1", date: "2026-06-15", time: "13:00", group: "H", matchday: 1, home: t.ESP, away: t.CPV, venue: "Kansas City", status: "upcoming" },
  { id: "H2", date: "2026-06-15", time: "19:00", group: "H", matchday: 1, home: t.KSA, away: t.URU, venue: "San Francisco", status: "upcoming" },
  { id: "H3", date: "2026-06-21", time: "13:00", group: "H", matchday: 2, home: t.ESP, away: t.KSA, venue: "Miami", status: "upcoming" },
  { id: "H4", date: "2026-06-21", time: "19:00", group: "H", matchday: 2, home: t.URU, away: t.CPV, venue: "Houston", status: "upcoming" },
  { id: "H5", date: "2026-06-26", time: "21:00", group: "H", matchday: 3, home: t.URU, away: t.ESP, venue: "Atlanta", status: "upcoming" },
  { id: "H6", date: "2026-06-26", time: "21:00", group: "H", matchday: 3, home: t.CPV, away: t.KSA, venue: "Boston", status: "upcoming" },
  // GRUPO I
  { id: "I1", date: "2026-06-16", time: "16:00", group: "I", matchday: 1, home: t.FRA, away: t.SEN, venue: "San Francisco", status: "upcoming" },
  { id: "I2", date: "2026-06-16", time: "19:00", group: "I", matchday: 1, home: t.IRQ, away: t.NOR, venue: "Los Ángeles", status: "upcoming" },
  { id: "I3", date: "2026-06-22", time: "18:00", group: "I", matchday: 2, home: t.FRA, away: t.IRQ, venue: "Dallas", status: "upcoming" },
  { id: "I4", date: "2026-06-22", time: "21:00", group: "I", matchday: 2, home: t.NOR, away: t.SEN, venue: "Kansas City", status: "upcoming" },
  { id: "I5", date: "2026-06-26", time: "16:00", group: "I", matchday: 3, home: t.NOR, away: t.FRA, venue: "Seattle", status: "upcoming" },
  { id: "I6", date: "2026-06-26", time: "16:00", group: "I", matchday: 3, home: t.SEN, away: t.IRQ, venue: "Houston", status: "upcoming" },
  // GRUPO J
  { id: "J1", date: "2026-06-16", time: "22:00", group: "J", matchday: 1, home: t.ARG, away: t.ALG, venue: "Kansas City", status: "upcoming" },
  { id: "J2", date: "2026-06-17", time: "01:00", group: "J", matchday: 1, home: t.AUT, away: t.JOR, venue: "Dallas", status: "upcoming" },
  { id: "J3", date: "2026-06-22", time: "14:00", group: "J", matchday: 2, home: t.ARG, away: t.AUT, venue: "Dallas", status: "upcoming" },
  { id: "J4", date: "2026-06-23", time: "00:00", group: "J", matchday: 2, home: t.JOR, away: t.ALG, venue: "Miami", status: "upcoming" },
  { id: "J5", date: "2026-06-27", time: "23:00", group: "J", matchday: 3, home: t.JOR, away: t.ARG, venue: "New York", status: "upcoming" },
  { id: "J6", date: "2026-06-27", time: "23:00", group: "J", matchday: 3, home: t.ALG, away: t.AUT, venue: "Boston", status: "upcoming" },
  // GRUPO K
  { id: "K1", date: "2026-06-17", time: "14:00", group: "K", matchday: 1, home: t.POR, away: t.COD, venue: "Boston", status: "upcoming" },
  { id: "K2", date: "2026-06-17", time: "23:00", group: "K", matchday: 1, home: t.UZB, away: t.COL, venue: "Miami", status: "upcoming" },
  { id: "K3", date: "2026-06-23", time: "14:00", group: "K", matchday: 2, home: t.POR, away: t.UZB, venue: "Atlanta", status: "upcoming" },
  { id: "K4", date: "2026-06-23", time: "23:00", group: "K", matchday: 2, home: t.COL, away: t.COD, venue: "San Francisco", status: "upcoming" },
  { id: "K5", date: "2026-06-27", time: "20:30", group: "K", matchday: 3, home: t.COL, away: t.POR, venue: "Philadelphia", status: "upcoming" },
  { id: "K6", date: "2026-06-27", time: "20:30", group: "K", matchday: 3, home: t.COD, away: t.UZB, venue: "Los Ángeles", status: "upcoming" },
  // GRUPO L
  { id: "L1", date: "2026-06-17", time: "17:00", group: "L", matchday: 1, home: t.ENG, away: t.CRO, venue: "Atlanta", status: "upcoming" },
  { id: "L2", date: "2026-06-17", time: "20:00", group: "L", matchday: 1, home: t.GHA, away: t.PAN, venue: "Houston", status: "upcoming" },
  { id: "L3", date: "2026-06-23", time: "17:00", group: "L", matchday: 2, home: t.ENG, away: t.GHA, venue: "New York", status: "upcoming" },
  { id: "L4", date: "2026-06-23", time: "20:00", group: "L", matchday: 2, home: t.PAN, away: t.CRO, venue: "Dallas", status: "upcoming" },
  { id: "L5", date: "2026-06-27", time: "18:00", group: "L", matchday: 3, home: t.PAN, away: t.ENG, venue: "Seattle", status: "upcoming" },
  { id: "L6", date: "2026-06-27", time: "18:00", group: "L", matchday: 3, home: t.CRO, away: t.GHA, venue: "Kansas City", status: "upcoming" },

  // ── 16VOS DE FINAL ────────────────────────────────────────────────
  { id: "P73",  date: "2026-06-28", time: "--:--", group: "16vos", matchday: 1,  home: ph("2° A"),           away: ph("2° B"),           venue: "Los Ángeles",   status: "upcoming" },
  { id: "P74",  date: "2026-06-29", time: "--:--", group: "16vos", matchday: 2,  home: ph("1° E"),           away: ph("3° A/B/C/D/F"),   venue: "Boston",        status: "upcoming" },
  { id: "P75",  date: "2026-06-29", time: "--:--", group: "16vos", matchday: 3,  home: ph("1° F"),           away: ph("2° C"),           venue: "Monterrey",     status: "upcoming" },
  { id: "P76",  date: "2026-06-29", time: "--:--", group: "16vos", matchday: 4,  home: ph("1° C"),           away: ph("2° F"),           venue: "Houston",       status: "upcoming" },
  { id: "P77",  date: "2026-06-30", time: "--:--", group: "16vos", matchday: 5,  home: ph("1° I"),           away: ph("3° C/D/F/G/H"),   venue: "Nueva Jersey",  status: "upcoming" },
  { id: "P78",  date: "2026-06-30", time: "--:--", group: "16vos", matchday: 6,  home: ph("2° E"),           away: ph("2° I"),           venue: "Dallas",        status: "upcoming" },
  { id: "P79",  date: "2026-06-30", time: "--:--", group: "16vos", matchday: 7,  home: ph("1° A"),           away: ph("3° C/E/F/H/I"),   venue: "Ciudad de México", status: "upcoming" },
  { id: "P80",  date: "2026-07-01", time: "--:--", group: "16vos", matchday: 8,  home: ph("1° L"),           away: ph("3° E/H/I/J/K"),   venue: "Atlanta",       status: "upcoming" },
  { id: "P81",  date: "2026-07-01", time: "--:--", group: "16vos", matchday: 9,  home: ph("1° D"),           away: ph("3° B/E/F/I/J"),   venue: "San Francisco", status: "upcoming" },
  { id: "P82",  date: "2026-07-01", time: "--:--", group: "16vos", matchday: 10, home: ph("1° G"),           away: ph("3° A/E/H/I/J"),   venue: "Seattle",       status: "upcoming" },
  { id: "P83",  date: "2026-07-02", time: "--:--", group: "16vos", matchday: 11, home: ph("2° K"),           away: ph("2° L"),           venue: "Toronto",       status: "upcoming" },
  { id: "P84",  date: "2026-07-02", time: "--:--", group: "16vos", matchday: 12, home: ph("1° H"),           away: ph("2° J"),           venue: "Los Ángeles",   status: "upcoming" },
  { id: "P85",  date: "2026-07-02", time: "--:--", group: "16vos", matchday: 13, home: ph("1° B"),           away: ph("3° E/F/G/I/J"),   venue: "Vancouver",     status: "upcoming" },
  { id: "P86",  date: "2026-07-03", time: "--:--", group: "16vos", matchday: 14, home: ph("1° J"),           away: ph("2° H"),           venue: "Miami",         status: "upcoming" },
  { id: "P87",  date: "2026-07-03", time: "--:--", group: "16vos", matchday: 15, home: ph("1° K"),           away: ph("3° D/E/I/J/L"),   venue: "Kansas City",   status: "upcoming" },
  { id: "P88",  date: "2026-07-03", time: "--:--", group: "16vos", matchday: 16, home: ph("2° D"),           away: ph("2° G"),           venue: "Dallas",        status: "upcoming" },

  // ── OCTAVOS DE FINAL ─────────────────────────────────────────────
  { id: "P89",  date: "2026-07-04", time: "--:--", group: "8vos",    matchday: 1, home: ph("Gan. P74"), away: ph("Gan. P77"), venue: "Philadelphia",  status: "upcoming" },
  { id: "P90",  date: "2026-07-04", time: "--:--", group: "8vos",    matchday: 2, home: ph("Gan. P73"), away: ph("Gan. P75"), venue: "Houston",       status: "upcoming" },
  { id: "P91",  date: "2026-07-05", time: "--:--", group: "8vos",    matchday: 3, home: ph("Gan. P76"), away: ph("Gan. P78"), venue: "Nueva Jersey",  status: "upcoming" },
  { id: "P92",  date: "2026-07-05", time: "--:--", group: "8vos",    matchday: 4, home: ph("Gan. P79"), away: ph("Gan. P80"), venue: "Ciudad de México", status: "upcoming" },
  { id: "P93",  date: "2026-07-06", time: "--:--", group: "8vos",    matchday: 5, home: ph("Gan. P83"), away: ph("Gan. P84"), venue: "Dallas",        status: "upcoming" },
  { id: "P94",  date: "2026-07-06", time: "--:--", group: "8vos",    matchday: 6, home: ph("Gan. P81"), away: ph("Gan. P82"), venue: "Seattle",       status: "upcoming" },
  { id: "P95",  date: "2026-07-07", time: "--:--", group: "8vos",    matchday: 7, home: ph("Gan. P86"), away: ph("Gan. P88"), venue: "Atlanta",       status: "upcoming" },
  { id: "P96",  date: "2026-07-07", time: "--:--", group: "8vos",    matchday: 8, home: ph("Gan. P85"), away: ph("Gan. P87"), venue: "Vancouver",     status: "upcoming" },

  // ── CUARTOS DE FINAL ─────────────────────────────────────────────
  { id: "P97",  date: "2026-07-09", time: "--:--", group: "Cuartos", matchday: 1, home: ph("Gan. P89"), away: ph("Gan. P90"), venue: "Boston",        status: "upcoming" },
  { id: "P98",  date: "2026-07-10", time: "--:--", group: "Cuartos", matchday: 2, home: ph("Gan. P93"), away: ph("Gan. P94"), venue: "Los Ángeles",   status: "upcoming" },
  { id: "P99",  date: "2026-07-11", time: "--:--", group: "Cuartos", matchday: 3, home: ph("Gan. P91"), away: ph("Gan. P92"), venue: "Miami",         status: "upcoming" },
  { id: "P100", date: "2026-07-11", time: "--:--", group: "Cuartos", matchday: 4, home: ph("Gan. P95"), away: ph("Gan. P96"), venue: "Kansas City",   status: "upcoming" },

  // ── SEMIFINALES ───────────────────────────────────────────────────
  { id: "P101", date: "2026-07-14", time: "--:--", group: "Semis",   matchday: 1, home: ph("Gan. P97"),  away: ph("Gan. P98"),  venue: "Dallas",        status: "upcoming" },
  { id: "P102", date: "2026-07-15", time: "--:--", group: "Semis",   matchday: 2, home: ph("Gan. P99"),  away: ph("Gan. P100"), venue: "Atlanta",       status: "upcoming" },

  // ── TERCER PUESTO Y FINAL ─────────────────────────────────────────
  { id: "P103", date: "2026-07-18", time: "--:--", group: "3° Puesto", matchday: 1, home: ph("Perd. P101"), away: ph("Perd. P102"), venue: "Miami",       status: "upcoming" },
  { id: "P104", date: "2026-07-19", time: "--:--", group: "Final",     matchday: 1, home: ph("Gan. P101"),  away: ph("Gan. P102"),  venue: "Nueva Jersey", status: "upcoming" },
];

export function groupByDate(list: Match[]): Record<string, Match[]> {
  return list.reduce((acc, m) => {
    if (!acc[m.date]) acc[m.date] = [];
    acc[m.date].push(m);
    return acc;
  }, {} as Record<string, Match[]>);
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio"];
  return `${days[d.getDay()]} ${day} de ${months[month - 1]}`;
}
