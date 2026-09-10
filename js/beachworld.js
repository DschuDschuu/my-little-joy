/* ==================================================================
   BEACH WORLD
   ------------------------------------------------------------------
       var world = BeachWorld.create(element);
       world.render(stickerCount);

   Es ist EIN einziges großes Bild (ein SVG, 760x760).
   Sichtbar gemacht wird es durch einen "Papier-Schleier", der sich
   mit jedem Sticker ein Stück weiter nach unten schiebt.

   GENAU 100 Elemente, eines pro Sticker: bei jedem einzelnen Sticker
   kommt sichtbar etwas Neues dazu. Bei 25 / 50 / 75 / 100 ist es
   jeweils eine ganze kleine Szene statt eines Einzelteils.

   Himmel und Meer liegen immer oberhalb der Schleierkante – deshalb
   dürfen Flugzeuge, Drachen, Luftmatratzen und Boote zu jedem
   beliebigen Zeitpunkt auftauchen. Strandobjekte bekommen ihr "at"
   so, dass sie immer knapp über der frisch enthüllten Kante liegen.

   Später austauschbar: nur BASE_SCENE + HAND/Streuung ersetzen.
================================================================== */
window.BeachWorld = (function () {
  'use strict';

  var W = 760, H = 760;
  var START = 0.60;          // bei 0 Stickern: Himmel + Meer + etwas Strand
  var FULL = 100;            // 100 Sticker = 100 Elemente = ganze Welt
  var K = (1 - START) / FULL;

  function n(v) { return Math.round(v * 100) / 100; }
  function revealPct(c) { return (START + K * Math.min(c, FULL)) * 100; }
  function curtainY(c) { return H * (START + K * Math.min(c, FULL)); }

  function T(x, y, s, r, inner) {
    return '<g transform="translate(' + n(x) + ',' + n(y) + ') rotate(' + n(r || 0) +
           ') scale(' + n(s == null ? 1 : s) + ')">' + inner + '</g>';
  }

  function mulberry(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* =================================================================
     Bausteine – Ursprung ist immer der Standfuß / die Wasserlinie
  ================================================================= */

  /* ---- Strand ---------------------------------------------------- */

  function shell() {
    return '<path d="M0 0C-13 -3 -12.5 -19 0 -21.5C12.5 -19 13 -3 0 0Z" fill="#fdece4" stroke="#e0aa9a" stroke-width="1.5" stroke-linejoin="round"/>' +
           '<path d="M0 -1.5V-19M-5 -3L-7.5 -15.5M5 -3L7.5 -15.5" fill="none" stroke="#e0aa9a" stroke-width="1.1" stroke-linecap="round"/>';
  }
  function pebble() {
    return '<path d="M-12 0C-14.5 -7 -7 -12.5 1 -11.5C10 -10.3 13.5 -3.5 11 0Z" fill="#e7dac7" stroke="#c9b79b" stroke-width="1.3"/>';
  }
  function starfish() {
    var R = 15, r = 6.6, cy = -15;
    var P = function (k) { var a = (-90 + k * 72) * Math.PI / 180; return [Math.cos(a) * R, Math.sin(a) * R + cy]; };
    var Q = function (k) { var a = (-90 + k * 72 + 36) * Math.PI / 180; return [Math.cos(a) * r, Math.sin(a) * r + cy]; };
    var d = 'M' + n(P(0)[0]) + ' ' + n(P(0)[1]);
    for (var i = 0; i < 5; i++) { var q = Q(i), p = P(i + 1); d += ' Q' + n(q[0]) + ' ' + n(q[1]) + ' ' + n(p[0]) + ' ' + n(p[1]); }
    return '<path d="' + d + 'Z" fill="#f7c6b0" stroke="#e2a189" stroke-width="1.4" stroke-linejoin="round"/>' +
           '<circle cy="' + cy + '" r="2.4" fill="#e2a189" opacity=".45"/>';
  }
  function grass() {
    return '<path d="M0 0C-1 -11 -6 -19 -13 -26M0 0C0 -13 -1 -24 -3 -33M0 0C2 -12 8 -19 15 -25M0 0C1 -9 5 -14 10 -18M0 0C-2 -8 -5 -12 -9 -15" fill="none" stroke="#8fb894" stroke-width="2.4" stroke-linecap="round"/>';
  }
  function flower(petal) {
    petal = petal || '#f2a9b6';
    var p = '';
    for (var i = 0; i < 5; i++) {
      var a = (i * 72 - 90) * Math.PI / 180;
      var cx = n(Math.cos(a) * 6), cy = n(Math.sin(a) * 6 - 17);
      p += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="4.6" ry="5.8" transform="rotate(' + (i * 72) + ' ' + cx + ' ' + cy + ')" fill="' + petal + '"/>';
    }
    return '<path d="M0 0C.5 -7 .5 -12 0 -17" fill="none" stroke="#8fb894" stroke-width="1.8" stroke-linecap="round"/>' + p +
           '<circle cy="-17" r="2.6" fill="#f6d79a"/>';
  }
  function wood() {
    return '<path d="M-22 -2C-13 -8 -3 -9 5 -6C13 -3 21 -5 25 -10" fill="none" stroke="#cdae8e" stroke-width="6" stroke-linecap="round"/>' +
           '<path d="M6 -7C10 -14 15 -16 19 -17" fill="none" stroke="#cdae8e" stroke-width="4" stroke-linecap="round"/>';
  }
  function foot() {
    return '<g fill="#e2cfaf" opacity=".8"><ellipse cx="0" cy="-4" rx="5.5" ry="8.5"/><ellipse cx="13" cy="-19" rx="5.5" ry="8.5"/></g>';
  }
  function bush() {
    return '<ellipse cx="-14" cy="-10" rx="15" ry="11" fill="#a4c7a3"/>' +
           '<ellipse cx="13" cy="-12" rx="16" ry="12" fill="#8fb894"/>' +
           '<ellipse cx="0" cy="-21" rx="14" ry="12" fill="#a4c7a3"/>' +
           '<path d="M-24 0C-20 -6 -10 -9.5 0 -9.5C10 -9.5 20 -6 24 0Z" fill="#8fb894"/>';
  }
  function reed() {
    return '<path d="M0 0C-2 -14 -3 -26 -6 -38M0 0C2 -13 6 -24 11 -34" fill="none" stroke="#7fae86" stroke-width="2.6" stroke-linecap="round"/>' +
           '<ellipse cx="-6" cy="-40" rx="3" ry="7" fill="#7fae86"/><ellipse cx="11" cy="-36" rx="3" ry="7" fill="#7fae86"/>';
  }
  function crab() {
    return '<ellipse cx="0" cy="-9" rx="11" ry="8" fill="#f2a48f" stroke="#dd8a76" stroke-width="1.3"/>' +
           '<path d="M-11 -8C-16 -12 -19 -8 -18 -4M11 -8C16 -12 19 -8 18 -4" fill="none" stroke="#dd8a76" stroke-width="2"/>' +
           '<path d="M-7 -2v3M0 -1v4M7 -2v3" fill="none" stroke="#dd8a76" stroke-width="1.6" stroke-linecap="round"/>' +
           '<circle cx="-4" cy="-14" r="1.8" fill="#4a7188"/><circle cx="4" cy="-14" r="1.8" fill="#4a7188"/>';
  }
  function sandcastle() {
    return '<path d="M-16 0v-16h32v16Z" fill="#ecd6ae" stroke="#d3b686" stroke-width="1.3"/>' +
           '<path d="M-16 -16h6v-6h-6ZM-4 -16h8v-9h-8ZM10 -16h6v-6h-6Z" fill="#ecd6ae" stroke="#d3b686" stroke-width="1.3"/>' +
           '<path d="M0 -25v-9l8 3l-8 3" fill="#f4bfc6" stroke="#dfa1ab" stroke-width="1.1"/>';
  }

  /* ---- Himmel ---------------------------------------------------- */

  function cloud() {
    return '<g fill="#ffffff" opacity=".92"><ellipse cx="-26" cy="-6" rx="24" ry="14"/><ellipse cx="2" cy="-15" rx="30" ry="19"/>' +
           '<ellipse cx="30" cy="-6" rx="23" ry="13"/><rect x="-42" y="-9" width="84" height="11" rx="5.5"/></g>';
  }
  function birds() {
    return '<g fill="none" stroke="#5b8299" stroke-width="2.2" stroke-linecap="round">' +
           '<path d="M-32 0C-26 -8 -18 -8 -12 0"/><path d="M-8 14C-2 6 6 6 12 14"/><path d="M14 -6C20 -14 28 -14 34 -6"/></g>';
  }
  function plane(flip) {
    return '<g transform="scale(' + (flip ? -1 : 1) + ',1)">' +
      '<g stroke="#a8c2d1" stroke-width="2.4" stroke-linecap="round" fill="none" opacity=".55">' +
        '<path d="M-34 2h-16M-58 2h-11M-75 2h-8"/></g>' +
      '<path d="M-32 2C-20 -2 6 -4 24 -2L34 1L24 4C6 6 -20 6 -32 2Z" fill="#fffaf2" stroke="#b9cfdb" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M-4 -1L-18 -16L-6 -16L8 -1Z" fill="#e8f2f7" stroke="#b9cfdb" stroke-width="1.3" stroke-linejoin="round"/>' +
      '<path d="M-4 3L-16 14L-5 14L7 3Z" fill="#dcebf3" stroke="#b9cfdb" stroke-width="1.3" stroke-linejoin="round"/>' +
      '<path d="M-28 0L-36 -11L-27 -11Z" fill="#e8f2f7" stroke="#b9cfdb" stroke-width="1.3" stroke-linejoin="round"/>' +
      '<circle cx="18" cy="0" r="1.6" fill="#a8c2d1"/><circle cx="10" cy="0" r="1.6" fill="#a8c2d1"/></g>';
  }
  function balloon() {
    return '<path d="M-8 -6h16l-2 8h-12Z" fill="#cba982" stroke="#b08f6d" stroke-width="1.2"/>' +
      '<path d="M-7 -7L-10 -20M7 -7L10 -20" fill="none" stroke="#b08f6d" stroke-width="1.2"/>' +
      '<path d="M0 -20C-19 -20 -30 -37 -30 -52C-30 -70 -16 -84 0 -84C16 -84 30 -70 30 -52C30 -37 19 -20 0 -20Z" fill="#f4bfc6" stroke="#dfa1ab" stroke-width="1.5"/>' +
      '<path d="M0 -84C-9 -66 -9 -36 0 -20" fill="none" stroke="#fffaf2" stroke-width="7" opacity=".85"/>' +
      '<path d="M-16 -80C-21 -64 -21 -38 -12 -25" fill="none" stroke="#a9d3e6" stroke-width="5" opacity=".7"/>' +
      '<path d="M16 -80C21 -64 21 -38 12 -25" fill="none" stroke="#f6d79a" stroke-width="5" opacity=".75"/>';
  }
  function kite() {
    return '<g transform="rotate(-14)">' +
      '<path d="M0 -66C4 -66 6 -60 6 -56L6 -34L0 -22L-6 -34L-6 -56C-6 -60 -4 -66 0 -66Z" fill="none"/>' +
      '<path d="M0 -70L20 -44L0 -22L-20 -44Z" fill="#a9d3e6" stroke="#7fb3cc" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M0 -70V-22M-20 -44H20" fill="none" stroke="#7fb3cc" stroke-width="1.2" opacity=".8"/>' +
      '<path d="M0 -70L0 -44L20 -44Z" fill="#f4bfc6" opacity=".8"/>' +
      '<path d="M0 -22C7 -14 -7 -8 0 0" fill="none" stroke="#dfa1ab" stroke-width="1.8"/>' +
      '<ellipse cx="4" cy="-16" rx="4" ry="2.6" fill="#f6d79a" transform="rotate(30 4 -16)"/>' +
      '<ellipse cx="-4" cy="-7" rx="4" ry="2.6" fill="#f2a9b6" transform="rotate(-25 -4 -7)"/></g>';
  }

  /* ---- Wasser ---------------------------------------------------- */

  function ripple(rx) {
    return '<ellipse cy="2" rx="' + rx + '" ry="' + n(rx * 0.19) + '" fill="#ffffff" opacity=".5"/>';
  }
  function lilo(c1, c2) {          // Luftmatratze
    c1 = c1 || '#f4bfc6'; c2 = c2 || '#fffaf2';
    return ripple(36) +
      '<rect x="-33" y="-13" width="66" height="14" rx="7" fill="' + c1 + '" stroke="#dfa1ab" stroke-width="1.3"/>' +
      '<path d="M-20 -13v14M-7 -13v14M6 -13v14M19 -13v14" fill="none" stroke="' + c2 + '" stroke-width="4.5" opacity=".9"/>' +
      '<rect x="-33" y="-20" width="17" height="8" rx="4" fill="' + c1 + '" stroke="#dfa1ab" stroke-width="1.2"/>';
  }
  function ring() {                // Schwimmreifen
    return ripple(22) +
      '<circle cy="-9" r="15" fill="none" stroke="#f2a9b6" stroke-width="8.5"/>' +
      '<path d="M-15 -9A15 15 0 0 1 0 -24" fill="none" stroke="#fffaf2" stroke-width="8.5"/>' +
      '<path d="M15 -9A15 15 0 0 1 0 6" fill="none" stroke="#fffaf2" stroke-width="8.5"/>';
  }
  function duck() {
    return ripple(17) +
      '<ellipse cx="-1" cy="-8" rx="12" ry="8.5" fill="#f6d79a" stroke="#e2bd76" stroke-width="1.2"/>' +
      '<circle cx="9" cy="-17" r="6.5" fill="#f6d79a" stroke="#e2bd76" stroke-width="1.2"/>' +
      '<path d="M15 -17l8 2.5l-8 2.5z" fill="#f2a06a"/><circle cx="11" cy="-19" r="1.4" fill="#2c5468"/>';
  }
  function dolphin() {
    return ripple(26) +
      '<path d="M-20 0Q0 -9 20 0Z" fill="#7ea7bd" opacity=".9"/>' +
      '<path d="M-1 -4C-3 -18 6 -30 18 -35C7 -27 3 -16 5 -4Z" fill="#7ea7bd" stroke="#5b8299" stroke-width="1.2" stroke-linejoin="round"/>';
  }
  function fish() {
    return '<g transform="rotate(-22)">' +
      '<path d="M0 0C10 -6.5 23 -6.5 31 0C23 6.5 10 6.5 0 0Z" fill="#a9d3e6" stroke="#7fb3cc" stroke-width="1.3"/>' +
      '<path d="M0 0L-9 -7.5L-9 7.5Z" fill="#a9d3e6" stroke="#7fb3cc" stroke-width="1.3" stroke-linejoin="round"/>' +
      '<circle cx="23" cy="-1.5" r="1.5" fill="#2c5468"/></g>' +
      '<g fill="#ffffff" opacity=".7"><circle cx="-14" cy="4" r="2.4"/><circle cx="-20" cy="10" r="1.7"/></g>';
  }
  function buoy() {
    return ripple(13) +
      '<path d="M-8 0h16l-3 -17h-10Z" fill="#f0a99a" stroke="#dd8f80" stroke-width="1.3" stroke-linejoin="round"/>' +
      '<path d="M-6.4 -9h12.8" fill="none" stroke="#fffaf2" stroke-width="3.4"/>' +
      '<path d="M0 -17v-11" fill="none" stroke="#c9ab8c" stroke-width="2"/>' +
      '<path d="M0 -28l10 3.5l-10 3.5z" fill="#f4bfc6"/>';
  }
  function sailboat(big) {
    var s = big ? 1 : 0.72;
    return ripple(30 * s) +
      '<g transform="scale(' + s + ')">' +
      '<path d="M-26 0L26 0L18 11H-18Z" fill="#f6ead6" stroke="#c9ab8c" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M-2 -2V-46" fill="none" stroke="#c9ab8c" stroke-width="2.4"/>' +
      '<path d="M-5 -4V-44L-27 -4Z" fill="#fffaf2" stroke="#dfc7ab" stroke-width="1.4" stroke-linejoin="round"/>' +
      '<path d="M2 -4V-40L20 -4Z" fill="#fbe0e2" stroke="#e5b0b8" stroke-width="1.4" stroke-linejoin="round"/></g>';
  }
  function rowboat() {
    return ripple(30) +
      '<path d="M-27 -8L27 -8L21 3H-21Z" fill="#f6ead6" stroke="#c9ab8c" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M-15 -8v-3h30v3" fill="none" stroke="#c9ab8c" stroke-width="1.4"/>' +
      '<path d="M-7 -10L-24 -22M7 -10L24 -22" fill="none" stroke="#cba982" stroke-width="2.6" stroke-linecap="round"/>';
  }

  /* ---- große Objekte -------------------------------------------- */

  function parasol() {
    var scallop = '';
    for (var i = 0; i < 6; i++) scallop += 'q11 11 22 0';
    return '<path d="M3 0C1 -30 -1 -60 -4 -86" fill="none" stroke="#c9ab8c" stroke-width="4" stroke-linecap="round"/>' +
      '<g transform="translate(-4,-86)">' +
      '<path d="M-66 0' + scallop + 'C58 -22 44 -46 0 -46C-44 -46 -58 -22 -66 0Z" fill="#fffaf1" stroke="#e3c9ae" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M0 -46L-44 2M0 -46L-22 5M0 -46L0 7M0 -46L22 5M0 -46L44 2" fill="none" stroke="#f4bfc6" stroke-width="3" opacity=".8" stroke-linecap="round"/>' +
      '<circle cy="-48" r="3.4" fill="#e3c9ae"/></g>';
  }
  function towel() {
    return '<g transform="rotate(-6)">' +
      '<rect x="-46" y="-27" width="92" height="30" rx="7" fill="#fdf6ec" stroke="#e0cdb2" stroke-width="1.5"/>' +
      '<rect x="-46" y="-22" width="92" height="5" fill="#a9d3e6"/>' +
      '<rect x="-46" y="-12" width="92" height="5" fill="#f4bfc6"/>' +
      '<rect x="-46" y="-2" width="92" height="4" fill="#f2d49a"/></g>';
  }
  function board() {
    return '<g transform="rotate(16)">' +
      '<path d="M0 0C-15 -18 -15 -60 0 -88C15 -60 15 -18 0 0Z" fill="#fffaf2" stroke="#e5b6a6" stroke-width="1.8" stroke-linejoin="round"/>' +
      '<path d="M0 -8V-80" fill="none" stroke="#f4bfc6" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M-9 -30q9 6 18 0" fill="none" stroke="#a9d3e6" stroke-width="3" stroke-linecap="round"/></g>';
  }
  function hut() {
    return '<rect x="-46" y="-52" width="92" height="52" rx="5" fill="#f7ead6" stroke="#d9bd98" stroke-width="1.8"/>' +
      '<rect x="-17" y="-38" width="34" height="38" rx="4" fill="#dfe9ee" stroke="#c2ac8f" stroke-width="1.5"/>' +
      '<rect x="26" y="-42" width="15" height="15" rx="3" fill="#dfe9ee" stroke="#c2ac8f" stroke-width="1.4"/>' +
      '<path d="M-63 -50C-49 -78 -23 -96 0 -100C23 -96 49 -78 63 -50Z" fill="#e3c295" stroke="#c9a072" stroke-width="1.8" stroke-linejoin="round"/>' +
      '<path d="M-44 -58C-32 -76 -16 -88 0 -92M-22 -52C-12 -72 -2 -84 8 -90M2 -52C12 -70 24 -80 34 -86" fill="none" stroke="#cda87e" stroke-width="1.6" stroke-linecap="round"/>';
  }
  function palm(h, flip) {
    var frond = function (a) {
      return '<g transform="rotate(' + a + ')">' +
        '<path d="M0 0C28 -20 62 -25 90 -10C60 -3 26 9 0 6Z" fill="#8fbf93" stroke="#6fa079" stroke-width="1.6" stroke-linejoin="round"/>' +
        '<path d="M3 1C29 -6 58 -9 86 -9" fill="none" stroke="#6fa079" stroke-width="1.2" opacity=".65"/></g>';
    };
    var trunk = 'M0 0C-6 ' + n(-h * .35) + ' -12 ' + n(-h * .7) + ' -28 ' + n(-h);
    return '<g transform="scale(' + (flip ? -1 : 1) + ',1)">' +
      '<path d="' + trunk + '" fill="none" stroke="#cba982" stroke-width="13" stroke-linecap="round"/>' +
      '<path d="' + trunk + '" fill="none" stroke="#e0c19b" stroke-width="6.5" stroke-linecap="round"/>' +
      '<g transform="translate(-28,' + n(-h) + ')">' +
      frond(-158) + frond(-118) + frond(-88) + frond(-52) + frond(-14) +
      '<circle cx="5" cy="9" r="5.5" fill="#c99b6f"/><circle cx="-8" cy="11" r="5" fill="#c99b6f"/>' +
      '</g></g>';
  }
  function chair() {
    return '<path d="M-26 0L-6 -34M26 0L6 -34" fill="none" stroke="#c9ab8c" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M-20 -30h40l-6 -27h-28Z" fill="#fdf6ec" stroke="#dfc7ab" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M-16 -38h32M-14 -47h28" fill="none" stroke="#a9d3e6" stroke-width="3.4" stroke-linecap="round"/>';
  }
  function lounger() {
    return '<path d="M-34 0L-26 -18M30 0L24 -16" fill="none" stroke="#c9ab8c" stroke-width="3.4" stroke-linecap="round"/>' +
      '<path d="M-40 -20L26 -20L30 -14L-38 -14Z" fill="#fdf6ec" stroke="#dfc7ab" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M-40 -20L-38 -22L-14 -44L-6 -40L-26 -20Z" fill="#fdf6ec" stroke="#dfc7ab" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M-30 -17h50M-32 -24l14 -13" fill="none" stroke="#f4bfc6" stroke-width="3" stroke-linecap="round"/>';
  }
  function bucket() {
    return '<path d="M-13 -22h26l-4 22h-18Z" fill="#f4bfc6" stroke="#dfa1ab" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M-13 -22C-8 -33 8 -33 13 -22" fill="none" stroke="#dfa1ab" stroke-width="1.8"/>' +
      '<path d="M21 0V-26" fill="none" stroke="#c9ab8c" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M17 -26h9l-2 -10h-5Z" fill="#a9d3e6" stroke="#7fb3cc" stroke-width="1.3"/>';
  }
  function flops() {
    var f = function (fill, st) {
      return '<ellipse rx="9" ry="16" cy="-16" fill="' + fill + '" stroke="' + st + '" stroke-width="1.3"/>' +
             '<path d="M0 -25L-5 -13M0 -25L5 -13" fill="none" stroke="#fffaf2" stroke-width="2" stroke-linecap="round"/>';
    };
    return '<g transform="rotate(-12)">' + f('#f4bfc6', '#dfa1ab') + '</g>' +
           '<g transform="translate(23,3) rotate(10)">' + f('#a9d3e6', '#7fb3cc') + '</g>';
  }
  function basket() {
    return '<path d="M-22 -20h44l-5 20h-34Z" fill="#e8cfa8" stroke="#cba982" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M-22 -20C-16 -39 16 -39 22 -20" fill="none" stroke="#cba982" stroke-width="2.2"/>' +
      '<path d="M-18 -14h36M-16 -8h32" fill="none" stroke="#cba982" stroke-width="1.2" opacity=".65"/>' +
      '<rect x="-14" y="-25" width="28" height="8" rx="4" fill="#f4bfc6"/>';
  }
  function lantern() {
    return '<path d="M0 0V-14" fill="none" stroke="#c9ab8c" stroke-width="2.4"/>' +
      '<path d="M-11 -14h22l-3 -22h-16Z" fill="#fdf1d8" stroke="#dfc7ab" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<circle cy="-25" r="4.5" fill="#f6d79a"/>' +
      '<path d="M-6 -36C-4 -43 4 -43 6 -36" fill="none" stroke="#c9ab8c" stroke-width="1.8"/>';
  }
  function book() {
    return '<g transform="rotate(-8)">' +
      '<path d="M-20 0L0 -6L20 0L20 -11L0 -17L-20 -11Z" fill="#fdf6ec" stroke="#dfc7ab" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M0 -6V-17" fill="none" stroke="#dfc7ab" stroke-width="1.3"/>' +
      '<path d="M-20 -11L0 -17L20 -11" fill="none" stroke="#f4bfc6" stroke-width="2"/></g>';
  }
  function sandbird() {
    return '<ellipse cx="0" cy="-13" rx="12" ry="9" fill="#fdf6ec" stroke="#d7c3a8" stroke-width="1.4"/>' +
      '<circle cx="10" cy="-21" r="6" fill="#fdf6ec" stroke="#d7c3a8" stroke-width="1.4"/>' +
      '<path d="M16 -21l8 2l-8 2z" fill="#f2b98f"/><circle cx="12" cy="-22" r="1.3" fill="#2c5468"/>' +
      '<path d="M-3 -4v4M4 -4v4" fill="none" stroke="#f2b98f" stroke-width="1.6" stroke-linecap="round"/>' +
      '<path d="M-10 -13q9 6 15 0" fill="none" stroke="#d7c3a8" stroke-width="1.3"/>';
  }

  /* =================================================================
     Grundbild
  ================================================================= */

  var DEFS =
    '<defs>' +
    '<linearGradient id="mljSky" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#a9d6ee"/><stop offset=".6" stop-color="#cfe8f5"/><stop offset="1" stop-color="#e9f4f8"/></linearGradient>' +
    '<linearGradient id="mljSea" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#63b0d4"/><stop offset=".45" stop-color="#86c8e0"/><stop offset="1" stop-color="#b9e2ed"/></linearGradient>' +
    '<linearGradient id="mljSand" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#f7ead1"/><stop offset=".5" stop-color="#f1ddbd"/><stop offset="1" stop-color="#e6caa0"/></linearGradient>' +
    '<radialGradient id="mljSun"><stop offset="0" stop-color="#fffaea" stop-opacity=".95"/><stop offset="1" stop-color="#fffaea" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="mljDusk" cx=".5" cy=".5" r=".5">' +
      '<stop offset="0" stop-color="#ffd7ab" stop-opacity=".65"/><stop offset="1" stop-color="#ffb6bb" stop-opacity="0"/></radialGradient>' +
    '</defs>';

  var SHORE = 'M0 460C160 450 250 464 380 458C510 452 620 466 760 454';

  var BASE_SCENE =
    '<rect width="760" height="266" fill="url(#mljSky)"/>' +
    '<circle cx="598" cy="96" r="86" fill="url(#mljSun)"/>' +
    '<circle cx="598" cy="96" r="33" fill="#fffbf0"/>' +
    '<rect y="258" width="760" height="204" fill="url(#mljSea)"/>' +
    '<rect y="250" width="760" height="18" fill="#dcf0f7" opacity=".55"/>' +
    '<path d="M0 259C240 255.5 500 262 760 258.5" fill="none" stroke="#69aecd" stroke-width="1.4" opacity=".5"/>' +
    '<g fill="none" stroke="#ffffff" stroke-linecap="round" opacity=".5">' +
      '<path d="M44 292q22 -7 44 0t44 0" stroke-width="2.4"/>' +
      '<path d="M300 282q24 -7 48 0t48 0" stroke-width="2.4"/>' +
      '<path d="M560 300q22 -7 44 0t44 0" stroke-width="2.4"/>' +
      '<path d="M120 338q28 -8 56 0t56 0" stroke-width="2.8"/>' +
      '<path d="M430 352q28 -8 56 0t56 0" stroke-width="2.8"/>' +
      '<path d="M40 386q32 -9 64 0t64 0" stroke-width="3.2"/>' +
      '<path d="M470 398q32 -9 64 0t64 0" stroke-width="3.2"/>' +
      '<path d="M180 424q34 -9 68 0t68 0" stroke-width="3.4"/>' +
    '</g>' +
    '<path d="' + SHORE + ' L760 760 L0 760 Z" fill="url(#mljSand)"/>' +
    '<path d="' + SHORE + '" fill="none" stroke="#ffffff" stroke-width="6" opacity=".85" stroke-linecap="round"/>' +
    '<path d="M0 472C150 464 260 478 380 471C500 464 630 480 760 468" fill="none" stroke="#ffffff" stroke-width="2.6" opacity=".42"/>' +
    '<g fill="none" stroke="#e0c9a3" stroke-width="2" opacity=".4" stroke-linecap="round">' +
      '<path d="M60 522C140 514 220 526 300 520"/>' +
      '<path d="M430 580C520 572 620 586 710 578"/>' +
      '<path d="M40 654C150 644 250 660 350 652"/>' +
      '<path d="M300 718C420 710 560 726 690 716"/>' +
    '</g>';

  /* =================================================================
     Die 100 Elemente
  ================================================================= */

  /* Feste Elemente: Himmel und Wasser dürfen jedes "at" haben,
     Strandobjekte müssen über der Kante liegen (y <= curtainY(at)). */
  var HAND = [
    { at:  1, y: 176, svg: T(214, 176, 1.00, 0, birds()),      label: 'Möwen', emoji: '🕊️' },
    { at:  2, y: 118, svg: T(150, 118, 1.00, 0, cloud()),      label: 'Erste Wolken', emoji: '☁️' },
    { at:  3, y: 300, svg: T(600, 300, 0.62, 0, sailboat()) },
    { at:  4, y:  74, svg: T(430,  74, 0.72, 0, cloud()) },
    { at:  5, y: 402, svg: T(196, 402, 0.92, 0, lilo()),       label: 'Luftmatratze', emoji: '🛟' },
    { at:  6, y:  96, svg: T(300,  96, 0.88, 0, plane(false)), label: 'Flugzeug', emoji: '✈️' },
    { at:  7, y: 344, svg: T(438, 344, 0.80, 0, buoy()) },
    { at:  8, y: 152, svg: T(640, 152, 0.62, 0, cloud()) },
    { at:  9, y: 418, svg: T(560, 418, 0.95, 0, ring()),       label: 'Schwimmreifen', emoji: '🛟' },
    { at: 10, y: 372, svg: T(300, 372, 0.90, 0, dolphin()),    label: 'Delfin', emoji: '🐬' },
    { at: 11, y: 200, svg: T(560, 200, 0.95, 0, kite()),       label: 'Drachen', emoji: '🪁' },
    { at: 12, y: 316, svg: T(126, 316, 0.78, 0, fish()) },
    { at: 13, y: 214, svg: T(100, 214, 0.72, 0, birds()) },
    { at: 14, y: 432, svg: T( 84, 432, 1.00, 0, lilo('#a9d3e6')) },
    { at: 16, y: 186, svg: T(690, 186, 0.85, 0, balloon()),    label: 'Heißluftballon', emoji: '🎈' },
    { at: 19, y: 330, svg: T(214, 330, 0.85, 0, sailboat()),   label: 'Segelboot', emoji: '⛵' },
    { at: 22, y: 392, svg: T(660, 392, 0.85, 0, rowboat()) },

    /* ── 25: erste kleine Szene ── */
    { at: 25, y: 512, big: true, label: 'Sonnenschirm & Strandtuch', emoji: '🏖️',
      svg: T(392, 514, 0.60, 0, towel()) +
           T(474, 506, 0.62, 0, parasol()) +
           T(614, 508, 0.70, 0, flower()) + T(634, 512, 0.55, 0, flower('#f6c9b4')) + T(596, 513, 0.48, 0, flower()) },

    { at: 29, y: 190, svg: T(120,  60, 0.55, 0, cloud()) },
    { at: 32, y: 356, svg: T(486, 356, 0.80, 0, ring()) },
    { at: 35, y: 548, svg: T(330, 548, 0.68, 0, bucket()),     label: 'Sandeimer', emoji: '🪣' },
    { at: 38, y:  62, svg: T(650,  62, 0.62, 0, plane(true)) },
    { at: 41, y: 570, svg: T(636, 570, 0.72, 0, flops()),      label: 'Flip Flops', emoji: '🩴' },
    { at: 45, y: 424, svg: T(410, 424, 1.05, 0, lilo('#f6d79a')) },

    /* ── 50: die Szene, die den Strand zum Ort macht ── */
    { at: 50, y: 600, big: true, label: 'Palmen, Hütte & Surfboard', emoji: '🌴',
      svg: T(140, 592, 0.76, 0, hut()) +
           T( 56, 606, 0.82, 0, palm(150, false)) +
           T(252, 598, 0.66, 0, palm(140, true)) +
           T(208, 600, 0.70, 0, board()) },

    { at: 54, y:  88, svg: T(190,  88, 0.62, 0, birds()) },
    { at: 57, y: 288, svg: T(408, 288, 0.62, 0, sailboat(true)) },
    { at: 60, y: 628, svg: T(320, 628, 0.88, 0, basket()),     label: 'Picknickkorb', emoji: '🧺' },
    { at: 64, y: 168, svg: T(376, 168, 0.55, 0, cloud()) },
    { at: 68, y: 436, svg: T(676, 436, 0.95, 0, duck()) },
    { at: 72, y: 140, svg: T(120, 140, 0.72, 0, plane(false)) },

    /* ── 75: der gemütliche Teil ── */
    { at: 75, y: 676, big: true, label: 'Liege, Stuhl & viel Grün', emoji: '🪑',
      svg: T( 40, 666, 1.05, 0, bush()) +
           T(722, 660, 1.00, 0, bush()) +
           T(470, 662, 0.86, 0, chair()) +
           T(590, 678, 1.00, 0, lounger()) },

    { at: 79, y: 412, svg: T(300, 412, 1.00, 0, lilo('#a9d3e6')) },
    { at: 83, y: 700, svg: T(196, 700, 1.00, 0, lantern()),    label: 'Laterne', emoji: '🏮' },
    { at: 87, y:  52, svg: T(520,  52, 0.50, 0, cloud()) },
    { at: 90, y: 724, svg: T(406, 724, 1.05, 0, book()),       label: 'Buch am Strand', emoji: '📖' },
    { at: 93, y: 268, svg: T(700, 268, 0.55, 0, sailboat()) },
    { at: 96, y: 740, svg: T(626, 740, 1.00, 0, sandbird()),   label: 'Strandvogel', emoji: '🐦' },

    /* ── 100: die ganze Welt im warmen Licht ── */
    { at: 100, y: 758, big: true, label: 'Goldenes Licht', emoji: '🌅',
      svg: '<g opacity=".5">' +
             '<ellipse cx="598" cy="110" rx="180" ry="150" fill="url(#mljDusk)"/>' +
             '<circle cx="598" cy="96" r="122" fill="url(#mljSun)" opacity=".5"/>' +
             '<path d="M330 214q34 -13 68 0t68 0" fill="none" stroke="#ffd7ab" stroke-width="7" stroke-linecap="round" opacity=".7"/>' +
             '<path d="M462 246q30 -11 60 0t60 0" fill="none" stroke="#ffcdc0" stroke-width="6" stroke-linecap="round" opacity=".6"/>' +
           '</g>' +
           T( 96, 752, 1.55, 0, flower()) + T(146, 756, 1.20, 0, flower('#f6c9b4')) + T( 50, 758, 1.05, 0, flower()) +
           T(300, 748, 1.90, 0, shell()) }
  ];

  /* Sperrzonen für die Streuung (x1,x2,y1,y2) */
  var ZONES = [
    [340, 680, 430, 530],   // Schirm / Tuch / Blumen
    [300, 366, 505, 556],   // Eimer
    [600, 676, 528, 580],   // Flip Flops
    [  0, 300, 470, 616],   // Hütte + Palmen + Board
    [280, 366, 588, 640],   // Korb
    [  0, 110, 610, 676],   // Busch links
    [668, 760, 604, 668],   // Busch rechts
    [428, 520, 616, 672],   // Stuhl
    [538, 648, 630, 688],   // Liege
    [162, 234, 662, 708],   // Laterne
    [366, 448, 700, 730],   // Buch
    [586, 668, 700, 748],   // Strandvogel
    [ 14, 190, 716, 760],   // Blumen vorne
    [258, 348, 712, 754]    // große Muschel
  ];

  function blocked(x, y) {
    for (var i = 0; i < ZONES.length; i++) {
      var z = ZONES[i];
      if (x > z[0] && x < z[1] && y > z[2] && y < z[3]) return true;
    }
    return false;
  }

  function buildItems() {
    var items = [];
    var taken = {};
    var placed = [];

    HAND.forEach(function (h) {
      items.push(h);
      taken[h.at] = true;
    });

    /* nahe Strandobjekte, damit die Streuung sie meidet */
    var rnd = mulberry(20260910);

    function tooClose(x, y, d) {
      for (var i = 0; i < placed.length; i++) {
        if (Math.abs(placed[i][0] - x) < d && Math.abs(placed[i][1] - y) < d * 0.62) return true;
      }
      return false;
    }

    /* Formen: oben am Wasser eher klein und glatt, unten eher grün */
    var NEAR = [shell, pebble, starfish, shell, pebble, foot, wood];
    var MID  = [shell, starfish, grass, pebble, flower, crab, wood, sandcastle];
    var FAR  = [grass, flower, reed, bush, flower, shell, starfish, sandcastle];

    for (var at = 1; at <= FULL; at++) {
      if (taken[at]) continue;

      var cy = curtainY(at);
      var lo = Math.max(464, cy - 62);
      var hi = cy - 12;
      if (hi <= lo) hi = lo + 8;

      var x = 0, y = 0, ok = false;
      for (var t = 0; t < 220 && !ok; t++) {
        y = lo + rnd() * (hi - lo);
        x = 22 + rnd() * 716;
        var d = t < 110 ? 46 : (t < 180 ? 32 : 20);
        if (blocked(x, y)) continue;
        if (tooClose(x, y, d)) continue;
        ok = true;
      }

      var depth = (y - 460) / 300;
      var pool = depth < 0.28 ? NEAR : (depth < 0.62 ? MID : FAR);
      var make = pool[Math.floor(rnd() * pool.length)];
      var s = 0.42 + depth * 0.95 + rnd() * 0.16;

      placed.push([x, y]);
      items.push({ at: at, y: y, svg: T(x, y, s, rnd() * 14 - 7, make()) });
    }

    items.sort(function (a, b) { return a.y - b.y; });   // Maleralgorithmus
    return items;
  }

  var ITEMS = buildItems();

  var MARKUP = (function () {
    var body = '';
    ITEMS.forEach(function (it) {
      body += '<g class="bwi' + (it.big ? ' bwi--big' : '') + '" data-at="' + it.at + '">' + it.svg + '</g>';
    });
    return '<svg viewBox="0 0 760 760" role="img" aria-label="Deine Beach World" preserveAspectRatio="xMidYMid slice">' +
           DEFS + BASE_SCENE + body + '</svg>' +
           '<div class="bw__glow"></div><div class="bw__veil"></div><div class="bw__grain"></div>';
  })();

  /* =================================================================
     API
  ================================================================= */

  /* Jede Instanz bekommt eigene Gradient-IDs – sonst greifen zwei
     gleichzeitig eingebundene Welten auf dieselben <defs> zu und die
     Farbverläufe der zweiten Instanz lösen sich nicht auf. */
  var instanceNo = 0;

  function create(mount) {
    var u = 'w' + (++instanceNo);
    mount.innerHTML = MARKUP.replace(/mlj([A-Za-z]+)/g, 'mlj$1' + u);
    var nodes = mount.querySelectorAll('.bwi');
    var pulseTimer = null;
    var last = -1;

    return {
      el: mount,
      render: function (count, opts) {
        opts = opts || {};
        mount.style.setProperty('--rev', n(revealPct(count)) + '%');
        for (var i = 0; i < nodes.length; i++) {
          if (count >= +nodes[i].getAttribute('data-at')) nodes[i].classList.add('on');
          else nodes[i].classList.remove('on');
        }
        if (opts.pulse && count !== last) {
          mount.classList.remove('is-pulsing');
          void mount.offsetWidth;
          mount.classList.add('is-pulsing');
          clearTimeout(pulseTimer);
          pulseTimer = setTimeout(function () { mount.classList.remove('is-pulsing'); }, 1700);
        }
        last = count;
      }
    };
  }

  /* Was ist bisher aufgetaucht? (nur Gefundenes – nie ein Ausblick) */
  function discovered(count) {
    return ITEMS
      .filter(function (it) { return it.label && count >= it.at; })
      .sort(function (a, b) { return a.at - b.at; })
      .map(function (it) { return { label: it.label, emoji: it.emoji, at: it.at }; });
  }

  var api = { create: create, discovered: discovered, TOTAL: FULL, curtainY: curtainY };

  /* Registry für spätere Welten (Wald, Schnee, …):
     window.WORLDS['forest'] = { id, name, emoji, api } */
  window.WORLDS = window.WORLDS || {};
  window.WORLDS.beach = { id: 'beach', name: 'Beach World', emoji: '🏖️', api: api };

  return api;
})();
