CREATE TABLE IF NOT EXISTS sites (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  city        TEXT NOT NULL,
  country     TEXT NOT NULL,
  latitude    DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude   DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  status      TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'inactive', 'closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A site has zero or more managers; a manager can look after several sites.
CREATE TABLE IF NOT EXISTS site_managers (
  site_id     INT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (site_id, user_id)
);
CREATE INDEX IF NOT EXISTS site_managers_user_id_idx ON site_managers (user_id);

-- Sample sites, only seeded into an empty table.
INSERT INTO sites (name, description, city, country, latitude, longitude, status)
SELECT * FROM (VALUES
  ('Stuttgart Assembly', 'Main assembly plant and European logistics hub.', 'Stuttgart', 'Germany', 48.7758, 9.1829, 'active'),
  ('Austin Electronics', 'Control unit and sensor production.', 'Austin', 'United States', 30.2672, -97.7431, 'active'),
  ('Pune Components', 'Machined parts for the Asian market.', 'Pune', 'India', 18.5204, 73.8567, 'inactive'),
  ('Monterrey Expansion', 'New casting facility, construction starts next year.', 'Monterrey', 'Mexico', 25.6866, -100.3161, 'planned')
) AS v(name, description, city, country, latitude, longitude, status)
WHERE NOT EXISTS (SELECT 1 FROM sites);

-- Demo assignments (manager accounts come from 002_user_roles.sql).
INSERT INTO site_managers (site_id, user_id)
SELECT s.id, u.id
FROM (VALUES
  ('Stuttgart Assembly', 'manager1@example.com'),
  ('Austin Electronics', 'manager2@example.com'),
  ('Pune Components',    'manager1@example.com')
) AS v(site, email)
JOIN sites s ON s.name = v.site
JOIN users u ON u.email = v.email
ON CONFLICT DO NOTHING;
