# smws-mobile

React Native + Expo frontend for the SMWS whisky search API.

## Stack

- Expo SDK 57
- React Native 0.86
- React 19.2
- Expo Router
- Expo Camera
- expo-text-extractor (on-device OCR)

## 1. Requirements

Expo SDK 57 requires Node.js 22.13.x or newer compatible LTS release.

## 2. Install

```bash
npm install
cp .env.example .env
```

Set the FastAPI URL in `.env`:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:8009
```

When testing on a physical phone, **do not use `localhost`**. Use the LAN IP of the computer/server running FastAPI.

FastAPI should listen on the network interface, for example:

```bash
uv run uvicorn app.main:app --host 0.0.0.0 --port 8009
```

## 3. Run

Because OCR uses a native module, use a development build instead of relying on Expo Go.

Android from Linux/macOS/Windows:

```bash
npx expo run:android
```

After the first native build:

```bash
npm run start
```

If you use EAS:

```bash
npx eas build --profile development --platform android
```

## 4. Main flow

```text
Text input -----------------------> FastAPI search

Camera -> take photo -> OCR
                    -> detect cask number/name
                    -> FastAPI search
                    -> whisky detail
```

## 5. API contract

Search:

```http
GET /api/v1/whiskies/search?q=93.228&limit=20
```

Detail:

```http
GET /api/v1/whiskies/93.228
```

The frontend types in `types/whisky.ts` match the current Pydantic response models in `smws-api`.

## 6. Local HTTP note

`app.json` currently enables Android cleartext traffic for local development and allows local-network access on iOS. Before production release, move the API to HTTPS and remove the development-only cleartext configuration.

## 7. OCR behavior

`utils/ocr.ts` prioritizes a SMWS cask number such as:

- `93.228`
- `93-228`
- `93 228`

and normalizes it to `93.228`.

If no cask number is detected, it falls back to the longest plausible OCR text line as a whisky-name search query.
