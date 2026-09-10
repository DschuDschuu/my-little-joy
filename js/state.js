/* ------------------------------------------------------------------
   STATE  —  localStorage only, kein Backend.
------------------------------------------------------------------ */
window.Store = (function () {
  'use strict';

  var KEY = 'mylittlejoy.v1';
  var UNLOCK_EVERY = 25;   // alle 25 Sticker eine Joy Card
  var WORLD_SIZE = 100;    // so viele Sticker fasst eine Welt

  function fresh() {
    return {
      version: 2,
      level: 1,
      run: 1,               // wievielter Durchlauf dieser Welt
      worldId: 'beach',
      stickers: [],         // Sticker des aktuellen Durchlaufs
      archive: 0,           // Sticker aus abgeschlossenen Durchläufen
      cards: [],
      activities: null,     // null = Standardliste aus activities.js
      completeAsked: false, // wurde für diesen Durchlauf schon gefragt?
      created: Date.now()
    };
  }

  var data = fresh();

  function migrate(p) {
    if (!p || !Array.isArray(p.stickers) || !Array.isArray(p.cards)) return null;
    var d = fresh();
    d.level = p.level || 1;
    d.stickers = p.stickers;
    d.cards = p.cards;
    d.created = p.created || Date.now();
    d.run = p.run || 1;
    d.archive = p.archive || 0;
    d.worldId = p.worldId || 'beach';
    d.activities = p.activities || null;
    d.completeAsked = !!p.completeAsked;
    return d;
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var d = migrate(JSON.parse(raw));
        if (d) data = d;
      }
    } catch (e) { /* z. B. privater Modus – dann eben nur diese Sitzung */ }
    return data;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  /* ── Sticker ──────────────────────────────────────────────────── */

  function count() { return data.stickers.length; }
  function total() { return data.archive + data.stickers.length; }

  function addSticker(activityId) {
    data.stickers.push({ a: activityId, t: Date.now() });
    save();
    return count();
  }

  /* Nimmt den letzten Sticker zurück (kurzes "Rückgängig" nach dem
     Hinzufügen). Gibt zurück, ob etwas entfernt wurde. */
  function removeLastSticker() {
    if (!data.stickers.length) return false;
    data.stickers.pop();
    save();
    return true;
  }

  /* Tagesgrenze: lokale Mitternacht. */
  function dayKey(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  /* Wurde diese Aktion heute schon gesammelt? Zählt über Durchläufe
     hinweg nur den aktuellen – reicht, weil ein Durchlauf-Wechsel
     ohnehin ein bewusster Neuanfang ist. */
  function addedToday(activityId) {
    var today = dayKey(Date.now());
    for (var i = data.stickers.length - 1; i >= 0; i--) {
      var s = data.stickers[i];
      if (dayKey(s.t) !== today) break;      // älter als heute -> fertig
      if (s.a === activityId) return true;
    }
    return false;
  }

  function isUnlockMoment(n) { return n > 0 && n % UNLOCK_EVERY === 0; }
  function isWorldComplete() { return count() >= WORLD_SIZE; }

  /* Welt abschließen und neu beginnen. Die Joy Cards bleiben. */
  function startNewRun(worldId) {
    data.archive += data.stickers.length;
    data.stickers = [];
    data.run += 1;
    data.completeAsked = false;
    if (worldId) data.worldId = worldId;
    save();
  }

  function markCompleteAsked() { data.completeAsked = true; save(); }

  /* ── Aktivitäten ──────────────────────────────────────────────── */

  function activities() {
    if (data.activities && data.activities.length) return data.activities;
    return window.ACTIVITIES.map(function (a) { return { id: a.id, emoji: a.emoji, label: a.label }; });
  }

  function setActivities(list) {
    data.activities = list.filter(function (a) { return (a.label || '').trim(); })
      .map(function (a, i) {
        return {
          id: a.id || ('own-' + Date.now().toString(36) + '-' + i),
          emoji: (a.emoji || '🌸').trim() || '🌸',
          label: a.label.trim()
        };
      });
    save();
  }

  function resetActivities() { data.activities = null; save(); }

  function activityLabel(id) {
    var a = activities().filter(function (x) { return x.id === id; })[0];
    return a ? a.label : null;
  }

  /* ── Joy Cards ────────────────────────────────────────────────── */

  function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

  function drawCard() {
    var pool = window.JOY_CARDS.filter(function (c) { return c.level <= data.level; });
    var owned = {};
    data.cards.forEach(function (i) { owned[i.cardId] = true; });
    var unseen = pool.filter(function (c) { return !owned[c.id]; });
    var from = unseen.length ? unseen : pool;
    var pick = from[Math.floor(Math.random() * from.length)];

    var inst = { uid: uid(), cardId: pick.id, at: Date.now(), used: false, usedAt: null };
    data.cards.push(inst);
    save();
    return inst;
  }

  function cardDef(id) {
    return window.JOY_CARDS.filter(function (c) { return c.id === id; })[0] || null;
  }

  function useCard(uidStr) {
    data.cards.forEach(function (i) {
      if (i.uid === uidStr && !i.used) { i.used = true; i.usedAt = Date.now(); }
    });
    save();
  }

  function cards(used) {
    return data.cards.filter(function (i) { return !!i.used === !!used; })
                     .sort(function (a, b) { return b.at - a.at; });
  }

  /* ── Daten ────────────────────────────────────────────────────── */

  function exportJSON() { return JSON.stringify(data, null, 2); }

  function importJSON(text) {
    var d = migrate(JSON.parse(text));
    if (!d) throw new Error('Das sieht nicht nach einer MY LITTLE JOY Sammlung aus.');
    data = d;
    save();
  }

  function reset() { data = fresh(); save(); }

  return {
    UNLOCK_EVERY: UNLOCK_EVERY,
    WORLD_SIZE: WORLD_SIZE,
    load: load, save: save,
    get data() { return data; },
    count: count, total: total, addSticker: addSticker,
    removeLastSticker: removeLastSticker, addedToday: addedToday, dayKey: dayKey,
    isUnlockMoment: isUnlockMoment, isWorldComplete: isWorldComplete,
    startNewRun: startNewRun, markCompleteAsked: markCompleteAsked,
    activities: activities, setActivities: setActivities,
    resetActivities: resetActivities, activityLabel: activityLabel,
    drawCard: drawCard, cardDef: cardDef, useCard: useCard, cards: cards,
    exportJSON: exportJSON, importJSON: importJSON, reset: reset
  };
})();
