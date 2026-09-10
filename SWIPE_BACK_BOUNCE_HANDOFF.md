# iOS fast-swipe-back "bounce" — root cause + fix handoff

**Status:** root cause identified, fix staged in `package.json`, **needs a native rebuild (iOS + Android) to take effect.**
**Owner to complete:** CTO
**Date:** 2026-09-10

---

## Symptom

On iOS, swiping back quickly (a fast edge flick, not a slow drag) through a
stack — e.g. `A → B → C`, then swipe back `C → B → A` — lands on A, pauses,
then **animates forward to B on its own, then back to A again**, and settles.

Reproduces across the whole app, every stack. Confirmed on:

- Profile → profile-menu (drawer) → my-applications (and most profile-drawer screens)
- Home feed → `post/[id]` → `thread/[id]`
- Doorstep vet → urgent visit → species/dogs

It is **not** specific to any screen or to this app's navigation code.

---

## Root cause

This is a **known, fixed-upstream bug in `react-native-screens`** on iOS + the
New Architecture (Fabric): native ↔ JS navigation-state desynchronization during
a fast interactive pop. `UINavigationController` finishes the interactive pop,
but `react-native-screens` re-attaches the just-dismissed screen for a frame
because an animation-completion callback and `viewDidDisappear` land out of
order — so the stack "corrects" by re-running the transition.

Tracking issues / evidence:

- react-native-screens: <https://github.com/software-mansion/react-native-screens/issues/2559> — *"[iOS] Unexpected Navigation Behavior When Swiping Back Quickly"* — closed **Completed, 2026-02-02**
- expo consolidated tracker: <https://github.com/expo/expo/issues/36009>
- expo duplicate w/ our exact description: <https://github.com/expo/expo/issues/38936> (maintainer: *"This is an issue in `react-native-screens` and needs to be fixed there"*)
- also: <https://github.com/expo/expo/issues/42545>, <https://github.com/expo/router/issues/951>

Fix PRs in react-native-screens:

- <https://github.com/software-mansion/react-native-screens/pull/3584> — Stack state desync (`iosPreventReattachmentOfDismissedScreens`)
- <https://github.com/software-mansion/react-native-screens/pull/3760> — same for Modals (`iosPreventReattachmentOfDismissedModals`)
- <https://github.com/software-mansion/react-native-screens/pull/3631> — don't block interactions during the transition (`ios26AllowInteractionsDuringTransition`)

### Version timeline

| react-native-screens | fix state | RN support (screens' own compat table) |
|---|---|---|
| **4.16.0** (Expo SDK 54 pins this) | **no fix — predates it** | 0.81 |
| 4.21.0 (2026-02-02) | fix present, **opt-in flag, default off** | 0.81 |
| 4.22.0 – 4.23.x | opt-in flag | 0.81 |
| **4.24.0** | **fix on by default**, still on RN 0.81 | **0.81** ← our target |
| 4.25.0+ | fix mandatory (flag deprecated, always `true`) | **requires 0.82+** |
| 4.26.0+ | " | requires 0.84+ |
| 4.27.0 (latest) | " | requires 0.84+ |

We are on **RN 0.81.5 / Expo SDK 54**. `4.24.0` is the newest release that
carries the fix *and* still targets RN 0.81. `4.25.0+` is built against RN
0.82+ and is out-of-support here — do not use it without also moving to Expo
SDK 55.

### Why the earlier 4.27.0 build didn't fix it

**Confirmed from git history:** the `4.27.0` bump only ever existed in commit
`8129660` ("react ntive screens"). Commit `611e89c` ("okok", Shuja, 2026-09-08)
then **reverted `react-native-screens` back to `~4.16.0`** and removed the
`expo.install.exclude`, and `app.config.ts` `version` was bumped to `1.0.14` for
a new iOS production build. So **the live 1.0.14 build ships `react-native-screens`
4.16.0 — which predates the fix entirely.** A version that actually contains the
fix has not been built yet.

(Even if a 4.27.0 build had been made: 4.27.0 targets RN 0.84+, so on RN 0.81.5
the fixed native code may not compile/link cleanly. `4.24.0` avoids that.)

---

## The fix (committed)

On `main` (this supersedes Shuja's `611e89c` revert — tell him so it doesn't get
reverted again):

- `package.json`: `react-native-screens` `~4.16.0` → `~4.24.0`
- `package.json`: added `expo.install.exclude: ["react-native-screens"]` so
  `expo install --check` / `expo-doctor` / `npx expo install` don't revert it to
  the SDK-pinned 4.16.0
- `package-lock.json`: regenerated (only `react-native-screens` changed — 4.24.0
  also drops the transitive `react-native-is-edge-to-edge` dep that 4.16.0 pulled)
- Added a `"//react-native-screens"` note key in `package.json` documenting why
- Reverted the two triage changes from `8129660` (`enableFreeze(false)` in
  `index.js`, the auth-redirect debounce in `app/_layout.tsx`) — neither was the
  cause

`react-native-screens@4.24.0`'s `iosPreventReattachmentOfDismissedScreens`,
`iosPreventReattachmentOfDismissedModals`, and `ios26AllowInteractionsDuringTransition`
all **default to `true`** — no JS `featureFlags` call is needed. (Verified in
`node_modules/react-native-screens/src/flags.ts`.)

### Remaining steps (CTO)

1. `npm install` (if lockfile not already picked up on your machine).
2. Regenerate native projects:
   - `npx expo prebuild --clean` **or** `cd ios && pod install && cd ../android && ./gradlew` — whichever matches your build flow. The committed `ios/` + `android/` dirs and the custom config plugins in `plugins/` must survive; `--clean` will re-run all plugins, so diff the result.
   - Confirm `ios/Podfile.lock` now shows `RNScreens (4.24.0)` and commit it.
3. **EAS build for BOTH platforms** (screens is native on Android too):
   - `eas build -p ios --profile production`
   - `eas build -p android --profile production`
   - In each build log, confirm the installed `react-native-screens` is `4.24.0`.
4. **Bump `version` in `app.config.ts` `1.0.14` → `1.0.15`** (NOT done in the fix
   commit — left to you for release coordination). `react-native-screens`
   4.16→4.24 is a native change, and the live 1.0.14 iOS build has 4.16.0; under
   the `runtimeVersion: appVersion` policy an OTA off this JS would otherwise
   resolve against that 4.16.0 binary. Also bump `ios.buildNumber` and
   `android.versionCode` (App Store / Play reject reused build numbers — see the
   comments in `app.config.ts`).
5. Install on a physical iPhone and run the **test matrix** below.

---

## Test matrix (physical iPhone, release build)

Fast-flick back-swipe, repeated ~15× per flow (the bug hit "within the first minute"):

- [ ] Profile → drawer → my-applications → back, back
- [ ] Profile → drawer → each other drawer screen → back
- [ ] Home feed → post → thread → back, back
- [ ] Doorstep vet → urgent visit → species → back, back
- [ ] 4+ deep push chain, then flick back through all of it in one motion
- [ ] Swipe back while the destination feed is mid-scroll / mid pull-to-refresh

Regression (screens 4.16 → 4.24 is 8 minor versions):

- [ ] Headers: titles, back titles, large titles, header buttons on native-stack screens
- [ ] `create-post` — full-screen swipe-to-dismiss (`fullScreenGestureEnabled` + `animationMatchesGesture`, root `_layout.tsx`) still slides out to Home
- [ ] `comment/[id]` and `quote/[id]` — `fullScreenModal` presentation, slide-from-bottom, keyboard avoidance
- [ ] `express-vet-dispatch/incoming-alert` — `fullScreenModal`, `gestureEnabled: false` (must stay non-dismissable)
- [ ] Bottom tabs + the material-top-tabs usages — no layout/inset regressions (screens' Tabs API was rewritten in **4.25**, which we are staying below, but sanity-check anyway)
- [ ] The global "notch stopper" absolute overlay in `app/(app)/_layout.tsx` still aligns; no white band above headers
- [ ] Android: general navigation + the dispatcher full-screen alert still work

---

## Known risks / gotchas

- **`react-native-compressor` codegen.** A local `pod install` here failed in
  `generate-codegen-artifacts.js` with *"configuration file still contains the
  codegen in the libraries array"* — `react-native-compressor`'s `package.json`
  uses the deprecated `codegenConfig.libraries` array form. This was a
  pre-existing condition on the dev machine used for triage, unrelated to the
  screens bump, and your existing builds already ship with this dep. If an EAS
  build now trips on it, fix `react-native-compressor`'s `codegenConfig` to the
  single-object form via `patch-package` (there is already a `postinstall` patch
  pipeline in `scripts/`).
- `expo.install.exclude` means `npx expo install --check` will no longer flag
  `react-native-screens`. When you upgrade to Expo SDK 55, **remove that exclude
  entry** and let the SDK pin take over (SDK 55 will ship a screens version that
  already contains this fix).
- `ios/Podfile.properties.json` and `android/gradle.properties` have
  `newArchEnabled=true`. Keep it — the fix is a New-Architecture fix. Do **not**
  disable the New Architecture (an earlier line of investigation; abandoned once
  the real fix was found — it would have forced `react-native-reanimated` 4→3 and
  `@shopify/flash-list` 2→1, both New-Arch-only, for no reason).

## Optional, low-risk

- Bump `@react-navigation/native` `7.3.8 → 7.3.18`, `@react-navigation/native-stack`
  `7.14.11 → 7.18.x`, `@react-navigation/bottom-tabs` `7.15.9 → 7.18.x` (all same
  major, permissive peers). Not required for the fix — the desync fix lives
  entirely inside `react-native-screens`' native Stack — but keeps the nav stack
  current. Test the matrix again if you do.

## Rollback

If `4.24.0` misbehaves in the build:

1. `package.json`: `react-native-screens` → `~4.16.0`, remove the
   `expo.install.exclude` block and the `"//react-native-screens"` note.
2. `npm install`, regenerate native projects, rebuild.
3. Back to the known state — with the bounce still present. Then either wait for
   Expo SDK 55, or try `4.22.0`/`4.23.0` and set
   `featureFlags.experiment.iosPreventReattachmentOfDismissedScreens = true` +
   `featureFlags.experiment.ios26AllowInteractionsDuringTransition = true` in
   `index.js` (before `require('expo-router/entry')`) since the flag is opt-in in
   those versions.

## Triage changes already reverted

Two speculative JS-only changes were tried during triage and **reverted** once
the real cause was found — `index.js` and `app/_layout.tsx` are back to their
original state:

- `enableFreeze(false)` in `index.js` — freeze race hypothesis; not the cause.
- A 150 ms debounce on the auth-redirect `useEffect` in `app/_layout.tsx` — not
  the cause. (It did also paper over a minor latent issue: that effect re-runs on
  every `segments` change and could in principle fire `router.replace` against a
  transient route. Not observed in practice. Left alone.)
