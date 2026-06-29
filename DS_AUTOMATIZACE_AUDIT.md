# DS automatizace - bezpecny audit

Datum: 2026-06-29

## Rozsah

Audit se tyka modulu `Datova schranka` a bezpecneho dokonceni kontroly systemu bez nove DB migrace.

## Stav zdroju pravdy

| Oblast | Stav | Zdroj |
|---|---|---|
| Pravidla modulu | Existujici cloud DB tabulka | `module_rules` z migrace `0015_create_module_rules.sql` |
| Historie behu pravidel | Existujici cloud DB tabulka | `module_automation_runs` z migrace `0015_create_module_rules.sql` |
| Run-level historie runneru | Existujici cloud DB tabulka | `module_automation_runner_runs` z migrace `0016_create_module_automation_runner_runs.sql` |
| Cloud dry-run runner | Existuje v kodu | `workers/module-automation-runner.js` |
| Vyhodnoceni dry-run | Existuje v kodu | `functions/_lib/module-automation-dry-run.js` |
| DS action history pro ostre e-maily/archivace | Neovereno / neni samostatne napojeno | V read-only kontrole se zobrazuje jako `NEOVĚŘENO` |
| Nove monitorovaci tabulky | Nezavadet | DB migrace byla zastavena |

## Co je hotove v teto fazi

- Pridana read-only obrazovka `Kontrola systemu`.
- Pridany read-only endpoint `GET /api/system-check/status`.
- Endpoint cte existujici D1 tabulky a neprovadi zapisy.
- Produkcni kontrola bezi pouze jako okamzita read-only kontrola bez ulozeni do DB.
- UI ukazuje `NEOVĚŘENO`, pokud chybi dukaz z DB nebo cloudu.
- DS automatizace se vyhodnocuji pouze podle existujicich tabulek a posledniho zaznamu runneru.

## Co neni hotove

- Neni pridana nova DB migrace.
- Neni vytvorena nova tabulka pro monitoring.
- Neni nasazen novy Cloudflare cron pro kontrolu systemu.
- Neni nasazena nova GitHub Actions automatizace.
- Neni potvrzeno, ze DS runner bezi v cloudu pro `data-box`.
- Neni potvrzena samostatna historie ostrych DS akci.
- Neodesilaji se e-maily, SMS ani datove zpravy.
- Neprovadi se ostra archivace.

## Bezpecnostni zaver

Tato faze je `Read-only pilot`.

Bez dalsiho vyslovneho potvrzeni se nesmi:

- delat DB migrace,
- menit Cloudflare secrets/bindings,
- nasazovat cron/worker,
- spoustet ostre automatizace,
- odesilat e-maily,
- odesilat datove zpravy,
- mazat nebo archivovat produkcni zpravy.

