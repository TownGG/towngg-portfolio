import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const metaPath = path.join(root, "assets/data/personal-logs-meta.json");
const releaseVersionPath = path.join(root, "assets/data/release-version.json");
const creationsHistoryPath = path.join(root, "assets/data/creations-history.csv");
const nexusLatestPath = path.join(root, "assets/data/nexus-latest.json");
const nexusHistoryPath = path.join(root, "assets/data/nexus-history.csv");

const STEP = 50_000;
const FIRST_AUTOMATIC_THRESHOLD = 150_000;

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function toNumber(value) {
  const parsed = Number(String(value ?? "0").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (character === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => String(value).trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const headers = rows.shift()?.map((header) => header.trim()) || [];
  return rows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))
  );
}

function readCreationsTotal() {
  if (!fs.existsSync(creationsHistoryPath)) return 0;
  const rows = parseCsv(readText(creationsHistoryPath));
  return rows.reduce((max, row) => Math.max(max, toNumber(row.total_downloads)), 0);
}

function readNexusTotalFromLatest() {
  if (!fs.existsSync(nexusLatestPath)) return 0;
  const payload = readJson(nexusLatestPath);
  const mods = Array.isArray(payload.mods) ? payload.mods : [];
  return mods.reduce((sum, mod) => sum + toNumber(mod.total_downloads), 0);
}

function readNexusTotalFromHistory() {
  if (!fs.existsSync(nexusHistoryPath)) return 0;
  const rows = parseCsv(readText(nexusHistoryPath));
  const latestByMod = new Map();

  rows.forEach((row, index) => {
    const modId = String(row.mod_id || "").trim();
    if (!modId) return;
    const current = latestByMod.get(modId);
    const date = String(row.date || "");
    if (!current || date > current.date || (date === current.date && index > current.index)) {
      latestByMod.set(modId, { date, index, total: toNumber(row.total_downloads) });
    }
  });

  return [...latestByMod.values()].reduce((sum, item) => sum + item.total, 0);
}

function currentMonthLabel() {
  const now = new Date();
  return `${now.getUTCFullYear()}.${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function releaseTimestamp() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const hour = String(now.getUTCHours()).padStart(2, "0");
  const minute = String(now.getUTCMinutes()).padStart(2, "0");
  return `${year}${month}${day}${hour}${minute}`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function milestoneExists(timeline, threshold) {
  return timeline.some((item) =>
    Number(item.downloadThreshold) === threshold
    || String(item.title || "").includes(formatNumber(threshold))
  );
}

function sortTimeline(timeline) {
  return timeline
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const dateOrder = String(b.item.date || "").localeCompare(String(a.item.date || ""));
      if (dateOrder) return dateOrder;

      const aThreshold = Number(a.item.downloadThreshold || 0);
      const bThreshold = Number(b.item.downloadThreshold || 0);
      if (aThreshold !== bThreshold) return bThreshold - aThreshold;

      return a.index - b.index;
    })
    .map(({ item }) => item);
}

function publishReleaseVersion() {
  const timestamp = releaseTimestamp();
  const version = `v2.06.${timestamp}-preview`;
  const payload = {
    version,
    label: `v2.06.${timestamp} Preview`,
    status: "preview",
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(releaseVersionPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

const meta = readJson(metaPath);
const timeline = Array.isArray(meta.timeline) ? meta.timeline : [];
const creationsTotal = readCreationsTotal();
const nexusTotal = readNexusTotalFromLatest() || readNexusTotalFromHistory();
const combinedTotal = creationsTotal + nexusTotal;
const highestReachedThreshold = Math.floor(combinedTotal / STEP) * STEP;
const newMilestones = [];

for (
  let threshold = FIRST_AUTOMATIC_THRESHOLD;
  threshold <= highestReachedThreshold;
  threshold += STEP
) {
  if (milestoneExists(timeline, threshold)) continue;

  const formatted = formatNumber(threshold);
  newMilestones.push({
    date: currentMonthLabel(),
    title: `Total downloads passed ${formatted}`,
    text: `TownGG releases across Bethesda Creations and Nexus Mods passed ${formatted} combined downloads.`,
    downloadThreshold: threshold,
    autoGenerated: true
  });
}

if (!newMilestones.length) {
  console.log(`No new milestone. Combined downloads: ${formatNumber(combinedTotal)}.`);
  process.exit(0);
}

meta.timeline = sortTimeline([...newMilestones, ...timeline]);
fs.writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
publishReleaseVersion();
console.log(
  `Added ${newMilestones.length} milestone(s). Combined downloads: ${formatNumber(combinedTotal)}.`
);
