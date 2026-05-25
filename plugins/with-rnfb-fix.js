const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withRnfbFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfile = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let content = fs.readFileSync(podfile, 'utf8');

      // Prepend use_modular_headers! at the top of the Podfile if it doesn't already exist
      if (!content.includes('use_modular_headers!')) {
        content = 'use_modular_headers!\n' + content;
        fs.writeFileSync(podfile, content);
      }

      return config;
    },
  ]);
};
