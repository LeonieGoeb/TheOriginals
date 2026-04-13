import { readFileSync, writeFileSync } from 'fs';

function parseTokens(html) {
  // Normalize whitespace within the content
  const tokens = [];
  let remaining = html.trim();

  while (remaining.length > 0) {
    // Try to match a span first
    const spanMatch = remaining.match(/^<span class="([svc])">([\s\S]*?)<\/span>/);
    if (spanMatch) {
      const type = spanMatch[1];
      const text = spanMatch[2];
      tokens.push({ text, type });
      remaining = remaining.slice(spanMatch[0].length);
    } else {
      // Find the next span or end of string
      const nextSpan = remaining.search(/<span class="[svc]">/);
      let textChunk;
      if (nextSpan === -1) {
        textChunk = remaining;
        remaining = '';
      } else {
        textChunk = remaining.slice(0, nextSpan);
        remaining = remaining.slice(nextSpan);
      }
      // Clean up the text chunk - remove HTML tags, normalize spaces
      textChunk = textChunk.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
      if (textChunk.length > 0) {
        tokens.push({ text: textChunk, type: null });
      }
    }
  }

  return tokens;
}

function extractDivContent(html, className) {
  const regex = new RegExp(`<div class="${className}">[\\s\\S]*?(?=<div class="|<\\/div>)`, 'g');
  // simpler approach: extract content between div tags
  const startTag = `<div class="${className}">`;
  const start = html.indexOf(startTag);
  if (start === -1) return '';
  const contentStart = start + startTag.length;
  // Find matching closing div
  let depth = 1;
  let i = contentStart;
  while (i < html.length && depth > 0) {
    if (html.slice(i, i + 4) === '<div') depth++;
    else if (html.slice(i, i + 6) === '</div>') {
      depth--;
      if (depth === 0) break;
    }
    i++;
  }
  return html.slice(contentStart, i).trim();
}

function parsePairs(html) {
  const pairs = [];
  const pairRegex = /<div class="pair" id="(p\d+)">([\s\S]*?)<div class="pair-btns">/g;
  let match;
  while ((match = pairRegex.exec(html)) !== null) {
    const id = match[1];
    const pairContent = match[2];

    // Extract ru content
    const ruStart = pairContent.indexOf('<div class="ru">') + '<div class="ru">'.length;
    const ruEnd = pairContent.indexOf('</div>', ruStart);
    const ruContent = pairContent.slice(ruStart, ruEnd).trim();

    // Extract fr content
    const frStart = pairContent.indexOf('<div class="fr">') + '<div class="fr">'.length;
    const frEnd = pairContent.indexOf('</div>', frStart);
    const frContent = pairContent.slice(frStart, frEnd).trim();

    const ru = parseTokens(ruContent);
    const fr = parseTokens(frContent);

    pairs.push({ id, ru, fr });
  }
  return pairs;
}

function tokensToTS(tokens, indent) {
  const pad = ' '.repeat(indent);
  return tokens.map(t => {
    const type = t.type === null ? 'null' : `'${t.type}'`;
    const text = t.text.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `${pad}{ text: '${text}', type: ${type} }`;
  }).join(',\n');
}

function generateTS(chapitreId, titre, titreCyrilique, varName, pairs) {
  const paragraphes = pairs.map(p => {
    return `    {
      id: '${p.id}',
      textes: {
        ru: [
${tokensToTS(p.ru, 10)},
        ],
        fr: [
${tokensToTS(p.fr, 10)},
        ],
      },
    }`;
  }).join(',\n');

  return `import { Chapitre } from '../types';

const ${varName}: Chapitre = {
  id: '${chapitreId}',
  titre: '${titre}',
  titreCyrilique: '${titreCyrilique}',
  paragraphes: [
${paragraphes},
  ],
};

export default ${varName};
`;
}

// Parse chapitre-01
const html1 = readFileSync('/Users/leoniegoeb/Desktop/TheOriginals/_source/chapitre-01.html', 'utf-8');
const pairs1 = parsePairs(html1);
console.log(`Chapitre 01: ${pairs1.length} paragraphes`);
const ts1 = generateTS('chapitre-01', 'Partie I — Ch. 1', 'Часть первая · I', 'chapitre01', pairs1);
writeFileSync('/Users/leoniegoeb/Desktop/TheOriginals/data/anna-karenine/chapitre-01.ts', ts1);
console.log('Written chapitre-01.ts');

// Parse chapitre-02
const html2 = readFileSync('/Users/leoniegoeb/Desktop/TheOriginals/_source/chapitre-02.html', 'utf-8');
const pairs2 = parsePairs(html2);
console.log(`Chapitre 02: ${pairs2.length} paragraphes`);
const ts2 = generateTS('chapitre-02', 'Partie I — Ch. 2', 'Часть первая · II', 'chapitre02', pairs2);
writeFileSync('/Users/leoniegoeb/Desktop/TheOriginals/data/anna-karenine/chapitre-02.ts', ts2);
console.log('Written chapitre-02.ts');
