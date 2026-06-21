# Kaiser Control Center

Čistý lokální základ pro Kaiser Control Center podle zadání z PDF.

## Rozsah první verze

- HP / hlavní rozcestník s 12 moduly.
- Routing pro hlavní modulové stránky.
- Připravené skeleton routy pro budoucí modulové dashboardy.
- Statická konfigurace modulů v `src/data/modules.ts`.
- Lokální SVG komponenty ikon v `src/components/icons/`.
- Bez API, backendu, databáze, autentizace a Cloudflare deploye.

## Pneumatiky

Modul Pneumatiky není v tomto projektu implementovaný ani měněný. V aplikaci je pouze karta se štítkem `HOTOVO` a placeholder stránka pro pozdější napojení hotového modulu 1:1.

## Spuštění lokálně

```bash
npm run dev
```

Bez správce balíčků lze spustit přímo:

```bash
node scripts/serve.mjs
```

## Build

```bash
npm run build
```

Bez správce balíčků lze build ověřit přímo:

```bash
node scripts/build.mjs
```

Výstup vznikne ve složce `dist/`.

## Ověření buildu

```bash
npm run preview
```

Náhled používá lokální server nad `dist/`.
