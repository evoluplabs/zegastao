// Busca partidas por liga + data usando a API-Football.
// Mapeamento de sportKey (The Odds API) para league ID (API-Football).
import { fetchFootballJSON } from './sports-api';

const LEAGUE_ID_MAP: Record<string, number> = {
  soccer_brazil_serie_a:      71,
  soccer_brazil_serie_b:      72,
  soccer_epl:                 39,
  soccer_spain_la_liga:       140,
  soccer_germany_bundesliga:  78,
  soccer_italy_serie_a:       135,
  soccer_france_ligue_one:    61,
  soccer_uefa_champs_league:  2,
};

export function getLeagueId(sportKey: string): number | null {
  return LEAGUE_ID_MAP[sportKey] ?? null;
}

export function getSportKey(leagueId: number): string | null {
  const entry = Object.entries(LEAGUE_ID_MAP).find(([, id]) => id === leagueId);
  return entry ? entry[0] : null;
}

export interface FixtureSummary {
  fixtureId: number;
  homeTeam: string;
  homeTeamId: number;
  awayTeam: string;
  awayTeamId: number;
  kickoff: string; // ISO datetime
  leagueId: number;
  leagueName: string;
}

export async function findFixturesByLeagueAndDate(
  leagueId: number,
  date: string // YYYY-MM-DD
): Promise<FixtureSummary[]> {
  const season = new Date(date).getFullYear();
  const url = `/fixtures?league=${leagueId}&date=${date}&season=${season}`;

  interface APIResp {
    response: {
      fixture: { id: number; date: string };
      teams: { home: { id: number; name: string }; away: { id: number; name: string } };
      league: { id: number; name: string };
    }[];
  }

  const data = await fetchFootballJSON<APIResp>(url);
  return data.response.map((f) => ({
    fixtureId: f.fixture.id,
    homeTeam: f.teams.home.name,
    homeTeamId: f.teams.home.id,
    awayTeam: f.teams.away.name,
    awayTeamId: f.teams.away.id,
    kickoff: f.fixture.date,
    leagueId: f.league.id,
    leagueName: f.league.name,
  }));
}

export async function findFixturesForObjective(
  leagueSportKeys: string[],
  date: string,
  teamPreferences?: string[]
): Promise<FixtureSummary[]> {
  const results: FixtureSummary[] = [];

  for (const key of leagueSportKeys) {
    const leagueId = getLeagueId(key);
    if (!leagueId) continue;
    try {
      const fixtures = await findFixturesByLeagueAndDate(leagueId, date);
      results.push(...fixtures);
    } catch {
      // Silently skip leagues that fail
    }
  }

  if (teamPreferences && teamPreferences.length > 0) {
    const prefs = teamPreferences.map((t) => t.toLowerCase());
    return results.filter((f) =>
      prefs.some((p) => f.homeTeam.toLowerCase().includes(p) || f.awayTeam.toLowerCase().includes(p))
    );
  }

  // Limit to 5 to avoid API quota issues
  return results.slice(0, 5);
}
