/* ==================================================================
   MY LITTLE JOY — App-Logik
   Nichts muss. Alles zählt.
================================================================== */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ── der Sticker: eine kleine handgemalte Blüte ─────────────── */
  function stickerSVG() {
    var white = '', pink = '', i, a, cx, cy;
    for (i = 0; i < 5; i++) {
      a = (i * 72 - 90) * Math.PI / 180;
      cx = 50 + Math.cos(a) * 19; cy = 50 + Math.sin(a) * 19;
      white += '<ellipse cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" rx="21" ry="24.5" transform="rotate(' + (i * 72) + ' ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ')" fill="#ffffff"/>';
      pink += '<ellipse cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" rx="16.5" ry="19.5" transform="rotate(' + (i * 72) + ' ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ')" fill="#f2a9b6"/>';
    }
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' + white + pink +
      '<circle cx="50" cy="50" r="8" fill="#fae2e6"/>' +
      '<path d="M50 47V33" stroke="#f0c07f" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="50" cy="32" r="3.4" fill="#f6d79a"/><circle cx="44" cy="36" r="2.6" fill="#f6d79a"/><circle cx="56" cy="36" r="2.6" fill="#f6d79a"/>' +
      '</svg>';
  }
  var STICKER = stickerSVG();

  var TORN_TICKET =
    '<svg class="icon-ticket" viewBox="0 0 30 18" aria-hidden="true">' +
    '<path d="M1 4.5A1.5 1.5 0 0 1 2.5 3h9l-1.5 2.25L11.5 7.5 10 9.75l1.5 2.25L10 14.25H2.5A1.5 1.5 0 0 1 1 12.75Z"/>' +
    '<path d="M29 4.5A1.5 1.5 0 0 0 27.5 3h-9l1.5 2.25L18.5 7.5 20 9.75l-1.5 2.25L20 14.25h7.5A1.5 1.5 0 0 0 29 12.75Z"/></svg>';

  /* ── state ─────────────────────────────────────────────────── */
  Store.load();

  var WORLD = (window.WORLDS && window.WORLDS[Store.data.worldId]) || window.WORLDS.beach;
  var worldHome = WORLD.api.create($('bwHome'));
  var worldBig = WORLD.api.create($('bwWorld'));
  var pendingCard = null;
  var openCardUid = null;
  var busy = false;
  var restartMode = 'complete';   // 'complete' | 'manual'

  /* ── kleine Helfer ─────────────────────────────────────────── */

  function thingsLabel(n) { return n + (n === 1 ? ' little thing collected' : ' little things collected'); }
  function usableLabel(n) { return n + (n === 1 ? ' Joy Card usable' : ' Joy Cards usable'); }
  function fmt(ts) {
    var d = new Date(ts);
    return ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear();
  }

  function toast(main, sub, ms) {
    var t = $('toast');
    t.innerHTML = '<div class="toast__main">' + main + '</div>' + (sub ? '<div class="toast__sub">' + sub + '</div>' : '');
    t.hidden = false;
    void t.offsetWidth;
    t.classList.add('is-open');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      t.classList.remove('is-open');
      setTimeout(function () { t.hidden = true; }, 450);
    }, ms || 2800);
  }

  /* Bewusst kein requestAnimationFrame: das feuert nicht, wenn die Seite
     gerade nicht zeichnet (App im Hintergrund, Wiederaufwachen). Dann
     bliebe das Overlay unsichtbar unter dem Rand liegen, waere aber
     bereits eingeblendet - und wuerde Klicks schlucken. Ein erzwungener
     Reflow startet die Transition zuverlaessig. */
  function openLayer(el) {
    el.hidden = false;
    void el.offsetWidth;
    el.classList.add('is-open');
  }
  function closeLayer(el) {
    el.classList.remove('is-open');
    setTimeout(function () { el.hidden = true; }, 420);
  }

  /* ── rendering ─────────────────────────────────────────────── */

  /* Home: nur die Blüten. Je 25 gesammelte Dinge (= eine Joy Card)
     werden zu einem Blumenstrauß zusammengefasst. Keine Zahl,
     kein "+7", kein Ziel. */
  function renderHome() {
    var n = Store.count();
    $('collectCard').hidden = n === 0;

    var bouquets = Math.floor(n / Store.UNLOCK_EVERY);
    var rest = n % Store.UNLOCK_EVERY;
    var html = '', d = 0, i;
    for (i = 0; i < bouquets; i++) html += '<i class="bq" style="animation-delay:' + (d++ * 22) + 'ms">💐</i>';
    for (i = 0; i < rest; i++) html += '<i style="animation-delay:' + (d++ * 22) + 'ms">🌸</i>';
    $('flowerRow').innerHTML = html;

    $('worldCaption').innerHTML = n === 0
      ? 'Dein Strand wartet ganz entspannt. <b>♡</b>'
      : (n >= Store.WORLD_SIZE ? 'Deine Beach World ist komplett. <b>♡</b>' : 'Your beach is growing… <b>♡</b>');
  }

  function renderWorldView() {
    var n = Store.count();
    $('collectedWorld').innerHTML = thingsLabel(n) + ' <b>♡</b>';

    var pill = $('runPill');
    if (Store.data.run > 1) {
      pill.hidden = false;
      pill.textContent = '🌱 DURCHLAUF ' + Store.data.run + ' · INSGESAMT ' + Store.total();
    } else {
      pill.hidden = true;
    }

    var found = WORLD.api.discovered(n);
    var wrap = $('discovered');
    if (!found.length) {
      wrap.innerHTML = '<p class="empty">Hier taucht auf, was du schon entdeckt hast.</p>';
      return;
    }
    var html = '<h2 class="section-title" style="text-align:center">Schon entdeckt</h2><div class="disc-grid">';
    found.forEach(function (f, i) {
      html += '<span class="disc-chip" style="animation-delay:' + (i * 40) + 'ms">' + f.emoji + ' ' + f.label + '</span>';
    });
    wrap.innerHTML = html + '</div>';
  }

  function cardHTML(def, inst) {
    var cat = def.category === 'food-joy' ? 'Food Joy' : 'No Responsibilities';
    return '<span class="joycard__emoji">' + def.emoji + '</span>' +
      '<h3 class="joycard__title">' + def.title + '</h3>' +
      '<p class="joycard__body">' + def.lines.join('<br>') + '</p>' +
      '<p class="joycard__cat">' + cat + '</p>' +
      (inst && inst.used ? '<p class="joycard__used">' + TORN_TICKET + ' Already used · ' + fmt(inst.usedAt) + '</p>' : '');
  }

  function miniHTML(inst) {
    var def = Store.cardDef(inst.cardId);
    if (!def) return '';
    return '<button class="joy-mini" data-uid="' + inst.uid + '">' +
      (inst.used ? '<span class="joy-mini__stamp">' + TORN_TICKET + ' used</span>' : '') +
      '<span class="joy-mini__emoji">' + def.emoji + '</span>' +
      '<span class="joy-mini__title">' + def.title + '</span>' +
      '<span class="joy-mini__date">' + (inst.used ? 'genossen ' + fmt(inst.usedAt) : 'gesammelt ' + fmt(inst.at)) + '</span>' +
      '</button>';
  }

  function renderWallet() {
    var open = Store.cards(false), used = Store.cards(true);
    var total = open.length + used.length;

    $('walletEmpty').hidden = total > 0;
    $('walletCount').hidden = total === 0;
    $('walletCount').querySelector('.collected__text').textContent = usableLabel(open.length);

    $('joyGrid').innerHTML = open.map(miniHTML).join('');
    $('usedWrap').hidden = used.length === 0;
    $('usedGrid').innerHTML = used.map(miniHTML).join('');
  }

  function renderMore() {
    var n = Store.count(), open = Store.cards(false).length, used = Store.cards(true).length;
    var s = thingsLabel(n);
    if (Store.data.run > 1) s += '<br>Durchlauf ' + Store.data.run + ' · insgesamt ' + Store.total();
    s += '<br>' + usableLabel(open) + (used ? ' · ' + used + ' already used' : '');
    $('moreStats').innerHTML = s;

    $('habitsCount').textContent = String(Store.activities().length);

    $('worldInfo').innerHTML = WORLD.emoji + ' ' + WORLD.name +
      (Store.data.run > 1 ? ' · Durchlauf ' + Store.data.run : '') +
      (n >= Store.WORLD_SIZE ? '<br>Komplett ♡' : '');
  }

  /* Aktionen im Sheet. Was heute schon gesammelt wurde, ist blasser und
     traegt den Hinweis - bleibt aber antippbar, weil zweimal Fahrrad oder
     morgens und abends dehnen echte Faelle sind. */
  function renderActs() {
    $('acts').innerHTML = Store.activities().map(function (a) {
      var done = Store.addedToday(a.id);
      return '<div class="act-row" data-row="' + esc(a.id) + '">' +
        '<button class="act' + (done ? ' act--done' : '') + '" data-act="' + esc(a.id) + '">' +
          '<span class="act__emoji">' + esc(a.emoji) + '</span>' +
          '<span class="act__text">' + esc(a.label) +
            (done ? '<em class="act__note">heute schon gesammelt</em>' : '') +
          '</span>' +
        '</button></div>';
    }).join('');
  }

  /* Zweites Antippen einer schon gesammelten Aktion: kurze Rueckfrage
     direkt in der Zeile, kein zusaetzliches Overlay. */
  function askAgain(row, activityId) {
    clearAsk();
    row.classList.add('is-asking');
    var bar = document.createElement('div');
    bar.className = 'act-confirm';
    bar.innerHTML =
      '<span class="act-confirm__q">Noch einmal?</span>' +
      '<button class="act-confirm__yes" data-yes="' + esc(activityId) + '">Ja ♡</button>' +
      '<button class="act-confirm__no">Nein</button>';
    row.appendChild(bar);
  }

  function clearAsk() {
    Array.prototype.forEach.call($('acts').querySelectorAll('.act-row.is-asking'), function (r) {
      r.classList.remove('is-asking');
      var b = r.querySelector('.act-confirm');
      if (b) b.remove();
    });
  }

  function renderAll(opts) {
    opts = opts || {};
    var n = Store.count();
    worldHome.render(n, opts);
    worldBig.render(n, opts);
    renderHome();
    renderWorldView();
    renderWallet();
    renderMore();
    renderActs();
    fitHomeWorld();   // die Blütenreihe kann von einer auf zwei Zeilen wachsen
  }

  /* ── navigation ────────────────────────────────────────────── */

  function show(view) {
    ['home', 'world', 'wallet', 'more'].forEach(function (v) { $('view-' + v).hidden = v !== view; });
    Array.prototype.forEach.call(document.querySelectorAll('.nav__btn'), function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-view') === view);
    });
    /* Home passt auf einen Bildschirm und scrollt nicht - alle anderen
       Seiten scrollen wie bisher. */
    document.body.classList.toggle('is-home', view === 'home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fitHomeWorld();
  }

  /* ── Home ohne Scrollen: Beach World nimmt den Rest ────────── */

  /* Die Welt muss quadratisch bleiben (der Papier-Schleier rechnet in
     Prozent der Boxhoehe). Deshalb wird die Kantenlaenge hier aus dem
     tatsaechlich freien Platz berechnet statt in CSS geraten. */
  function fitHomeWorld() {
    var bw = $('bwHome');
    if (!document.body.classList.contains('is-home')) {
      bw.style.width = ''; bw.style.height = '';
      return;
    }
    var card = document.querySelector('#view-home .card--world');
    var free = card.clientHeight - $('worldCaption').offsetHeight - 9;
    var wide = card.clientWidth - 18;
    var size = Math.max(150, Math.min(wide, free));
    bw.style.width = size + 'px';
    bw.style.height = size + 'px';
  }

  var fitTimer = null;
  function fitSoon() { clearTimeout(fitTimer); fitTimer = setTimeout(fitHomeWorld, 60); }
  window.addEventListener('resize', fitSoon);
  window.addEventListener('orientationchange', fitSoon);

  /* ── Nachtmodus ────────────────────────────────────────────── */

  var NIGHT_NOTE = {
    auto: 'Feste Uhrzeiten. Die Sommerzeit macht die App automatisch mit, dem Sonnenstand folgt sie aber nicht – im Winter wird es früher dunkel.',
    system: 'Folgt dem Dunkelmodus deines Handys. Wenn du dort unter Anzeige → Dunkelmodus „Sonnenuntergang bis Sonnenaufgang" einstellst, passt sich die App das ganze Jahr von selbst an.',
    on: 'Immer dunkel, unabhängig von der Uhrzeit.',
    off: 'Immer hell.'
  };

  function applyNight() {
    var mode = Store.nightMode();
    var on = Store.isNight();

    document.body.classList.toggle('night', on);
    var meta = $('themeColor');
    if (meta) meta.setAttribute('content', on ? '#131d26' : '#dbecf5');

    Array.prototype.forEach.call($('nightSeg').querySelectorAll('button'), function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-night') === mode);
    });

    $('nightTimes').hidden = mode !== 'auto';
    $('nightFrom').value = Store.nightFrom();
    $('nightTo').value = Store.nightTo();
    $('nightNote').textContent = NIGHT_NOTE[mode] || '';
  }

  $('nightSeg').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-night]');
    if (!b) return;
    Store.setNightMode(b.getAttribute('data-night'));
    applyNight();
  });

  $('nightTimes').addEventListener('change', function () {
    Store.setNightTimes($('nightFrom').value, $('nightTo').value);
    applyNight();
  });

  /* Wenn das Handy seinen Dunkelmodus umschaltet (z. B. bei
     Sonnenuntergang), zieht die App sofort mit. */
  try {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onMq = function () { if (Store.nightMode() === 'system') applyNight(); };
    if (mq.addEventListener) mq.addEventListener('change', onMq);
    else if (mq.addListener) mq.addListener(onMq);
  } catch (e) {}

  /* Automatik nachziehen: beim Zurueckkommen zur App und einmal pro Minute. */
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { applyNight(); fitSoon(); }
  });
  setInterval(applyNight, 60000);

  $('nav').addEventListener('click', function (e) {
    var b = e.target.closest('.nav__btn');
    if (b) show(b.getAttribute('data-view'));
  });

  /* ── sheet ─────────────────────────────────────────────────── */

  var sheet = $('sheet');

  $('btnAdd').addEventListener('click', function () {
    clearAsk();
    hideUndo();
    renderActs();          // "heute schon gesammelt" beim Öffnen frisch
    openLayer(sheet);
  });

  sheet.addEventListener('click', function (e) {
    if (e.target.hasAttribute('data-close')) { closeLayer(sheet); clearAsk(); return; }

    var no = e.target.closest('.act-confirm__no');
    if (no) { clearAsk(); return; }

    var yes = e.target.closest('.act-confirm__yes');
    if (yes) {
      if (!busy) collect(yes.getAttribute('data-yes'), yes);
      return;
    }

    var b = e.target.closest('.act');
    if (!b || busy) return;

    var id = b.getAttribute('data-act');
    if (b.classList.contains('act--done')) {
      askAgain(b.closest('.act-row'), id);   // erst fragen
      return;
    }
    collect(id, b);
  });

  /* ── Sticker fliegt in die Welt ────────────────────────────── */

  function flyToWorld(fromEl) {
    return new Promise(function (resolve) {
      var tr = $('bwHome').getBoundingClientRect();
      var sr = fromEl ? fromEl.getBoundingClientRect() : null;
      var x0 = sr ? sr.left + 34 : window.innerWidth / 2;
      var y0 = sr ? sr.top + sr.height / 2 : window.innerHeight * 0.7;
      var x1 = tr.left + tr.width / 2;
      var y1 = tr.top + tr.height * 0.62;

      var el = document.createElement('div');
      el.className = 'fx-sticker';
      el.innerHTML = STICKER;
      el.style.left = x0 + 'px';
      el.style.top = y0 + 'px';
      $('fxLayer').appendChild(el);

      var done = false;
      function finish() { if (done) return; done = true; el.remove(); resolve(); }

      if (el.animate) {
        var a = el.animate([
          { transform: 'translate(0,0) scale(.35) rotate(-14deg)', opacity: 0 },
          { transform: 'translate(0,-26px) scale(1.15) rotate(5deg)', opacity: 1, offset: .3 },
          { transform: 'translate(0,-34px) scale(1.05) rotate(0deg)', opacity: 1, offset: .45 },
          { transform: 'translate(' + (x1 - x0) + 'px,' + (y1 - y0) + 'px) scale(.45) rotate(16deg)', opacity: .15 }
        ], { duration: 1150, easing: 'cubic-bezier(.32,.9,.3,1)' });
        a.onfinish = finish;
        setTimeout(finish, 1400);
      } else {
        setTimeout(finish, 400);
      }
    });
  }

  function collect(activityId, sourceEl) {
    busy = true;
    clearAsk();
    hideUndo();
    closeLayer(sheet);
    flyToWorld(sourceEl).then(function () {
      var n = Store.addSticker(activityId);
      renderAll({ pulse: true, highlightNew: true });
      busy = false;

      if (Store.isUnlockMoment(n)) {
        setTimeout(function () { unlockJoy(n); }, 1400);
      } else if (n >= Store.WORLD_SIZE && !Store.data.completeAsked) {
        setTimeout(function () { showWorldDone('complete'); }, 1400);
      } else {
        /* Kein Rueckgaengig, wenn gleich eine Joy Card oder das Welt-Ende
           kommt - die Karte waere sonst schon gezogen. */
        showUndo();
      }
    });
  }

  /* ── Rückgängig: kurzes Zurück für den Fehltipp ────────────── */

  var undoTimer = null;

  function showUndo() {
    var bar = $('undoBar');
    bar.hidden = false;
    void bar.offsetWidth;
    bar.classList.add('is-open');
    clearTimeout(undoTimer);
    undoTimer = setTimeout(hideUndo, 6500);
  }

  function hideUndo() {
    clearTimeout(undoTimer);
    var bar = $('undoBar');
    if (bar.hidden) return;
    bar.classList.remove('is-open');
    setTimeout(function () { bar.hidden = true; }, 400);
  }

  $('btnUndo').addEventListener('click', function () {
    hideUndo();
    if (!Store.removeLastSticker()) return;
    renderAll();
    toast('Zurückgenommen ♡', null, 2200);
  });

  /* ── joy unlock ────────────────────────────────────────────── */

  function unlockJoy(n) {
    var inst = Store.drawCard();
    pendingCard = inst;
    $('unlockSub').innerHTML = 'You collected ' + n + ' little things for yourself.';
    $('unlockCard').innerHTML = cardHTML(Store.cardDef(inst.cardId), inst);
    openLayer($('joyOverlay'));
    renderHome();
    renderWallet();
    renderMore();
  }

  $('btnKeepJoy').addEventListener('click', function () {
    closeLayer($('joyOverlay'));
    pendingCard = null;
    setTimeout(function () {
      if (Store.count() >= Store.WORLD_SIZE && !Store.data.completeAsked) showWorldDone('complete');
    }, 620);
  });

  /* ── Welt komplett / neu beginnen ──────────────────────────── */

  function showWorldDone(mode) {
    restartMode = mode;
    if (mode === 'complete') {
      $('worldDoneKicker').innerHTML = '🌅 DEINE WELT IST KOMPLETT 🌅';
      $('worldDoneEmoji').textContent = '🏖️';
      $('worldDoneTitle').textContent = '100 LITTLE THINGS';
      $('worldDoneBody').innerHTML =
        'Du hast diesen kleinen Ort Stück für Stück gebaut.<br><br>' +
        'Du kannst ihn genau so lassen – oder eine neue Welt beginnen ' +
        'und wieder von vorn wachsen sehen.<br><br>' +
        'Deine Joy Cards bleiben auf jeden Fall bei dir. ♡';
      $('btnKeepWorld').textContent = 'So lassen ♡';
    } else {
      $('worldDoneKicker').innerHTML = '🌱 NEUE WELT BEGINNEN?';
      $('worldDoneEmoji').textContent = '🌱';
      $('worldDoneTitle').textContent = 'VON VORN';
      $('worldDoneBody').innerHTML =
        'Deine jetzige Welt mit <b>' + Store.count() + '</b> kleinen Dingen wird abgelegt, ' +
        'und du fängst wieder mit einem leeren Strand an.<br><br>' +
        'Gezählt wird alles weiter – und deine Joy Cards bleiben bei dir. ♡';
      $('btnKeepWorld').textContent = 'Doch nicht ♡';
    }
    openLayer($('worldDone'));
  }

  $('btnNewWorld').addEventListener('click', function () {
    Store.markCompleteAsked();
    Store.startNewRun();
    closeLayer($('worldDone'));
    renderAll();
    show('home');
    setTimeout(function () {
      toast('Eine neue Welt beginnt 🌱', 'Durchlauf ' + Store.data.run + '. Ganz ohne Eile.', 3200);
    }, 500);
  });

  $('btnKeepWorld').addEventListener('click', function () {
    if (restartMode === 'complete') Store.markCompleteAsked();
    closeLayer($('worldDone'));
  });

  $('btnRestartWorld').addEventListener('click', function () {
    if (Store.count() === 0) { toast('Deine Welt ist schon ganz frisch ♡'); return; }
    showWorldDone(Store.count() >= Store.WORLD_SIZE ? 'complete' : 'manual');
  });

  /* ── wallet ────────────────────────────────────────────────── */

  $('view-wallet').addEventListener('click', function (e) {
    var b = e.target.closest('.joy-mini');
    if (!b) return;
    var uid = b.getAttribute('data-uid');
    var inst = Store.data.cards.filter(function (i) { return i.uid === uid; })[0];
    if (!inst) return;
    openCardUid = uid;
    $('modalCard').innerHTML = cardHTML(Store.cardDef(inst.cardId), inst);
    $('btnUseJoy').hidden = !!inst.used;
    openLayer($('cardModal'));
  });

  $('btnUseJoy').addEventListener('click', function () {
    if (!openCardUid) return;
    Store.useCard(openCardUid);
    openCardUid = null;
    confetti($('modalCard'));
    closeLayer($('cardModal'));
    renderWallet();
    renderMore();
    setTimeout(function () { toast('Viel Freude damit ♡', 'Die Karte bleibt in deinem Wallet.', 3000); }, 500);
  });

  $('cardModal').addEventListener('click', function (e) {
    if (e.target.hasAttribute('data-close')) { closeLayer($('cardModal')); openCardUid = null; }
  });

  /* ── Konfetti ──────────────────────────────────────────────── */

  function confetti(originEl) {
    var layer = $('fxLayer');
    var colors = ['#f2a9b6', '#f6d79a', '#a9d3e6', '#fffaf2', '#8fbf93', '#f0a99a'];
    var r = originEl ? originEl.getBoundingClientRect() : null;
    var cx = r ? r.left + r.width / 2 : window.innerWidth / 2;
    var cy = r ? r.top + r.height / 2 : window.innerHeight / 2;

    for (var i = 0; i < 54; i++) {
      (function (i) {
        var p = document.createElement('i');
        p.className = 'fx-confetti';
        p.style.background = colors[i % colors.length];
        if (i % 4 === 0) p.style.borderRadius = '50%';
        if (i % 5 === 0) { p.style.width = '7px'; p.style.height = '11px'; }
        p.style.left = cx + 'px';
        p.style.top = cy + 'px';
        layer.appendChild(p);

        var ang = (-90 + (Math.random() * 170 - 85)) * Math.PI / 180;
        var dist = 70 + Math.random() * 200;
        var dx = Math.cos(ang) * dist;
        var dy = Math.sin(ang) * dist;
        var fall = 240 + Math.random() * 300;
        var rot = Math.random() * 720 - 360;
        var dur = 1500 + Math.random() * 900;

        if (!p.animate) { setTimeout(function () { p.remove(); }, 60); return; }
        var a = p.animate([
          { transform: 'translate(-50%,-50%) scale(.5) rotate(0deg)', opacity: 1 },
          { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(1) rotate(' + (rot / 2) + 'deg)', opacity: 1, offset: .34 },
          { transform: 'translate(calc(-50% + ' + (dx * 1.3) + 'px), calc(-50% + ' + (dy + fall) + 'px)) scale(.8) rotate(' + rot + 'deg)', opacity: 0 }
        ], { duration: dur, easing: 'cubic-bezier(.16,.62,.36,1)' });
        a.onfinish = function () { p.remove(); };
        setTimeout(function () { p.remove(); }, dur + 400);
      })(i);
    }
  }

  /* ── eigene Aktionen bearbeiten ────────────────────────────── */

  function renderHabits() {
    $('habits').innerHTML = Store.activities().map(function (a) {
      return '<div class="habit" data-id="' + esc(a.id) + '">' +
        '<input class="habit__emoji" value="' + esc(a.emoji) + '" maxlength="4" aria-label="Symbol">' +
        '<input class="habit__label" value="' + esc(a.label) + '" aria-label="Beschreibung">' +
        '<button class="habit__del" type="button" aria-label="Entfernen">✕</button></div>';
    }).join('');
  }

  function collectHabits() {
    return Array.prototype.map.call($('habits').querySelectorAll('.habit'), function (row) {
      return {
        id: row.getAttribute('data-id') || '',
        emoji: row.querySelector('.habit__emoji').value,
        label: row.querySelector('.habit__label').value
      };
    });
  }

  var habitSheet = $('habitSheet');

  $('btnHabitsOpen').addEventListener('click', function () {
    renderHabits();
    openLayer(habitSheet);
  });

  habitSheet.addEventListener('click', function (e) {
    if (e.target.hasAttribute('data-close')) closeLayer(habitSheet);
  });

  var habitTimer = null;
  function saveHabits(immediate) {
    clearTimeout(habitTimer);
    var run = function () { Store.setActivities(collectHabits()); renderActs(); renderMore(); };
    if (immediate) run(); else habitTimer = setTimeout(run, 500);
  }

  $('habits').addEventListener('input', function () { saveHabits(false); });
  $('habits').addEventListener('change', function () { saveHabits(true); });

  $('habits').addEventListener('click', function (e) {
    var del = e.target.closest('.habit__del');
    if (!del) return;
    var row = del.closest('.habit');
    row.classList.add('is-going');
    setTimeout(function () {
      row.remove();
      saveHabits(true);
    }, 220);
  });

  $('btnHabitAdd').addEventListener('click', function () {
    var row = document.createElement('div');
    row.className = 'habit';
    row.setAttribute('data-id', '');
    row.innerHTML =
      '<input class="habit__emoji" value="🌸" maxlength="4" aria-label="Symbol">' +
      '<input class="habit__label" value="" placeholder="Was hast du für dich getan?" aria-label="Beschreibung">' +
      '<button class="habit__del" type="button" aria-label="Entfernen">✕</button>';
    $('habits').appendChild(row);
    row.querySelector('.habit__label').focus();
  });

  $('btnHabitReset').addEventListener('click', function () {
    Store.resetActivities();
    renderHabits();
    renderActs();
    renderMore();
    toast('Standardliste wiederhergestellt ♡');
  });

  /* ── Daten ─────────────────────────────────────────────────── */

  $('btnExport').addEventListener('click', function () {
    var box = $('dataBox');
    box.hidden = false;
    box.value = Store.exportJSON();
    box.select();
    $('importRow').hidden = true;
    try {
      $('btnDownload').href = URL.createObjectURL(new Blob([box.value], { type: 'application/json' }));
      $('downloadRow').hidden = false;
    } catch (e) {}
  });

  $('btnImportToggle').addEventListener('click', function () {
    var box = $('dataBox');
    box.hidden = false;
    box.value = '';
    box.placeholder = 'Hier die gesicherte Sammlung einfügen …';
    box.focus();
    $('importRow').hidden = false;
    $('downloadRow').hidden = true;
  });

  $('btnImportApply').addEventListener('click', function () {
    try {
      Store.importJSON($('dataBox').value);
      renderAll();
      renderHabits();
      $('dataBox').hidden = true;
      $('importRow').hidden = true;
      toast('Übernommen ♡', 'Deine Sammlung ist wieder da.');
    } catch (err) {
      toast('Das hat nicht geklappt', String(err.message || err), 3600);
    }
  });

  /* ── alles löschen (destruktiv, daher echter Dialog) ───────── */

  $('btnReset').addEventListener('click', function () { openLayer($('confirmReset')); });

  $('confirmReset').addEventListener('click', function (e) {
    if (e.target.hasAttribute('data-close')) closeLayer($('confirmReset'));
  });

  $('btnResetConfirm').addEventListener('click', function () {
    Store.reset();
    closeLayer($('confirmReset'));
    renderAll();
    renderHabits();
    show('home');
    setTimeout(function () { toast('Ein neuer Anfang 🌱', 'Ganz ohne Bewertung.'); }, 450);
  });

  /* ── los ───────────────────────────────────────────────────── */

  renderAll();
  renderHabits();
  applyNight();
  document.body.classList.add('is-home');
  fitHomeWorld();
  window.addEventListener('load', fitHomeWorld);

  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
