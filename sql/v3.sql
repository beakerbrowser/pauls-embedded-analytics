CREATE TABLE cohorts (
  subject TEXT PRIMARY KEY NOT NULL,
  campaign TEXT NOT NULL,
  cohort TEXT NOT NULL,
  state TEXT NOT NULL
);

PRAGMA user_version = 3;
