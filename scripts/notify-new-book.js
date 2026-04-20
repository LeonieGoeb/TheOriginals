#!/usr/bin/env node
// Usage: node scripts/notify-new-book.js <livreId>
// Envoie une notification FCM au topic src_{langueSource}_tgt_{langueCible}
// Variables d'environnement requises :
//   FCM_SERVICE_ACCOUNT_KEY : JSON du service account Firebase (stringifié)
//   CATALOG_PATH            : chemin vers catalog.json (optionnel, défaut: data/json/catalog.json)

const fs   = require('fs');
const path = require('path');

const livreId = process.argv[2];
if (!livreId) {
  console.error('Usage: node scripts/notify-new-book.js <livreId>');
  process.exit(1);
}

const catalogPath = process.env.CATALOG_PATH ?? path.join(__dirname, '../data/json/catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const livre = catalog.find(l => l.id === livreId);
if (!livre) {
  console.error(`Livre "${livreId}" introuvable dans le catalogue.`);
  process.exit(1);
}

const topic = `src_${livre.langueSource}_tgt_${livre.langueCible}`;
console.log(`📣 Notification → topic "${topic}" pour "${livre.titre}"`);

async function getAccessToken(serviceAccount) {
  const { createSign } = require('crypto');

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url');

  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(serviceAccount.private_key, 'base64url');
  const jwt = `${header}.${payload}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`OAuth error: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function main() {
  const keyJson = process.env.FCM_SERVICE_ACCOUNT_KEY;
  if (!keyJson) throw new Error('FCM_SERVICE_ACCOUNT_KEY manquant');
  const serviceAccount = JSON.parse(keyJson);

  const token = await getAccessToken(serviceAccount);
  const projectId = serviceAccount.project_id;

  const body = {
    message: {
      topic,
      notification: {
        title: '📚 New book available',
        body: `${livre.titre} — ${livre.auteur}`,
      },
      data: {
        livreId: livre.id,
      },
      android: {
        notification: { click_action: 'FLUTTER_NOTIFICATION_CLICK' },
      },
    },
  };

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  const result = await res.json();
  if (!res.ok) throw new Error(`FCM error: ${JSON.stringify(result)}`);
  console.log(`✅ Notification envoyée : ${result.name}`);
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
