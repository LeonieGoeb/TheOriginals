// Retry avec backoff exponentiel pour toutes les APIs

const fs = require('fs');

// HTTP 429 = trop de requêtes (temporaire) → on retente
// HTTP 456 = quota mensuel DeepL épuisé → on échoue immédiatement
// HTTP 503 = service indisponible (temporaire) → on retente
const CODES_RATE_LIMIT_TEMPORAIRE = [429, 503];
const CODE_QUOTA_MENSUEL = 456;

class ErreurQuotaMensuel extends Error {
  constructor() {
    super('Quota mensuel DeepL épuisé');
    this.name = 'ErreurQuotaMensuel';
    this.quotaMensuel = true;
  }
}

async function avecRetry(fn, options = {}) {
  const {
    maxTentatives = 10,
    delaiInitial = 2000,      // 2 secondes
    delaiMax = 300000,        // 5 minutes
    facteur = 2,
    onRateLimit = null,       // callback appelé à chaque rate limit temporaire
  } = options;

  let delai = delaiInitial;

  for (let tentative = 1; tentative <= maxTentatives; tentative++) {
    try {
      return await fn();
    } catch (err) {
      // Quota mensuel épuisé : inutile de retenter, échouer immédiatement
      if (
        err.status === CODE_QUOTA_MENSUEL ||
        err.statusCode === CODE_QUOTA_MENSUEL ||
        err.quotaMensuel
      ) {
        throw new ErreurQuotaMensuel();
      }

      const estErreurRéseau =
        err.cause?.code === 'ECONNRESET' ||
        err.cause?.code === 'ETIMEDOUT' ||
        err.cause?.code === 'ENOTFOUND' ||
        err.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        err.message === 'fetch failed' ||
        err.message?.includes('network') ||
        err.message?.includes('timeout');

      const estRateLimitTemporaire =
        CODES_RATE_LIMIT_TEMPORAIRE.includes(err.status) ||
        CODES_RATE_LIMIT_TEMPORAIRE.includes(err.statusCode) ||
        err.message?.includes('rate limit') ||
        err.message?.includes('Too Many Requests') ||
        estErreurRéseau;

      if (!estRateLimitTemporaire || tentative === maxTentatives) {
        throw err;
      }

      const attente = Math.min(delai, delaiMax);
      const minutes = Math.round(attente / 60000);
      const secondes = Math.round((attente % 60000) / 1000);

      console.log(`\n⏳ Limite temporaire atteinte (tentative ${tentative}/${maxTentatives})`);
      console.log(`   Reprise automatique dans ${minutes > 0 ? minutes + 'min ' : ''}${secondes}s...`);

      fs.mkdirSync('./scripts/tmp', { recursive: true });
      fs.writeFileSync(
        './scripts/tmp/rate-limit-status.json',
        JSON.stringify({
          tentative,
          maxTentatives,
          repriseAt: new Date(Date.now() + attente).toISOString(),
          attente,
        })
      );

      if (onRateLimit) onRateLimit({ tentative, attente });

      await new Promise(r => setTimeout(r, attente));
      delai = Math.min(delai * facteur, delaiMax);
    }
  }
}


module.exports = { avecRetry, ErreurQuotaMensuel };
