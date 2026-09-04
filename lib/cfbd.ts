const CFBD_BASE_URL = 'https://api.collegefootballdata.com';

export async function cfbdFetch<T>(
  endpoint: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T> {
  const apiKey = process.env.CFBD_API_KEY;

  if (!apiKey) {
    throw new Error('CFBD_API_KEY is not configured');
  }

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  });

  const url = `${CFBD_BASE_URL}${endpoint}?${searchParams.toString()}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      `CFBD API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}