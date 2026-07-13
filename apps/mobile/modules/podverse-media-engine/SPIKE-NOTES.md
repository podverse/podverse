# podverse-media-engine — spike notes (PG-2b steps 2.12–2.13)

Operator-run device spikes for background audio (2.12) and after force-stop / swipe-away (2.13).
Fill in the result tables below and commit **before** the go/no-go gate (step 2.34). Record honest
outcomes — do **not** claim kill-survival if it does not happen. Failures become follow-ups filed
before 2.34.

Expected platform policy and the CarPlay/Android Auto distinction are documented in
[`README.md`](./README.md) § "Background & after-kill behavior".

## How to run

Build the dev client with the native module and use the Hello World debug panel
(`apps/mobile/src/debug/PlaybackEngineDebugPanel.tsx`): tap **Load** then **Play**, confirm audio.

```bash
npm run mobile:ios
npm run mobile:android
```

### 2.12 — Background audio checklist

1. Play audio (Load → Play), confirm sound.
2. Press Home (background) — audio should continue.
3. Lock the device — audio should continue; lock-screen / notification controls present.
4. Note simulator/emulator vs physical device differences (device is authoritative).

### 2.13 — After force-stop / swipe-away checklist

1. Play audio.
2. iOS: open app switcher and swipe the app up (force-quit). Observe whether audio stops (expected).
3. Android: swipe the app away from Recents. Observe whether the service/audio stops or continues.
4. Record the actual behavior; do not assume.

## Results — 2.12 background audio

| Platform | Simulator/Emulator | Device (model) | OS version | Audio continues? | Notification/lock controls? | Notes |
| -------- | ------------------ | -------------- | ---------- | ---------------- | --------------------------- | ----- |
| iOS      | _tbd_              | _tbd_          | _tbd_      | _tbd_            | _tbd_                       | _tbd_ |
| Android  | _tbd_              | _tbd_          | _tbd_      | _tbd_            | _tbd_                       | _tbd_ |

## Results — 2.13 after force-stop / swipe-away

| Platform | Device (model) | OS version | Audio after kill? | Service behavior (Android)  | Notes |
| -------- | -------------- | ---------- | ----------------- | --------------------------- | ----- |
| iOS      | _tbd_          | _tbd_      | expected: stops   | n/a                         | _tbd_ |
| Android  | _tbd_          | _tbd_      | _tbd_             | _tbd_ (OEM battery policy?) | _tbd_ |

## Go/no-go readiness (2.34)

- [ ] 2.12 background audio verified on iOS device
- [ ] 2.12 background audio verified on Android device
- [ ] 2.13 after-kill behavior documented honestly for both platforms
- [ ] Any failures filed as follow-ups before the gate
