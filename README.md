# Playa

A Windows desktop application for tracking and playing shows and movies.

- Scan local folders for tv shows and movies
- Add links to external shows and movies
- Manually select current episode
- Show/hide or archive finished media
- Fetch media info and artwork from thetvdb.com (requires a paid individual [API key](https://developer.themoviedb.org/docs/getting-started))
- Fetch youtube playlist information (requires a [YouTube Data API key](https://developers.google.com/youtube/registering_an_application))
  - Auto-update yt playlists once per week
- Display runtime info from local files / TVDB
- Display current file position (local files only) — requires [MPV](https://mpv.io/) with the following [config options](https://mpv.io/manual/stable/#configuration-files):
  - `save-position-on-quit`
  - `write-filename-in-watch-later-config`
  - `ignore-path-in-watch-later-config`

## Made With ❤️

- [Tauri](https://tauri.app/)
- [Tailwind](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)
- [Vue](https://vuejs.org/)
- More packages in `package.json` and `src-tauri\Cargo.tml`

## Installation

I made Playa for my own personal use and **cannot guarantee its safety, security, or proper operation**. Therefore, no installer file is available, and any use of this code is at your own risk.

1. Install [MPV](https://mpv.io/) and add the options noted above to your mpv config file
1. Obtain your TVDB and/or youtube data API keys if desired
1. Arrange your local media files into the structure noted below
1. Install Rust, Node.js, and all other Tauri v1 dependencies ([instructions](https://tauri.app/v1/guides/getting-started/prerequisites))
1. Clone the repository
1. Run `npm install`
1. Run `npm run tauri build` (or `npm run tauri dev` for testing)
1. Add all applicable info to the Settings page
1. On the Home page, use the Scan for Updates or Add Item buttons to add media
1. Keyboard controls: ← → to navigate items, ↑ ↓ to select an episode, spacebar to play

## Local Directory Structure

- TV Folder
  - Show Name
    - [Any Folder Structure]
      - Show.Name.YEAR.S02E12.Episode.12.Title.1080p.Whatever.mkv
      - Show.Name.YEAR.S02E13.Episode.13.Title.1080p.Whatever.avi
  - Show Name
    - Show.Name.YEAR.S01E08.Episode.8.Title.1080p.Whatever.mp4

- Movies Folder
  - Movie.Name.Year.1080p.Whatever.mkv
  - [Any Folder Structure]
    - Movie.Name.Year.1080p.Whatever.mp4