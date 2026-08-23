import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WeatherProviderError, type WeatherSnapshot } from '../weather.js';

const weather: WeatherSnapshot = {
  condition: 'Cloudy',
  observed_at: '2026-05-04T00:00:00Z',
  source: 'test',
  area: 'Bishan',
  valid_period_text: 'Now',
  temperature_c: 29,
  humidity_percent: 80,
  rainfall_mm: 0,
  wind_speed_knots: 4,
  wind_direction_degrees: 180,
  forecast_low_c: 25,
  forecast_high_c: 32,
  uv_index: 7,
  psi_twenty_four_hourly: 42,
  pm25_one_hourly: 9,
  air_quality_region: 'central',
  forecast_periods: [{ label: 'Now', forecast: 'Cloudy' }],
  daily_forecast: [{ date: '2026-05-04', forecast: 'Cloudy', temperature_low_c: 25, temperature_high_c: 32 }],
};

describe('locations API', () => {
  let tempDir: string;
  let app: Awaited<ReturnType<typeof import('../server.js').createApp>>;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'weather-starter-test-'));
    process.env.DATABASE_PATH = join(tempDir, 'weather.db');
    process.env.LOG_LEVEL = 'silent';

    const { createApp } = await import('../server.js');
    app = await createApp({
      serveFrontend: false,
      enableRequestLogging: false,
      weatherClient: {
        async getCurrentWeather() {
          return weather;
        },
        async getForecastAreas() {
          return [
            { name: 'Bishan', latitude: 1.3508, longitude: 103.8489 },
            { name: 'Tampines', latitude: 1.352, longitude: 103.944 },
          ];
        },
      },
    });
  });

  afterAll(async () => {
    const { closeDatabase } = await import('../db.js');
    closeDatabase();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('refreshes weather when a location is created', async () => {
    const response = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.35, longitude: 103.85 })
      .expect(201);

    expect(response.body).toMatchObject({
      id: 1,
      latitude: 1.35,
      longitude: 103.85,
      weather: {
        condition: 'Cloudy',
        area: 'Bishan',
        temperature_c: 29,
      },
    });

    const listResponse = await request(app).get('/api/locations').expect(200);
    expect(listResponse.body.locations).toHaveLength(1);
    expect(listResponse.body.locations[0].weather.condition).toBe('Cloudy');
  });

  it('deletes a saved location', async () => {
    const created = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.36, longitude: 103.86 })
      .expect(201);

    await request(app).delete(`/api/locations/${created.body.id}`).expect(204);

    const listResponse = await request(app).get('/api/locations').expect(200);
    expect(listResponse.body.locations).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: created.body.id })]),
    );
  });

  it('returns 404 when deleting a location that does not exist', async () => {
    const response = await request(app).delete('/api/locations/999').expect(404);

    expect(response.body).toEqual({ detail: 'Location not found' });
  });

  it('lists forecast areas using the application response contract', async () => {
    const response = await request(app).get('/api/forecast-areas').expect(200);

    expect(response.body).toEqual({
      areas: [
        { name: 'Bishan', latitude: 1.3508, longitude: 103.8489 },
        { name: 'Tampines', latitude: 1.352, longitude: 103.944 },
      ],
    });
  });

  it('hides provider errors when forecast areas are unavailable', async () => {
    const { createLocationsRouter } = await import('./locations.js');
    const unavailableApp = (await import('express')).default();
    unavailableApp.use(
      '/api',
      createLocationsRouter({
        weatherClient: {
          async getCurrentWeather() {
            return weather;
          },
          async getForecastAreas() {
            throw new WeatherProviderError('provider credentials leaked');
          },
        },
      }),
    );

    const response = await request(unavailableApp).get('/api/forecast-areas').expect(502);
    expect(response.body).toEqual({ detail: 'Forecast areas are unavailable. Please try again.' });
  });
});
