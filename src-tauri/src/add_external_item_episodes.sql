ALTER TABLE external_items ADD COLUMN duration TEXT DEFAULT NULL;
ALTER TABLE external_items ADD COLUMN current_episode_id INTEGER DEFAULT NULL;
ALTER TABLE external_items ADD COLUMN order_is_reversed INTEGER DEFAULT NULL;

INSERT INTO settings (name, value) VALUES ('youtube_api_key', NULL);

CREATE TABLE external_item_episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    created_at INTEGER DEFAULT NULL,
    updated_at INTEGER DEFAULT NULL,
    external_item_id INTEGER NOT NULL,
    url TEXT DEFAULT NULL,
    season_num INTEGER DEFAULT NULL,
    episode_num INTEGER DEFAULT NULL,
    name TEXT DEFAULT NULL,
    overview TEXT DEFAULT NULL,
    released_on INTEGER DEFAULT NULL,
    order_num INTEGER DEFAULT NULL,
    duration TEXT DEFAULT NULL
);