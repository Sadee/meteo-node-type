-- Directors (HQ) manage sites and create manager accounts; managers see the sites assigned to them.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('director', 'manager'));

-- Demo accounts; all use the password "password123". Safe to re-run.
INSERT INTO users (name, email, password_hash, role) VALUES
  ('Demo Director', 'director@example.com', '$2a$10$uXZiExI5inNurSwW7am30uiYzq.mNRTvvqaZcjT5sCKvBBCAKa4k2', 'director'),
  ('Mia Manager',   'manager1@example.com', '$2a$10$uXZiExI5inNurSwW7am30uiYzq.mNRTvvqaZcjT5sCKvBBCAKa4k2', 'manager'),
  ('Max Manager',   'manager2@example.com', '$2a$10$uXZiExI5inNurSwW7am30uiYzq.mNRTvvqaZcjT5sCKvBBCAKa4k2', 'manager')
ON CONFLICT (email) DO NOTHING;
