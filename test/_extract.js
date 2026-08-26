'use strict';
/**
 * Pulls the pure input-parsing logic (no DOM) straight out of a *built*
 * app file, so tests exercise exactly what ships rather than a
 * reimplementation that could drift from it. Both app templates embed the
 * same shape of code: DATA/BY/KEYS setup, then normalizeToken/segment/parse,
 * then DOM-touching functions starting at renderStatic(). We only need the
 * DOM-free prefix.
 */
const fs = require('fs');

function extractParser(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!scriptMatch) throw new Error(`no <script> block found in ${htmlPath}`);
  const script = scriptMatch[1];

  const start = script.indexOf('const DATA');
  const end = script.indexOf('function renderStatic');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`could not locate DOM-free parser slice in ${htmlPath}`);
  }
  const slice = script.slice(start, end);

  // eslint-disable-next-line no-new-func
  const factory = new Function(`${slice}\nreturn { parse, segment, normalizeToken, BY, KEYS };`);
  return factory();
}

module.exports = { extractParser };
