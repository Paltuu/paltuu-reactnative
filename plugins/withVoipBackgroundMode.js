/**
 * Config plugin: add the `voip` UIBackgroundMode to Info.plist.
 *
 * The dispatcher-alert ringing call (Vets at Home / Express Vet) relies on Apple's
 * PushKit -> CallKit flow: a VoIP push must be able to wake the app in the background
 * (or launch it from killed state) so it can immediately report the incoming call to
 * CallKeep — iOS requires the `voip` background mode to be declared for that wakeup to
 * happen at all. `expo-notifications`' own plugin only adds the (unrelated)
 * `remote-notification` mode, not this one.
 */
const { withInfoPlist } = require('@expo/config-plugins');

const withVoipBackgroundMode = (config) =>
  withInfoPlist(config, (cfg) => {
    const modes = new Set(cfg.modResults.UIBackgroundModes || []);
    modes.add('voip');
    cfg.modResults.UIBackgroundModes = Array.from(modes);
    return cfg;
  });

module.exports = withVoipBackgroundMode;
