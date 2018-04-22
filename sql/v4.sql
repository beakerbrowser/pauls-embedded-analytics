-- add indexes to speed up queries

CREATE INDEX events_url_index ON events (url);
CREATE INDEX events_extra_event_id ON events_extra (event_id);

PRAGMA user_version = 4;