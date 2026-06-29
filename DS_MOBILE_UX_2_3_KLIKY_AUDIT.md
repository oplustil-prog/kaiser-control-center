# DS mobile UX audit 2-3 kliky

Rozsah: pouze UI mobilniho zobrazeni modulu Datova schranka. Bez DB, bez API, bez cronu, bez odesilani datovych zprav, bez e-mailu a bez mazani.

| Ukon | Desktop stav | Mobil stav | Aktualni pocet kliku | Cilovy pocet kliku | Problem | Oprava |
|---|---|---:|---:|---:|---|---|
| Vybrat DS schranku | DS prepinace jsou nahore. | DS prepinace jsou prvni prakticky prvek. | 1 | 1 | Mobil musi mit DS hned nahore. | Zachovany horizontalni chip list, aktivni DS je probarvena, ostatni sede a klikatelne. |
| Prepnout z KS na Nanolab Plus | Klik na chip schranky. | Klik na chip schranky. | 1 | 1 | Bez zbytecneho menu. | Beze zmeny logiky, prepinac zustava primo nahore. |
| Zobrazit zpravy aktivni DS | Filtrovani podle `dataBoxId`. | Filtrovani podle `dataBoxId`. | 0-1 | 0-1 | Nesmí se michat schranky. | Zachovana logika `message.dataBoxId === activeAccount.id`. |
| Otevrit detail zpravy | Klik na zpravu / otevrit detail. | Klik na zpravu, detail je hned pod seznamem. | 1 | 1 | Mobil nesmi schovavat detail za technicke bloky. | Stavove boxy jsou na mobilu schovane, detail zustava v toku za seznamem. |
| Otevrit prilohu | Detail zpravy, sekce Prilohy je nahore. | Detail zpravy, Prilohy jsou pred obsahem. | 2 | 2 | Priloha je hlavni obsah DS. | Sekce Prilohy zustava pred obsahem a technickymi udaji. |
| Stahnout prilohu | Tlacitko Stahnout u prilohy. | Tlacitko Stahnout u prilohy. | 2 | 2 | Akce musi byt vedle prilohy. | Tlacitka prilohy jsou na mobilu na celou sirku. |
| Poslat zpravu e-mailem | Tlacitko v detailu existuje, ale je disabled. | Tlacitko v detailu existuje, ale je disabled. | 2-3 | 2-3 | Backend odeslani neni v tomto UI kroku napojen. | UI cesta je pripravena, ostrou funkci nelze predstirat. |
| Odpovedet na zpravu | Tlacitko Odpovedet v detailu. | Tlacitko Odpovedet v detailu. | 2 | 2 | Odeslani odpovedi neni soucast UI-only opravy. | Editor navrhu je dostupny, odeslani zustava blokovane bez backendu. |
| Archivovat zpravu | Tlacitko existuje, ale je disabled. | Tlacitko existuje, ale je disabled. | 2 | 2 | Ostrou archivaci nelze doplnit bez backendu. | UI cesta je viditelna, zadna falesna archivace. |
| Vyhledat zpravu | Hledani je nad seznamem. | Hledani je nad seznamem a pres celou sirku. | 1 | 1 | Input nesmi ztratit focus ani byt uzky. | Hledani ma vlastni stav a mobilni sirku 100 %. |
| Prepnout Prijate / Odeslane | Zalozky nahore. | Zalozky nahore. | 1 | 1 | Na mobilu nesmi byt nalepene ani ztracene. | Zalozky jsou horizontalni a citelne. |
| Zobrazit pravidla a automatizace | Zalozka Pravidla. | Zalozka Pravidla. | 1 | 1 | Pred opravou byla na mobilu skryta. | Zalozka Pravidla je na mobilu zpet, se zkracenym popiskem. |
| Spustit / overit AI Boost nebo pravidla | Dostupne podle aktualni logiky panelu. | Dostupne pres Pravidla, technicke sync boxy jsou skryte. | 1-3 | 2-3 | Velke stavove boxy nemaji byt pred zpravami. | Pravidla panel zustava dostupny, sync panel je na mobilu schovany. |
| Zobrazit historii odeslanych e-mailu/SMS | Neni prokazatelne napojena v UI-only scope. | Neni prokazatelne napojena v UI-only scope. | NEJASNE | 2-3 | Vyžaduje backend/cloud historii mimo tento krok. | Neopraveno v UI-only scope, nesmi se tvrdit jako hotove. |
| Zjistit stav DS uctu / diagnostiku | Stavove informace jsou na desktopu v pravem panelu. | Technicke info je schovane, aby neprekazelo praci. | 1-3 | 2-3 | Na mobilu technicke boxy vytlacovaly zpravovou praci. | Mobil schovava stavove boxy; produkcni diagnostika patri mimo hlavni mobilni tok. |

## Zaver auditu

- Hlavni mobilni tok je DS schranky -> zalozky -> hledani/filtry -> seznam -> detail -> prilohy/akce.
- Oprava je pouze UI/mobile: zadne nove API, DB, cron, secrets ani produkcni datove akce.
- Nehotove realne funkce zustavaji priznane: odeslani e-mailu, archivace, ostra odpoved, cloud runner automatizaci a historie akci.
