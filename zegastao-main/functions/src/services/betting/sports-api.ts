// Client para API-Football (RapidAPI) e The Odds API.
// Plano free: API-Football 100 req/dia, The Odds API 500 req/mês.

const API_FOOTBALL_BASE = 'https://v3.football.api-sports.io';
const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';

function footballHeaders(): Record<string, string> {
  const key = process.env.API_FOOTBALL_KEY || '';
  return { 'x-apisports-key': key };
}

function oddsHeaders(): Record<string, string> {
  return {}; // key vai via query param
}

async function fetchJSON<T>(url: string, headers: Record<string, string>): Promise<T> {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json() as Promise<T>;
}

// ---- API-Football ----

export interface APIFootballFixture {
  fixture: { id: number; date: string; status: { short: string } };
  teams: { home: { id: number; name: string }; away: { id: number; name: string } };
  goals: { home: number | null; away: number | null };
  league: { id: number; name: string; country: string };
}

export interface APIFootballTeamStats {
  fixtures: { wins: { total: number }; draws: { total: number }; loses: { total: number }; played: { total: number } };
  goals: { for: { total: { total: number }; average: { total: string } }; against: { total: { total: number } } };
}

export async function getFixturesByTeam(teamId: number, last = 5): Promise<APIFootballFixture[]> {
  const url = `${API_FOOTBALL_BASE}/fixtures?team=${teamId}&last=${last}&status=FT`;
  const data = await fetchJSON<{ response: APIFootballFixture[] }>(url, footballHeaders());
  return data.response;
}

export async function getH2H(teamA: number, teamB: number, last = 10): Promise<APIFootballFixture[]> {
  const url = `${API_FOOTBALL_BASE}/fixtures/headtohead?h2h=${teamA}-${teamB}&last=${last}`;
  const data = await fetchJSON<{ response: APIFootballFixture[] }>(url, footballHeaders());
  return data.response;
}

export async function getFixtureStatistics(fixtureId: number): Promise<unknown> {
  const url = `${API_FOOTBALL_BASE}/fixtures/statistics?fixture=${fixtureId}`;
  const data = await fetchJSON<{ response: unknown[] }>(url, footballHeaders());
  return data.response;
}

export async function getFixtureLineups(fixtureId: number): Promise<unknown> {
  const url = `${API_FOOTBALL_BASE}/fixtures/lineups?fixture=${fixtureId}`;
  const data = await fetchJSON<{ response: unknown[] }>(url, footballHeaders());
  return data.response;
}

export async function getInjuries(teamId: number, fixtureId?: number): Promise<unknown[]> {
  let url = `${API_FOOTBALL_BASE}/injuries?team=${teamId}`;
  if (fixtureId) url += `&fixture=${fixtureId}`;
  const data = await fetchJSON<{ response: unknown[] }>(url, footballHeaders());
  return data.response;
}

export async function searchFixture(homeTeam: string, awayTeam: string, date: string): Promise<APIFootballFixture[]> {
  const url = `${API_FOOTBALL_BASE}/fixtures?date=${date}`;
  const data = await fetchJSON<{ response: APIFootballFixture[] }>(url, footballHeaders());
  return data.response.filter(
    (f) =>
      f.teams.home.name.toLowerCase().includes(homeTeam.toLowerCase()) ||
      f.teams.away.name.toLowerCase().includes(awayTeam.toLowerCase())
  );
}

// ---- The Odds API ----

export interface OddsMarket {
  key: string;
  title: string;
  outcomes: Array<{ name: string; price: number }>;
}

export interface OddsEvent {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    markets: OddsMarket[];
  }>;
}

export async function getOddsForMatch(
  sport = 'soccer_brazil_serie_a',
  regions = 'eu,us',
  markets = 'h2h,totals,btts'
): Promise<OddsEvent[]> {
  const key = process.env.ODDS_API_KEY || '';
  const url = `${ODDS_API_BASE}/sports/${sport}/odds?apiKey=${key}&regions=${regions}&markets=${markets}&oddsFormat=decimal`;
  return fetchJSON<OddsEvent[]>(url, oddsHeaders());
}
