import { profile } from './data.ts';

export interface LiveData {
  followers: number;
  publicRepos: number;
  latestRepo?: { name: string; url: string };
}

const API = 'https://api.github.com';
const HEADERS = {
  'User-Agent': 'brignano',
  Accept: 'application/vnd.github+json',
};

// Fetches live GitHub stats with a hard timeout. ANY failure (timeout, offline,
// non-200, rate-limit, parse error) resolves to null — this never throws and
// never blocks the card for longer than `timeoutMs`.
export async function fetchLive(timeoutMs = 1500): Promise<LiveData | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const [userRes, reposRes] = await Promise.all([
      fetch(`${API}/users/${profile.username}`, {
        headers: HEADERS,
        signal: controller.signal,
      }),
      fetch(`${API}/users/${profile.username}/repos?sort=updated&per_page=1`, {
        headers: HEADERS,
        signal: controller.signal,
      }),
    ]);

    if (!userRes.ok || !reposRes.ok) return null;

    const user = (await userRes.json()) as {
      followers?: number;
      public_repos?: number;
    };
    const repos = (await reposRes.json()) as Array<{
      name?: string;
      html_url?: string;
    }>;

    const latest = Array.isArray(repos) ? repos[0] : undefined;
    return {
      followers: user.followers ?? 0,
      publicRepos: user.public_repos ?? 0,
      latestRepo:
        latest?.name && latest?.html_url
          ? { name: latest.name, url: latest.html_url }
          : undefined,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
