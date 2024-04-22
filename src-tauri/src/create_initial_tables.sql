CREATE TABLE settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    value TEXT DEFAULT NULL
);

INSERT INTO settings (name, value) VALUES ('tv_dir', NULL);
INSERT INTO settings (name, value) VALUES ('movie_dir', NULL);
INSERT INTO settings (name, value) VALUES ('tvdb_apikey', NULL);
INSERT INTO settings (name, value) VALUES ('tvdb_pin', NULL);
INSERT INTO settings (name, value) VALUES ('mpv_watched_dir', NULL);
INSERT INTO settings (name, value) VALUES ('youtube_api_key', NULL);

CREATE TABLE items (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    created_at INTEGER DEFAULT NULL,
    updated_at INTEGER DEFAULT NULL,
    is_archived INTEGER DEFAULT NULL,
    type TEXT DEFAULT NULL,
    source TEXT DEFAULT NULL,
    name TEXT DEFAULT NULL,
    tvdb_id INTEGER DEFAULT NULL,
    tvdb_slug TEXT DEFAULT NULL,
    last_watched_at INTEGER DEFAULT NULL,
    artwork_filename TEXT DEFAULT NULL,
    dir_name TEXT DEFAULT NULL UNIQUE,
    pathname TEXT DEFAULT NULL,
    filename TEXT DEFAULT NULL,
    url TEXT DEFAULT NULL,
    duration TEXT DEFAULT NULL,
    current_episode_id INTEGER DEFAULT 0
);

CREATE TABLE episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    created_at INTEGER DEFAULT NULL,
    updated_at INTEGER DEFAULT NULL,
    item_id INTEGER DEFAULT NULL,
    pathname TEXT DEFAULT NULL,
    filename TEXT DEFAULT NULL,
    url TEXT DEFAULT NULL,
    season_num INTEGER DEFAULT NULL,
    episode_num INTEGER DEFAULT NULL,
    order_num INTEGER DEFAULT NULL,
    name TEXT DEFAULT NULL,
    overview TEXT DEFAULT NULL,
    released_on INTEGER DEFAULT NULL,
    duration TEXT DEFAULT NULL
);

-- CREATE TABLE external_items (
--     id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
--     created_at INTEGER DEFAULT NULL,
--     updated_at INTEGER DEFAULT NULL,
--     is_archived INTEGER DEFAULT 0,
--     type TEXT DEFAULT NULL,
--     name TEXT DEFAULT NULL,
--     tvdb_id INTEGER DEFAULT NULL,
--     tvdb_slug TEXT DEFAULT NULL,
--     last_watched_at INTEGER DEFAULT NULL,
--     artwork_filename TEXT DEFAULT NULL,
--     url TEXT DEFAULT NULL
-- );

-- CREATE TABLE movies (
--     id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
--     created_at INTEGER DEFAULT NULL,
--     updated_at INTEGER DEFAULT NULL,
--     is_archived INTEGER DEFAULT 0,
--     name TEXT NOT NULL,
--     pathname TEXT NOT NULL,
--     filename TEXT NOT NULL,
--     tvdb_id INTEGER DEFAULT NULL,
--     tvdb_slug TEXT DEFAULT NULL,
--     duration TEXT DEFAULT NULL,
--     last_watched_at INTEGER DEFAULT NULL,
--     artwork_filename TEXT DEFAULT NULL
-- );

CREATE TABLE tvdb_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    created_at INTEGER DEFAULT NULL,
    token TEXT NOT NULL
);