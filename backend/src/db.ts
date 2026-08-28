import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { and, asc, desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { migrate } from 'drizzle-orm/sqlite-proxy/migrator';
import { locations, weatherReadings, type WeatherSnapshot } from './schema.js';

export interface LocationRecord {
  id: number;
  latitude: number;
  longitude: number;
  created_at: string;
  is_primary: boolean;
  weather: WeatherSnapshot;
}

export interface WeatherReadingRecord {
  recorded_at: string;
  observed_at: string | null;
  temperature_c: number | null;
  rainfall_mm: number | null;
  humidity_percent: number | null;
}

type LocationRow = typeof locations.$inferSelect;
type WeatherReadingRow = typeof weatherReadings.$inferSelect;

const defaultWeather: WeatherSnapshot = {
  condition: 'Not refreshed',
  observed_at: null,
  source: 'not-refreshed',
  area: null,
  valid_period_text: null,
  temperature_c: null,
  humidity_percent: null,
  rainfall_mm: null,
  wind_speed_knots: null,
  wind_direction_degrees: null,
  forecast_low_c: null,
  forecast_high_c: null,
  uv_index: null,
  psi_twenty_four_hourly: null,
  pm25_one_hourly: null,
  air_quality_region: null,
  forecast_periods: [],
  daily_forecast: [],
};

const databasePath = process.env.DATABASE_PATH ?? join(process.cwd(), 'backend', 'weather.db');
mkdirSync(dirname(databasePath), { recursive: true });

const sqlite = new DatabaseSync(databasePath);
sqlite.exec('PRAGMA journal_mode = WAL');
sqlite.exec('PRAGMA foreign_keys = ON');
const db = drizzle(sqliteCallback, { schema: { locations, weatherReadings } });
await migrate(
  db,
  async (migrationQueries) => {
    for (const query of migrationQueries) {
      const trimmed = query.trim();
      if (trimmed) sqlite.exec(trimmed);
    }
  },
  { migrationsFolder: join(process.cwd(), 'backend', 'drizzle') },
);

export async function listLocations(): Promise<LocationRecord[]> {
  return (
    await db.select().from(locations).orderBy(desc(locations.isPrimary), asc(locations.sortOrder)).all()
  ).map(rowToRecord);
}

export async function createLocation(latitude: number, longitude: number): Promise<LocationRecord> {
  const duplicate = await db
    .select({ id: locations.id })
    .from(locations)
    .where(and(eq(locations.latitude, latitude), eq(locations.longitude, longitude)))
    .get();

  if (duplicate) {
    const error = new Error('Location already exists');
    error.name = 'DuplicateLocationError';
    throw error;
  }

  const createdAt = new Date().toISOString().slice(0, 19);
  const weather = weatherToColumns(defaultWeather);

  let row!: LocationRow;
  sqlite.exec('BEGIN');
  try {
    const agg = sqlite
      .prepare('SELECT COUNT(*) AS cnt, MAX(sort_order) AS max_order FROM locations')
      .get() as { cnt: number; max_order: number | null };
    const sortOrder = (agg.max_order ?? 0) + 1;
    const isPrimary = agg.cnt === 0 ? 1 : 0;
    row = await db
      .insert(locations)
      .values({ latitude, longitude, createdAt, sortOrder, isPrimary, ...weather })
      .returning()
      .get();
    sqlite.exec('COMMIT');
  } catch (error) {
    sqlite.exec('ROLLBACK');
    throw error;
  }

  return rowToRecord(row);
}

export async function getLocation(id: number): Promise<LocationRecord | null> {
  const row = await db.select().from(locations).where(eq(locations.id, id)).get();
  return row ? rowToRecord(row) : null;
}

export async function deleteLocation(id: number): Promise<boolean> {
  sqlite.exec('BEGIN');
  try {
    const existing = await db
      .select({ id: locations.id, isPrimary: locations.isPrimary })
      .from(locations)
      .where(eq(locations.id, id))
      .get();
    if (!existing) {
      sqlite.exec('ROLLBACK');
      return false;
    }
    await db.delete(locations).where(eq(locations.id, id)).run();
    if (existing.isPrimary === 1) {
      const next = await db
        .select({ id: locations.id })
        .from(locations)
        .orderBy(asc(locations.sortOrder))
        .limit(1)
        .get();
      if (next) {
        await db.update(locations).set({ isPrimary: 1 }).where(eq(locations.id, next.id)).run();
      }
    }
    sqlite.exec('COMMIT');
    return true;
  } catch (error) {
    sqlite.exec('ROLLBACK');
    throw error;
  }
}

export async function getLocationHistory(
  locationId: number,
  limit: number,
): Promise<WeatherReadingRecord[] | null> {
  const location = await db
    .select({ id: locations.id })
    .from(locations)
    .where(eq(locations.id, locationId))
    .get();
  if (!location) return null;

  const newestFirst = await db
    .select()
    .from(weatherReadings)
    .where(eq(weatherReadings.locationId, locationId))
    .orderBy(desc(weatherReadings.recordedAt), desc(weatherReadings.id))
    .limit(limit)
    .all();

  return newestFirst.reverse().map(readingRowToRecord);
}

export async function updateWeather(
  id: number,
  weather: WeatherSnapshot,
): Promise<LocationRecord | null> {
  const columns = weatherToColumns(weather);
  const recordedAt = new Date().toISOString();

  sqlite.exec('BEGIN');
  try {
    const row = await db.update(locations).set(columns).where(eq(locations.id, id)).returning().get();
    if (!row) {
      sqlite.exec('ROLLBACK');
      return null;
    }

    await db
      .insert(weatherReadings)
      .values({
        locationId: id,
        recordedAt,
        observedAt: weather.observed_at,
        temperatureC: weather.temperature_c,
        rainfallMm: weather.rainfall_mm,
        humidityPercent: weather.humidity_percent,
      })
      .run();

    sqlite
      .prepare(
        `DELETE FROM weather_readings
         WHERE location_id = ?
           AND id NOT IN (
             SELECT id
             FROM weather_readings
             WHERE location_id = ?
             ORDER BY recorded_at DESC, id DESC
             LIMIT 1000
           )`,
      )
      .run(id, id);

    sqlite.exec('COMMIT');
    return rowToRecord(row);
  } catch (error) {
    sqlite.exec('ROLLBACK');
    throw error;
  }
}

export function closeDatabase(): void {
  sqlite.close();
}

export async function resetStore(): Promise<void> {
  await db.delete(locations).run();
  sqlite
    .prepare("DELETE FROM sqlite_sequence WHERE name IN ('locations', 'weather_readings')")
    .run();
}

function weatherToColumns(weather: WeatherSnapshot) {
  return {
    condition: weather.condition,
    observedAt: weather.observed_at,
    source: weather.source,
    area: weather.area,
    validPeriodText: weather.valid_period_text,
    temperatureC: weather.temperature_c,
    humidityPercent: weather.humidity_percent,
    rainfallMm: weather.rainfall_mm,
    windSpeedKnots: weather.wind_speed_knots,
    windDirectionDegrees: weather.wind_direction_degrees,
    forecastLowC: weather.forecast_low_c,
    forecastHighC: weather.forecast_high_c,
    uvIndex: weather.uv_index,
    psiTwentyFourHourly: weather.psi_twenty_four_hourly,
    pm25OneHourly: weather.pm25_one_hourly,
    airQualityRegion: weather.air_quality_region,
    forecastPeriods: weather.forecast_periods,
    dailyForecast: weather.daily_forecast,
  };
}

function rowToRecord(row: LocationRow): LocationRecord {
  return {
    id: row.id,
    latitude: row.latitude,
    longitude: row.longitude,
    created_at: row.createdAt,
    is_primary: row.isPrimary !== 0,
    weather: {
      condition: row.condition,
      observed_at: row.observedAt,
      source: row.source,
      area: row.area,
      valid_period_text: row.validPeriodText,
      temperature_c: row.temperatureC,
      humidity_percent: row.humidityPercent,
      rainfall_mm: row.rainfallMm,
      wind_speed_knots: row.windSpeedKnots,
      wind_direction_degrees: row.windDirectionDegrees,
      forecast_low_c: row.forecastLowC,
      forecast_high_c: row.forecastHighC,
      uv_index: row.uvIndex,
      psi_twenty_four_hourly: row.psiTwentyFourHourly,
      pm25_one_hourly: row.pm25OneHourly,
      air_quality_region: row.airQualityRegion,
      forecast_periods: row.forecastPeriods,
      daily_forecast: row.dailyForecast,
    },
  };
}

function readingRowToRecord(row: WeatherReadingRow): WeatherReadingRecord {
  return {
    recorded_at: row.recordedAt,
    observed_at: row.observedAt,
    temperature_c: row.temperatureC,
    rainfall_mm: row.rainfallMm,
    humidity_percent: row.humidityPercent,
  };
}

async function sqliteCallback(
  sql: string,
  params: unknown[],
  method: 'run' | 'all' | 'values' | 'get',
): Promise<{ rows: unknown[] }> {
  const statement = sqlite.prepare(sql);
  const bindings = params as never[];
  if (method === 'run') {
    statement.run(...bindings);
    return { rows: [] };
  }
  if (method === 'get') {
    const row = statement.get(...bindings) as Record<string, unknown> | undefined;
    return { rows: row ? Object.values(row) : (undefined as unknown as unknown[]) };
  }
  const rows = statement.all(...bindings) as Record<string, unknown>[];
  if (method === 'values') {
    return { rows: rows.map((row) => Object.values(row)) };
  }
  return { rows: rows.map((row) => Object.values(row)) };
}
