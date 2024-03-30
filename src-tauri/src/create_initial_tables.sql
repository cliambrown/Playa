CREATE TABLE shows (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    created_at INTEGER DEFAULT NULL,
    updated_at INTEGER DEFAULT NULL,
    is_archived INTEGER DEFAULT 0,
    name TEXT NOT NULL,
    dir_name TEXT NOT NULL UNIQUE,
    tvdb_id INTEGER DEFAULT NULL,
    tvdb_slug TEXT DEFAULT NULL,
    last_watched_at INTEGER DEFAULT NULL,
    banner_filename TEXT DEFAULT NULL,
    current_episode_id INTEGER DEFAULT NULL
);

CREATE TABLE episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    created_at INTEGER DEFAULT NULL,
    updated_at INTEGER DEFAULT NULL,
    is_archived INTEGER DEFAULT 0,
    show_id INTEGER NOT NULL,
    pathname TEXT NOT NULL,
    filename TEXT NOT NULL,
    season_num INTEGER DEFAULT NULL,
    episode_num INTEGER DEFAULT NULL,
    name TEXT NOT NULL,
    overview TEXT DEFAULT NULL,
    released_on INTEGER DEFAULT NULL,
    duration TEXT DEFAULT NULL,
    searchable_text TEXT DEFAULT NULL
);

CREATE TABLE external_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    created_at INTEGER DEFAULT NULL,
    updated_at INTEGER DEFAULT NULL,
    is_archived INTEGER DEFAULT 0,
    name TEXT NOT NULL,
    tvdb_id INTEGER DEFAULT NULL,
    tvdb_slug TEXT DEFAULT NULL,
    last_watched_at INTEGER DEFAULT NULL,
    banner_filename TEXT DEFAULT NULL,
    url TEXT NOT NULL
);

CREATE TABLE movies (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    created_at INTEGER DEFAULT NULL,
    updated_at INTEGER DEFAULT NULL,
    is_archived INTEGER DEFAULT 0,
    name TEXT NOT NULL,
    pathname TEXT NOT NULL,
    filename TEXT NOT NULL,
    tvdb_id INTEGER DEFAULT NULL,
    tvdb_slug TEXT DEFAULT NULL,
    duration TEXT DEFAULT NULL,
    last_watched_at INTEGER DEFAULT NULL,
    poster_filename TEXT DEFAULT NULL,
    poster_width INTEGER DEFAULT NULL,
    poster_height INTEGER DEFAULT NULL
);

CREATE TABLE settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    value TEXT NOT NULL
);

CREATE TABLE tvdb_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    created_at INTEGER DEFAULT NULL,
    token TEXT NOT NULL
);