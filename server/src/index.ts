import { createApp } from "./app.js";
import { pool } from "./db.js";

const port = Number(process.env.PORT ?? 3000);
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  console.error("JWT_SECRET is not set");
  process.exit(1);
}

createApp(pool, jwtSecret).listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
