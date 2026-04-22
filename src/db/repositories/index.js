import { settingsRepo } from './settings.js';
import { propertiesRepo } from './properties.js';
import { scenariosRepo } from './scenarios.js';
import { revisionsRepo } from './revisions.js';

// Bundles every repository against a single db handle.
export function createRepos(db) {
  return {
    settings: settingsRepo(db),
    properties: propertiesRepo(db),
    scenarios: scenariosRepo(db),
    revisions: revisionsRepo(db),
  };
}

export { settingsRepo, propertiesRepo, scenariosRepo, revisionsRepo };
