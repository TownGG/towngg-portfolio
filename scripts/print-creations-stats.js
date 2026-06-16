import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('assets/js/site-data.js', 'utf8');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context, { filename: 'site-data.js' });

const creations = Array.isArray(context.window.siteData?.creations) ? context.window.siteData.creations : [];
const rows = creations.map((item) => ({
  title: item.title || '',
  timeline: 'Alltime',
  views: item.views || '-',
  bookmarks: item.bookmarks || '-',
  likes: item.likes || '-',
  downloads: item.downloads || '-',
  plays: item.plays || '-',
  libraryAdds: item.libraryAdds || '-',
  updatedAt: item.updatedAt || '-',
  source: item.source || '-'
}));

console.log('Captured Bethesda Creations stats from assets/js/site-data.js:');
console.table(rows);
console.log(JSON.stringify(rows, null, 2));
