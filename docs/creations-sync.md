# Bethesda Creations data sync

Bethesda Creations does not provide a public stats API like Nexus Mods. This project uses Playwright browser capture to read the rendered, visible metrics from each Creation page and write them back into `assets/js/site-data.js`.

## First-time setup

```bash
npm install
npx playwright install chromium
npm run cc:login
```

`cc:login` opens Bethesda Creations and saves your local browser login state to `.auth/bethesda-storage.json`.

The `.auth/` folder is ignored by Git and should not be committed.

## Sync data

```bash
npm run cc:sync
```

For debugging with a visible browser:

```bash
npm run cc:sync:headed
```

## How it works

- Reads the `creations` array from `assets/js/site-data.js`.
- Opens every Bethesda Creations link with Playwright.
- Extracts visible page text after rendering.
- Looks for Views, Bookmarks, Likes, Downloads, Plays and Library Adds.
- Updates the matching Creation object with new stats.
- Adds `updatedAt` and `source: "Browser Capture"`.
- If a page fails or no stats are found, the old data is kept.

## Notes

This script does not bypass Bethesda authentication or call hidden private APIs. It only reads the rendered page that a normal browser session can see.
