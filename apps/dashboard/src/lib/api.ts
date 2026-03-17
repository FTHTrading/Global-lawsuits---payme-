const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function api<T = any>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `API error ${res.status}`);
  }

  return res.json();
}

export function fetcher<T = any>(url: string): Promise<T> {
  return api(url);
}
