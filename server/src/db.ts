import pg from "pg";

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://meteo:meteo@localhost:5432/meteo",
});
