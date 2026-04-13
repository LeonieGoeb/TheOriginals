const langues = require('./langues');
const niveaux = require('./niveaux');

module.exports = {
  langues,
  niveaux,
  tmpDir: './scripts/tmp',
  dataDir: './data',
  pendingDir: './_source/pending',
  processedDir: './_source/processed',
};
