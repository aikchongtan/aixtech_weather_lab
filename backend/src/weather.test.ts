import { afterEach, describe, expect, it, vi } from 'vitest';
import { SingaporeWeatherClient } from './weather.js';

const forecastPayload = {
  data: {
    area_metadata: [
      { name: 'Bishan', label_location: { latitude: 1.35, longitude: 103.85 } },
    ],
    items: [
      {
        update_timestamp: '2026-05-04T00:00:00Z',
        forecasts: [{ area: 'Bishan', forecast: 'Cloudy' }],
      },
    ],
  },
};

function readingPayload(value: number | string) {
  return {
    data: {
      stations: [
        { id: 'nearest-without-value', location: { latitude: 1.3501, longitude: 103.8501 } },
        { id: 'nearest-valid', location: { latitude: 1.351, longitude: 103.851 } },
      ],
      readings: [
        {
          timestamp: '2026-05-04T00:05:00Z',
          data: [
            { stationId: 'nearest-without-value', value: 'not-a-number' },
            { stationId: 'nearest-valid', value },
          ],
        },
      ],
    },
  };
}

function jsonResponse(body: object) {
  return new Response(JSON.stringify(body), { status: 200 });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SingaporeWeatherClient current conditions', () => {
  it('uses the nearest station with a valid reading for each current condition', async () => {
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('two-hr-forecast')) return jsonResponse(forecastPayload);
      if (url.includes('air-temperature')) return jsonResponse(readingPayload(30.4));
      if (url.includes('relative-humidity')) return jsonResponse(readingPayload(81));
      if (url.includes('rainfall')) return jsonResponse(readingPayload(0.6));
      throw new Error(`Unexpected request: ${url}`);
    });

    const weather = await new SingaporeWeatherClient({ baseUrl: 'https://weather.test' }).getCurrentWeather(
      1.35,
      103.85,
    );

    expect(weather).toMatchObject({
      condition: 'Cloudy',
      area: 'Bishan',
      temperature_c: 30.4,
      humidity_percent: 81,
      rainfall_mm: 0.6,
    });
  });

  it('keeps successful readings when an optional current-condition source fails', async () => {
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('two-hr-forecast')) return jsonResponse(forecastPayload);
      if (url.includes('air-temperature')) throw new Error('temperature unavailable');
      if (url.includes('relative-humidity')) return jsonResponse(readingPayload(81));
      if (url.includes('rainfall')) return jsonResponse(readingPayload(0.6));
      throw new Error(`Unexpected request: ${url}`);
    });

    const weather = await new SingaporeWeatherClient({ baseUrl: 'https://weather.test' }).getCurrentWeather(
      1.35,
      103.85,
    );

    expect(weather).toMatchObject({
      condition: 'Cloudy',
      temperature_c: null,
      humidity_percent: 81,
      rainfall_mm: 0.6,
    });
  });
});
