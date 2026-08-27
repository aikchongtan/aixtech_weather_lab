import type { CreateLocationPayload, ForecastArea, Location, LocationHistory } from './types';

const API_BASE = '/api';

interface LocationsResponse {
  locations: Location[];
}

interface ForecastAreasResponse {
  areas: ForecastArea[];
}

interface ApiError {
  detail?: string;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(error.detail || 'Request failed');
  }
  if (response.status === 204) return null as T;
  return (await response.json()) as T;
}

export const listLocations = () => request<LocationsResponse>('/locations');

export const listForecastAreas = () => request<ForecastAreasResponse>('/forecast-areas');

export const createLocation = (payload: CreateLocationPayload) =>
  request<Location>('/locations', { method: 'POST', body: JSON.stringify(payload) });

export const refreshLocation = (id: number) =>
  request<Location>(`/locations/${id}/refresh`, { method: 'POST' });

export const deleteLocation = (id: number) =>
  request<void>(`/locations/${id}`, { method: 'DELETE' });

export async function getLocation(id: number): Promise<Location | null> {
  const response = await fetch(`${API_BASE}/locations/${id}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(body.detail || 'Request failed');
  }
  return (await response.json()) as Location;
}

export async function getLocationHistory(id: number, limit?: number): Promise<LocationHistory | null> {
  const query = limit !== undefined ? `?limit=${encodeURIComponent(limit)}` : '';
  const response = await fetch(`${API_BASE}/locations/${id}/history${query}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(body.detail || 'Request failed');
  }
  return (await response.json()) as LocationHistory;
}

export function logInteraction(event: string, metadata: object = {}) {
  const page = typeof window === 'undefined' ? undefined : window.location.pathname;
  void fetch(`${API_BASE}/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, metadata, page }),
    keepalive: true,
  }).catch(() => {});
}
