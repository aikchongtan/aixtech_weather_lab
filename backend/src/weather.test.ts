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

const twentyFourHourPayload = {
  items: [
    {
      update_timestamp: '2026-05-04T00:00:00Z',
      general: { temperature: { low: 25, high: 32 } },
      periods: [
        {
          time: { start: '2026-05-04T06:00:00+08:00', end: '2026-05-04T12:00:00+08:00' },
          regions: { central: 'Cloudy', west: 'Fair' },
        },
      ],
    },
  ],
};

const fourDayPayload = {
  items: [
    {
      update_timestamp: '2026-05-04T00:00:00Z',
      forecasts: [
        { date: '2026-05-04', forecast: 'Cloudy', temperature: { low: 25, high: 32 } },
      ],
    },
  ],
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
      if (url.includes('24-hour-weather-forecast')) return jsonResponse(twentyFourHourPayload);
      if (url.includes('4-day-weather-forecast')) return jsonResponse(fourDayPayload);
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
      forecast_low_c: 25,
      forecast_high_c: 32,
      forecast_periods: [
        { label: '2026-05-04T06:00:00+08:00 to 2026-05-04T12:00:00+08:00', forecast: 'Cloudy' },
      ],
      daily_forecast: [
        { date: '2026-05-04', forecast: 'Cloudy', temperature_low_c: 25, temperature_high_c: 32 },
      ],
    });
  });

  it('keeps successful readings when an optional current-condition source fails', async () => {
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('two-hr-forecast')) return jsonResponse(forecastPayload);
      if (url.includes('air-temperature')) throw new Error('temperature unavailable');
      if (url.includes('relative-humidity')) return jsonResponse(readingPayload(81));
      if (url.includes('rainfall')) return jsonResponse(readingPayload(0.6));
      if (url.includes('24-hour-weather-forecast')) return jsonResponse(twentyFourHourPayload);
      if (url.includes('4-day-weather-forecast')) return jsonResponse(fourDayPayload);
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

  it('maps hourly periods to the nearest region and omits periods without that region', async () => {
    vi.stubGlobal('fetch', async () =>
      jsonResponse({
        items: [
          {
            general: { temperature: { low: 25, high: 32 } },
            periods: [
              {
                time: { start: 'Morning', end: 'Afternoon' },
                regions: { west: 'Fair', central: 'Cloudy' },
              },
              {
                time: { start: 'Afternoon', end: 'Night' },
                regions: { central: 'Showers' },
              },
            ],
          },
        ],
      }),
    );

    const forecast = await new SingaporeWeatherClient({ baseUrl: 'https://weather.test' })
      .fetchTwentyFourHourForecast(1.35, 103.7);

    expect(forecast).toEqual({
      low: 25,
      high: 32,
      periods: [{ label: 'Morning to Afternoon', forecast: 'Fair' }],
      timestamp: null,
    });
  });

  it('keeps daily forecast data when the hourly source fails', async () => {
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('two-hr-forecast')) return jsonResponse(forecastPayload);
      if (url.includes('air-temperature')) return jsonResponse(readingPayload(30.4));
      if (url.includes('relative-humidity')) return jsonResponse(readingPayload(81));
      if (url.includes('rainfall')) return jsonResponse(readingPayload(0.6));
      if (url.includes('24-hour-weather-forecast')) throw new Error('hourly unavailable');
      if (url.includes('4-day-weather-forecast')) return jsonResponse(fourDayPayload);
      throw new Error(`Unexpected request: ${url}`);
    });

    const weather = await new SingaporeWeatherClient({ baseUrl: 'https://weather.test' }).getCurrentWeather(
      1.35,
      103.85,
    );

    expect(weather.forecast_periods).toEqual([]);
    expect(weather.daily_forecast).toEqual([
      { date: '2026-05-04', forecast: 'Cloudy', temperature_low_c: 25, temperature_high_c: 32 },
    ]);
  });

  it('keeps hourly forecast data when the daily source fails', async () => {
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('two-hr-forecast')) return jsonResponse(forecastPayload);
      if (url.includes('air-temperature')) return jsonResponse(readingPayload(30.4));
      if (url.includes('relative-humidity')) return jsonResponse(readingPayload(81));
      if (url.includes('rainfall')) return jsonResponse(readingPayload(0.6));
      if (url.includes('24-hour-weather-forecast')) return jsonResponse(twentyFourHourPayload);
      if (url.includes('4-day-weather-forecast')) throw new Error('daily unavailable');
      throw new Error(`Unexpected request: ${url}`);
    });

    const weather = await new SingaporeWeatherClient({ baseUrl: 'https://weather.test' }).getCurrentWeather(
      1.35,
      103.85,
    );

    expect(weather.forecast_periods).toEqual([
      { label: '2026-05-04T06:00:00+08:00 to 2026-05-04T12:00:00+08:00', forecast: 'Cloudy' },
    ]);
    expect(weather.daily_forecast).toEqual([]);
  });
});
