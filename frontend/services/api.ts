import type {
  WhiskyDetail,
  WhiskySearchResponse,
} from "../types/whisky";

import type {
  ScanResponse,
} from "../types/whisky";

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!rawApiUrl) {
  throw new Error(
    "EXPO_PUBLIC_API_URL is not configured.",
  );
}

const API_BASE_URL = rawApiUrl.replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getJson<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      let message = `API request failed (${response.status})`;

      try {
        const body = (await response.json()) as { detail?: string };
        if (body.detail) {
          message = body.detail;
        }
      } catch {
        // Ignore non-JSON error body.
      }

      throw new ApiError(message, response.status);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function searchWhiskies(
  query: string,
  limit = 20,
): Promise<WhiskySearchResponse> {
  const trimmed = query.trim();
  const params = new URLSearchParams({
    q: trimmed,
    limit: String(limit),
  });

  return getJson<WhiskySearchResponse>(
    `/api/v1/whiskies/search?${params.toString()}`,
  );
}

export async function getWhisky(caskNo: string): Promise<WhiskyDetail> {
  return getJson<WhiskyDetail>(
    `/api/v1/whiskies/${encodeURIComponent(caskNo)}`,
  );
}

export async function scanWhiskyImage(
  imageUri: string,
): Promise<ScanResponse> {
  const formData = new FormData();

  formData.append(
    "image",
    {
      uri: imageUri,
      name: "scan.jpg",
      type: "image/jpeg",
    } as any,
  );

  const response = await fetch(
    `${API_BASE_URL}/api/v1/scan`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Scan failed (${response.status}): ${body}`,
    );
  }

  return response.json();
}