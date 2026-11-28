/* TGG AI: read the full-slide images from a finished PPTX in the visitor's browser.
   No thumbnail files are produced or sent to the website. */
(function (root) {
  'use strict';

  var MAX_PPTX_BYTES = 80 * 1048576;
  var MAX_ENTRY_BYTES = 32 * 1048576;
  var encoder = new TextDecoder('utf-8');

  function zipEntries(buffer) {
    if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 22 || buffer.byteLength > MAX_PPTX_BYTES) {
      throw Error('文件过大或不是有效的 PPTX，请直接下载查看');
    }
    var view = new DataView(buffer), bytes = new Uint8Array(buffer), end = -1;
    for (var i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 65557); i--) {
      if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
    }
    if (end < 0) throw Error('无法识别 PPTX 文件结构');
    var count = view.getUint16(end + 10, true);
    var position = view.getUint32(end + 16, true);
    if (count > 1500 || position >= buffer.byteLength) throw Error('PPTX 文件结构不受支持');
    var entries = new Map();
    for (var n = 0; n < count; n++) {
      if (position + 46 > buffer.byteLength || view.getUint32(position, true) !== 0x02014b50) throw Error('PPTX 文件目录不完整');
      var method = view.getUint16(position + 10, true);
      var packed = view.getUint32(position + 20, true);
      var size = view.getUint32(position + 24, true);
      var nameLength = view.getUint16(position + 28, true);
      var extraLength = view.getUint16(position + 30, true);
      var commentLength = view.getUint16(position + 32, true);
      var local = view.getUint32(position + 42, true);
      var next = position + 46 + nameLength + extraLength + commentLength;
      if (next > buffer.byteLength || local + 30 > buffer.byteLength || view.getUint32(local, true) !== 0x04034b50 || size > MAX_ENTRY_BYTES) throw Error('PPTX 包含异常文件');
      var name = encoder.decode(bytes.subarray(position + 46, position + 46 + nameLength));
      var start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
      if (start + packed > buffer.byteLength || entries.has(name)) throw Error('PPTX 文件内容不完整');
      entries.set(name, { method: method, packed: packed, size: size, start: start });
      position = next;
    }
    return { buffer: buffer, entries: entries };
  }

  async function entryBytes(zip, path) {
    var entry = zip.entries.get(path);
    if (!entry) throw Error('PPTX 缺少页面内容');
    var compressed = zip.buffer.slice(entry.start, entry.start + entry.packed);
    var raw;
    if (entry.method === 0) raw = compressed;
    else if (entry.method === 8) {
      if (typeof DecompressionStream === 'undefined') throw Error('当前浏览器不支持直接预览，请下载 PPT');
      var stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      raw = await new Response(stream).arrayBuffer();
    } else throw Error('PPTX 使用了不支持的压缩格式');
    if (raw.byteLength !== entry.size) throw Error('PPTX 页面数据不完整');
    return new Uint8Array(raw);
  }

  async function entryText(zip, path) {
    return encoder.decode(await entryBytes(zip, path));
  }

  function xmlDocument(xml) {
    var document = new DOMParser().parseFromString(xml, 'application/xml');
    if (document.getElementsByTagName('parsererror').length) throw Error('PPTX 页面描述无法解析');
    return document;
  }

  function zipPath(from, target) {
    if (!target || /^(?:[a-z]+:|\/\/)/i.test(target)) throw Error('PPTX 引用了外部页面资源');
    if (target[0] === '/') return target.slice(1);
    var parts = from.split('/'); parts.pop();
    target.split('/').forEach(function (piece) {
      if (piece === '..') parts.pop();
      else if (piece && piece !== '.') parts.push(piece);
    });
    return parts.join('/');
  }

  async function relationships(zip, path) {
    var doc = xmlDocument(await entryText(zip, path));
    var nodes = doc.getElementsByTagNameNS('*', 'Relationship'), map = new Map();
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].getAttribute('TargetMode') === 'External') continue;
      map.set(nodes[i].getAttribute('Id'), nodes[i].getAttribute('Target'));
    }
    return map;
  }

  async function slidePaths(zip) {
    var fallback = Array.from(zip.entries.keys()).filter(function (path) {
      return /^ppt\/slides\/slide\d+\.xml$/.test(path);
    }).sort(function (a, b) {
      return Number(a.match(/slide(\d+)\.xml$/)[1]) - Number(b.match(/slide(\d+)\.xml$/)[1]);
    });
    if (!fallback.length || fallback.length > 100) throw Error('没有找到可预览的 PPT 页面');
    if (!zip.entries.has('ppt/presentation.xml') || !zip.entries.has('ppt/_rels/presentation.xml.rels')) return fallback;
    var doc = xmlDocument(await entryText(zip, 'ppt/presentation.xml'));
    var rels = await relationships(zip, 'ppt/_rels/presentation.xml.rels');
    var ids = doc.getElementsByTagNameNS('*', 'sldId'), paths = [];
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i].getAttribute('r:id') || ids[i].getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
      if (!rels.has(id)) throw Error('PPTX 页面顺序信息不完整');
      var path = zipPath('ppt/presentation.xml', rels.get(id));
      if (!zip.entries.has(path)) throw Error('PPTX 缺少指定页面');
      paths.push(path);
    }
    return paths.length ? paths : fallback;
  }

  async function extractPages(buffer) {
    var zip = zipEntries(buffer), paths = await slidePaths(zip), urls = [];
    try {
      for (var i = 0; i < paths.length; i++) {
        var path = paths[i];
        var doc = xmlDocument(await entryText(zip, path));
        var pictures = doc.getElementsByTagNameNS('*', 'pic');
        if (pictures.length !== 1) throw Error('这份 PPT 不是一页一图格式，请下载查看完整内容');
        var blips = pictures[0].getElementsByTagNameNS('*', 'blip');
        if (!blips.length) throw Error('PPTX 页面图片未找到');
        var id = blips[0].getAttribute('r:embed') || blips[0].getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed');
        var basename = path.split('/').pop();
        var relPath = 'ppt/slides/_rels/' + basename + '.rels';
        var rels = await relationships(zip, relPath);
        if (!rels.has(id)) throw Error('PPTX 页面图片关联不完整');
        var imagePath = zipPath(path, rels.get(id));
        var ext = imagePath.split('.').pop().toLowerCase();
        var mime = ext === 'png' ? 'image/png' : /^(jpg|jpeg)$/.test(ext) ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : null;
        if (!mime) throw Error('该 PPT 含不支持预览的图片类型');
        var bytes = await entryBytes(zip, imagePath);
        urls.push(URL.createObjectURL(new Blob([bytes], { type: mime })));
      }
      return urls;
    } catch (error) {
      urls.forEach(function (url) { URL.revokeObjectURL(url); });
      throw error;
    }
  }

  root.TggPptxPreview = { extractPages: extractPages, maxBytes: MAX_PPTX_BYTES };
})(window);
