import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
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
        humidity_percent: 80,
        rainfall_mm: 0,
        forecast_periods: [{ label: 'Now', forecast: 'Cloudy' }],
        daily_forecast: [
          { date: '2026-05-04', forecast: 'Cloudy', temperature_low_c: 25, temperature_high_c: 32 },
        ],
        wind_speed_knots: 4,
        wind_direction_degrees: 180,
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

  it('persists one history reading for every successful create and refresh', async () => {
    const created = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.37, longitude: 103.87 })
      .expect(201);

    await request(app).post(`/api/locations/${created.body.id}/refresh`).expect(200);

    const response = await request(app)
      .get(`/api/locations/${created.body.id}/history`)
      .expect(200);

    expect(response.body).toEqual({
      location_id: created.body.id,
      readings: [
        {
          recorded_at: expect.any(String),
          observed_at: weather.observed_at,
          temperature_c: 29,
          rainfall_mm: 0,
          humidity_percent: 80,
        },
        {
          recorded_at: expect.any(String),
          observed_at: weather.observed_at,
          temperature_c: 29,
          rainfall_mm: 0,
          humidity_percent: 80,
        },
      ],
    });
  });

  it('retains null readings and rolls back the latest snapshot when history insertion fails', async () => {
    const created = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.38, longitude: 103.88 })
      .expect(201);
    const { getLocation, getLocationHistory, updateWeather } = await import('../db.js');
    const locationId = created.body.id;

    await updateWeather(locationId, {
      ...weather,
      observed_at: null,
      temperature_c: null,
      rainfall_mm: null,
      humidity_percent: null,
    });
    const nullHistory = await getLocationHistory(locationId, 10);
    expect(nullHistory?.at(-1)).toMatchObject({
      observed_at: null,
      temperature_c: null,
      rainfall_mm: null,
      humidity_percent: null,
    });

    const before = await getLocation(locationId);
    const beforeHistory = await getLocationHistory(locationId, 10);
    const directDatabase = new DatabaseSync(process.env.DATABASE_PATH!);
    directDatabase.exec(
      `CREATE TRIGGER history_insert_abort
       BEFORE INSERT ON weather_readings
       BEGIN SELECT RAISE(ABORT, 'history insert failed'); END;`,
    );

    try {
      await expect(updateWeather(locationId, { ...weather, condition: 'Stormy' })).rejects.toThrow(
        'Failed query',
      );
    } finally {
      directDatabase.exec('DROP TRIGGER history_insert_abort');
      directDatabase.close();
    }

    expect(await getLocation(locationId)).toEqual(before);
    expect(await getLocationHistory(locationId, 10)).toEqual(beforeHistory);
  });

  it('returns the newest bounded window in deterministic chronological order', async () => {
    const created = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.39, longitude: 103.89 })
      .expect(201);
    const { updateWeather } = await import('../db.js');

    for (const temperatureC of [21, 22, 23]) {
      await updateWeather(created.body.id, { ...weather, temperature_c: temperatureC });
    }

    const directDatabase = new DatabaseSync(process.env.DATABASE_PATH!);
    directDatabase
      .prepare('UPDATE weather_readings SET recorded_at = ? WHERE location_id = ?')
      .run('2026-05-04T00:00:00.000Z', created.body.id);
    directDatabase.close();

    const smallLimit = await request(app)
      .get(`/api/locations/${created.body.id}/history?limit=2`)
      .expect(200);
    expect(smallLimit.body.readings.map((reading: { temperature_c: number }) => reading.temperature_c)).toEqual([
      22,
      23,
    ]);

    const allReadings = await request(app)
      .get(`/api/locations/${created.body.id}/history?limit=10`)
      .expect(200);
    expect(allReadings.body.readings.map((reading: { temperature_c: number }) => reading.temperature_c)).toEqual([
      29,
      21,
      22,
      23,
    ]);
  });

  it('caps history at the newest 1000 readings for each location', async () => {
    const created = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.4, longitude: 103.9 })
      .expect(201);
    const { updateWeather } = await import('../db.js');

    for (let temperatureC = 0; temperatureC < 1000; temperatureC += 1) {
      await updateWeather(created.body.id, { ...weather, temperature_c: temperatureC });
    }

    const defaultResponse = await request(app)
      .get(`/api/locations/${created.body.id}/history`)
      .expect(200);
    expect(defaultResponse.body.readings).toHaveLength(240);
    expect(defaultResponse.body.readings[0].temperature_c).toBe(760);
    expect(defaultResponse.body.readings.at(-1).temperature_c).toBe(999);

    const cappedResponse = await request(app)
      .get(`/api/locations/${created.body.id}/history?limit=1001`)
      .expect(200);
    expect(cappedResponse.body.readings).toHaveLength(1000);
    expect(cappedResponse.body.readings[0].temperature_c).toBe(0);
    expect(cappedResponse.body.readings.at(-1).temperature_c).toBe(999);
  });

  it('does not create history when the weather provider refresh fails', async () => {
    const { createLocationsRouter } = await import('./locations.js');
    const express = (await import('express')).default;
    const unavailableApp = express();
    unavailableApp.use(express.json());
    unavailableApp.use(
      '/api',
      createLocationsRouter({
        weatherClient: {
          async getCurrentWeather() {
            throw new WeatherProviderError('weather provider unavailable');
          },
          async getForecastAreas() {
            return [];
          },
        },
      }),
    );

    const created = await request(unavailableApp)
      .post('/api/locations')
      .send({ latitude: 1.42, longitude: 103.92 })
      .expect(201);
    const history = await request(unavailableApp)
      .get(`/api/locations/${created.body.id}/history`)
      .expect(200);

    expect(history.body.readings).toEqual([]);
  });

  it('cascades history deletion and returns approved history errors', async () => {
    const created = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.41, longitude: 103.91 })
      .expect(201);

    await request(app).get('/api/locations/invalid/history').expect(400, {
      detail: 'locationId must be a positive integer',
    });
    await request(app).get(`/api/locations/${created.body.id}/history?limit=0`).expect(400, {
      detail: 'limit must be a positive integer',
    });
    await request(app).get('/api/locations/99999/history').expect(404, {
      detail: 'Location not found',
    });

    await request(app).delete(`/api/locations/${created.body.id}`).expect(204);
    const directDatabase = new DatabaseSync(process.env.DATABASE_PATH!);
    const readingCount = directDatabase
      .prepare('SELECT COUNT(*) AS count FROM weather_readings WHERE location_id = ?')
      .get(created.body.id) as { count: number };
    directDatabase.close();
    expect(readingCount.count).toBe(0);
    await request(app).get(`/api/locations/${created.body.id}/history`).expect(404, {
      detail: 'Location not found',
    });
  });
});
