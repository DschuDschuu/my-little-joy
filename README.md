# MY LITTLE JOY

> Nothing is required. Everything counts.
> *Nichts muss. Alles zählt.*

Eine kleine, ruhige Self-Care-Webapp. Kein Habit Tracker, keine To-do-Liste,
kein Produktivitätstool. Sie macht nur sichtbar, was du sowieso schon für dich
getan hast – und lässt dich danach wieder in Ruhe.

---

## Starten

**Einfachster Weg:** `index.html` doppelklicken. Läuft komplett offline,
inklusive Speichern (localStorage).

**Mit lokalem Server** (nötig, wenn du Service Worker / „zum Startbildschirm
hinzufügen" testen willst):

```bash
powershell -ExecutionPolicy Bypass -File .\dev-server.ps1
```

Danach `http://localhost:8123` öffnen.

---

## Aufbau

```
index.html               Grundgerüst, alle vier Views
css/styles.css           Design-Tokens + komplettes Styling
js/activities.js         die 12 Aktivitäten (frei erweiterbar)
js/joycards.js           die Joy Cards als reine Datenobjekte
js/state.js              localStorage: Sticker, Karten, Level
js/beachworld.js         die Beach World (unabhängig vom UI)
js/app.js                UI-Logik, Animationen, Navigation
sw.js                    Offline-Cache (nur unter http/https aktiv)
manifest.webmanifest     PWA-Manifest
icons/                   App-Icon (SVG)
```

Bewusst **keine** Build-Tools, kein Framework, keine CDN-Abhängigkeit,
keine ES-Module – damit die Dateien direkt in einer Android-WebView laufen.

---

## Die Beach World

Der wichtigste Teil, und absichtlich vom Rest getrennt:

```js
var world = BeachWorld.create(element);
world.render(stickerCount);            // das ist die ganze Schnittstelle
BeachWorld.discovered(stickerCount);   // was bisher aufgetaucht ist
```

**Es ist ein einziges großes Bild** (ein SVG, 760 × 760), kein Raster aus
Kästchen und keine fünf verschiedenen Bilder. Sichtbar gemacht wird es durch
einen cremefarbenen „Papier-Schleier", dessen weiche Kante sich mit jedem
Sticker ein Stück weiter nach unten schiebt.

**Genau 100 Elemente – eines pro Sticker.** Jeder einzelne Sticker bringt
sichtbar etwas Neues. Die Slots 1 bis 100 sind lückenlos und jeweils genau
einmal belegt (`buildItems()` stellt das sicher).

| Sticker | was passiert |
|--------:|--------------|
| 0   | Himmel, Meer, ein Streifen Strand |
| 1–24 | Möwen, Wolken, Flugzeuge, Drachen, Heißluftballon, Delfin, Luftmatratzen, Schwimmreifen, Boote, erste Muscheln und Gräser |
| **25** | *große Szene:* Sonnenschirm, Strandtuch, erste Blumen |
| **50** | *große Szene:* Palmen, Strandhütte, Surfboard |
| **75** | *große Szene:* Sonnenliege, Strandstuhl, viel Grün |
| **100** | *große Szene:* goldenes Licht, Blumenwiese, große Muschel |

Aktuell: 14 Elemente am Himmel, 15 im Wasser, 71 am Strand.

Himmel und Meer liegen immer oberhalb der Schleierkante – deshalb dürfen
Flugzeuge, Drachen, Luftmatratzen und Boote zu jedem beliebigen Zeitpunkt
auftauchen. Strandobjekte bekommen ihr `at` so, dass sie immer knapp über der
frisch enthüllten Kante liegen; dadurch wirkt die Enthüllung durchgehend von
oben nach unten.

### Gegen eine echte Illustration austauschen

In `js/beachworld.js` nur diese zwei Stellen ersetzen:

* `BASE_SCENE` → dein großes Hintergrundbild
  (z. B. `<image href="art/beach.png" width="760" height="760"/>`)
* die Einträge in `buildItems()` → deine Detail-Elemente mit `at` und `y`

Der Schleier-Mechanismus, die Animationen und das gesamte UI bleiben
unverändert. Wichtig ist nur: die Grundfläche behält 760 × 760, und `y` eines
Elements ist immer sein *Standfuß*.

---

## Welten & Durchläufe

Eine Welt fasst 100 Sticker. Beim 100. Sticker fragt die App, ob die Welt so
bleiben soll oder ob eine neue beginnen darf – nie automatisch, nie mit Druck.
Dasselbe geht jederzeit über *More → Deine Welt → Neue Welt beginnen*.

Bei einem neuen Durchlauf wandern die bisherigen Sticker ins `archive`,
`stickers` startet leer und `run` zählt hoch. **Joy Cards bleiben immer
erhalten.** Im World-Reiter erscheint dann eine Plakette
„🌱 DURCHLAUF 2 · INSGESAMT 137".

Weitere Welten (Wald, Schnee, …) sind vorbereitet, aber noch nicht gebaut.
Die Registry liegt am Ende von `js/beachworld.js`:

```js
window.WORLDS.forest = {
  id: 'forest', name: 'Forest World', emoji: '🌲',
  api: ForestWorld            // braucht create(el) + discovered(n)
};
```

`app.js` nimmt `WORLDS[Store.data.worldId]`. Sobald eine zweite Welt
existiert, kann `startNewRun('forest')` direkt dorthin wechseln.

---

## Was die App bewusst NICHT tut

Diese Regeln sind absichtlich fest eingebaut – bitte beim Erweitern nicht
aufweichen:

* keine Streaks, keine Tages- oder Wochenziele
* keine Prozentwerte und **kein** „23 / 25" oder „noch 2 Sticker"
* keine Pflichtaufgaben, keine Checkliste auf der Startseite
* keine automatischen Erinnerungen
* keine negativen oder verlorenen Punkte
* die Aktivitätenliste erscheint erst nach Tippen auf den Button
* auf Home steht keine Gesamtzahl – nur die Blüten. Die Zahl gibt es
  im World-Reiter, wenn man sie sehen möchte.

Zwei bewusste Ausnahmen von der „ruhigen" Grundregel, beide gewünscht:

* **Rot** gibt es genau einmal – im Bestätigungsdialog für „Alles
  zurücksetzen". Dort *soll* man sehen, dass es endgültig ist.
* **Konfetti** gibt es genau einmal – beim Einlösen einer Joy Card.
  Das feiert das Genießen, nicht eine Leistung.

> **Hinweis zum Mockup:** In der Design-Vorlage stand an zwei Stellen
> „23 / 25" bzw. „Noch 2 Sticker bis zur nächsten Überraschung".
> Das ist bewusst nicht umgesetzt – es widerspricht den UX-Regeln.
> Übernommen wurde stattdessen die Blüten-Reihe unter dem Zähler,
> aber **ohne** leere Platzhalter und ohne Zielzahl: sie zeigt nur,
> was schon gesammelt wurde.

---

## Erweitern

**Aktionen** bearbeitet man normalerweise direkt in der App:
*More → Meine Aktionen → „12 Aktionen bearbeiten"*. Der Button öffnet ein
eigenes Sheet (`#habitSheet`), damit die More-Seite übersichtlich bleibt.
Dort lassen sich Einträge ändern, löschen und ergänzen; gespeichert wird
sofort. „＋ Aktion hinzufügen" und „Fertig ♡" sind als Fußzeile fest
angeheftet, damit sie auch bei langer Liste erreichbar bleiben.
Die eigene Liste liegt in `data.activities` und überschreibt die
Standardliste; „Standardliste wiederherstellen" setzt auf
`js/activities.js` zurück.

**Standardliste ändern** → `js/activities.js`:

```js
{ id: 'spaziergang', emoji: '🚶', label: 'Kurz rausgegangen' }
```

**Neue Joy Card** → `js/joycards.js`:

```js
{
  id: 'movie-night', level: 1, category: 'no-responsibilities',
  title: 'MOVIE NIGHT', emoji: '🎬',
  lines: ['Pick a film.', 'Nothing else tonight.']
}
```

**Neues Level** → Karten mit `level: 2` anlegen und in
`js/state.js` das `data.level` erhöhen. Karten werden nur aus Levels
gezogen, die freigeschaltet sind. Level 2–4 sind im Konzept vorgesehen
(CARE 🌸, MOVE 🌿, EXPLORE 🌊), aber nie verpflichtend.

**Joy-Card-Rhythmus** → `UNLOCK_EVERY` in `js/state.js` (aktuell alle 25).

---

## Gespeicherte Daten

Alles liegt unter dem localStorage-Schlüssel `mylittlejoy.v1`:

```json
{
  "version": 2,
  "level": 1,
  "run": 2,                  // wievielter Durchlauf
  "worldId": "beach",
  "archive": 100,            // Sticker abgeschlossener Durchläufe
  "completeAsked": false,    // wurde für diesen Durchlauf schon gefragt?
  "stickers": [ { "a": "bike", "t": 1757500000000 } ],
  "cards":    [ { "uid": "…", "cardId": "cozy-night",
                  "at": 1757500000000, "used": false, "usedAt": null } ],
  "activities": null,        // null = Standardliste, sonst eigene Aktionen
  "created": 1757400000000
}
```

Version 1 wird beim Laden automatisch migriert.

Unter *More → Daten* lässt sich das anzeigen, als Datei sichern und wieder
einfügen – damit kommt die Sammlung auch auf ein anderes Gerät.

---

## Weg zur APK

Das Projekt ist von Anfang an so gebaut, dass es sich ohne Umbau verpacken
lässt: relative Pfade, keine ES-Module, keine Netzwerkaufrufe,
kein Build-Schritt.

**Mit Capacitor** (Node.js und Android Studio vorausgesetzt):

```bash
npm init -y
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap init "MY LITTLE JOY" com.deinname.mylittlejoy --web-dir=.
npx cap add android
npx cap sync
npx cap open android
```

In Android Studio dann *Build → Build Bundle(s)/APK(s) → Build APK(s)*.

Zu beachten:

* `--web-dir=.` zeigt auf dieses Verzeichnis. Sauberer ist es, die Dateien
  vorher nach `www/` zu kopieren und `--web-dir=www` zu nehmen.
* Capacitor lädt über `https://localhost` – localStorage bleibt dadurch
  zwischen App-Updates erhalten.
* Der Service Worker wird in der App nicht gebraucht (alles ist schon lokal),
  er stört aber auch nicht.
* App-Icons für Android brauchen PNGs. `icons/icon.svg` als Vorlage nehmen
  und über *Android Studio → Image Asset* oder `@capacitor/assets` erzeugen.

**Alternative ohne Node:** Die App unter einer beliebigen https-Adresse
hosten und über Chrome → *Zum Startbildschirm hinzufügen* installieren.
Durch `manifest.webmanifest` + `sw.js` verhält sie sich dann wie eine App
und funktioniert offline.

---

## Bekannte Feinheiten

* **Handschrift-Font:** Die geschwungenen Texte nutzen die Systemschriften
  (`Ink Free` / `Segoe Script` unter Windows). Auf Android gibt es keine
  passende – dort fällt es auf die Standardschrift zurück. Für die APK am
  besten eine Schrift wie *Caveat* als `.woff2` in `fonts/` legen und in
  `css/styles.css` per `@font-face` einbinden, dann sieht es überall gleich
  aus. Bewusst keine Google-Fonts-Einbindung, damit die App offline bleibt.
* **Service Worker:** Cache-Strategie ist *network-first*, damit Änderungen
  sofort ankommen. Beim Ausrollen trotzdem `CACHE` in `sw.js` hochzählen.
  Wenn du trotzdem mal eine alte Version siehst: in den DevTools unter
  *Application → Service Workers → Unregister* und einmal mit Strg+Shift+R
  neu laden. Der Dev-Server schickt `Cache-Control: no-cache`
  (bewusst nicht `no-store` – damit lehnt Chrome Service-Worker-Skripte ab).
* **`[hidden]` und `display`:** Overlays und Zeilen setzen `display:flex`.
  Autor-Regeln schlagen das `display:none` des Browsers für `[hidden]` –
  deshalb steht ganz oben in `styles.css` ein
  `[hidden]{ display:none !important; }`. Ohne das liegen die Overlays
  unsichtbar über der ganzen App und schlucken jeden Klick. Bitte beim
  Ergänzen neuer versteckter Elemente im Kopf behalten.
* **Zwei Beach Worlds gleichzeitig:** Home und World zeigen dieselbe Welt in
  zwei SVG-Instanzen. Deren Gradient-IDs werden pro Instanz umbenannt –
  sonst löst die zweite Instanz ihre Farbverläufe nicht auf. Beim Ergänzen
  neuer `<defs>` das Präfix `mlj…` beibehalten.
