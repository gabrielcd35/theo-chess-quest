/* Theo's Chess Quest — the app (board, missions, play vs computer). */
(function () {
  'use strict';
  var E = window.ChessEngine, AI = window.ChessAI, LESSONS = window.LESSONS;
  var GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  var VS = '︎';
  function glyph(l) { return GLYPH[l] + VS; }
  function $(s) { return document.querySelector(s); }
  function h(tag, cls, html) { var el = document.createElement(tag); if (cls) el.className = cls; if (html != null) el.innerHTML = html; return el; }
  function fmt(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  }
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Saved progress ---------- */
  var KEY = 'theo-chess-quest-v1';
  var DEFAULTS = { done: {}, wins: {}, sound: true, tips: true, level: 1, color: 'w' };
  function load() {
    try { var d = JSON.parse(localStorage.getItem(KEY) || '{}'); return Object.assign({}, DEFAULTS, d, { done: d.done || {}, wins: d.wins || {} }); }
    catch (e) { return JSON.parse(JSON.stringify(DEFAULTS)); }
  }
  var store = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* storage blocked */ } }

  /* ---------- Sound ---------- */
  var actx = null;
  function tone(freq, dur, type, when, vol) {
    if (!store.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var t = actx.currentTime + (when || 0), o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* audio unavailable */ }
  }
  var sfx = {
    move: function () { tone(520, 0.07, 'triangle'); },
    capture: function () { tone(300, 0.1, 'square', 0, 0.07); tone(220, 0.12, 'triangle', 0.05); },
    good: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.18, 'triangle', i * 0.08); }); },
    bad: function () { tone(180, 0.18, 'sawtooth', 0, 0.05); },
    check: function () { tone(880, 0.08, 'square', 0, 0.05); tone(660, 0.1, 'square', 0.08, 0.05); }
  };

  /* ---------- Confetti ---------- */
  var confettiCanvas = $('#confetti');
  function confetti(amount) {
    if (reduceMotion || !confettiCanvas) return;
    var c = confettiCanvas, ctx = c.getContext('2d'), W = c.width = innerWidth, H = c.height = innerHeight;
    var colors = ['#FF6A2B', '#FFD45E', '#159F68', '#8C9BDC', '#FF8FB1'], parts = [];
    for (var i = 0; i < (amount || 140); i++) parts.push({ x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.35, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4, s: 5 + Math.random() * 6, r: Math.random() * 6, c: colors[i % colors.length] });
    var start = performance.now();
    c.hidden = false;
    (function frame(now) {
      ctx.clearRect(0, 0, W, H);
      parts.forEach(function (p) { p.x += p.vx; p.y += p.vy; p.vy += 0.45; p.vx *= 0.99; p.r += 0.2;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); });
      if (now - start < 2200) requestAnimationFrame(frame); else { ctx.clearRect(0, 0, W, H); c.hidden = true; }
    })(start);
  }

  /* ---------- Board component ---------- */
  function Board(el, opts) {
    var self = this;
    this.el = el; this.opts = opts || {};
    this.orient = 'w'; this.state = E.parseFEN(E.START); this.movable = null; this.locked = false;
    this.selected = -1; this.legal = []; this.marks = {}; this.mode = 'pieces'; this.drag = null;
    el.classList.add('board');
    this.grid = h('div', 'grid'); el.appendChild(this.grid);
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('viewBox', '0 0 8 8'); this.svg.setAttribute('class', 'arrows'); this.svg.setAttribute('aria-hidden', 'true');
    el.appendChild(this.svg);
    this.promo = h('div', 'promo'); this.promo.hidden = true; el.appendChild(this.promo);
    this.cells = [];
    for (var pos = 0; pos < 64; pos++) { var c = h('div', 'sq'); this.grid.appendChild(c); this.cells.push(c); }
    this.grid.addEventListener('pointerdown', function (e) { self.down(e); });
    this.grid.addEventListener('pointermove', function (e) { self.move(e); });
    this.grid.addEventListener('pointerup', function (e) { self.up(e); });
    this.grid.addEventListener('pointercancel', function () { self.cancelDrag(); });
    this.render();
  }
  Board.prototype.idxAt = function (pos) { return this.orient === 'w' ? pos : 63 - pos; };
  Board.prototype.setState = function (s, marks) {
    this.state = s; this.selected = -1; this.promo.hidden = true;
    if (marks) this.marks = marks;
    this.legal = this.movable && s.turn === this.movable ? E.legalMoves(s) : [];
    this.render();
  };
  Board.prototype.setMarks = function (m) { this.marks = m || {}; this.render(); };
  Board.prototype.canMove = function () { return this.mode === 'pieces' && !this.locked && this.movable && this.state.turn === this.movable; };
  Board.prototype.targets = function (from) { return this.legal.filter(function (m) { return m.from === from; }); };
  Board.prototype.render = function () {
    var s = this.state, marks = this.marks, sel = this.selected, self = this;
    var targets = sel >= 0 ? this.targets(sel) : [];
    var checkSq = -1;
    if (s && E.kingSq(s.board, s.turn) >= 0 && E.inCheck(s)) checkSq = E.kingSq(s.board, s.turn);
    var last = marks.last ? [marks.last.from, marks.last.to] : [];
    var hl = (marks.highlight || []).map(E.sqIndex), good = (marks.good || []).map(E.sqIndex);
    this.el.classList.toggle('squares-mode', this.mode === 'squares');
    this.el.classList.toggle('hide-pieces', !!marks.hidePieces);
    for (var pos = 0; pos < 64; pos++) {
      var i = this.idxAt(pos), r = i >> 3, c = i & 7, cell = this.cells[pos];
      var cls = 'sq ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
      if (last.indexOf(i) >= 0) cls += ' last';
      if (i === sel) cls += ' selected';
      if (i === checkSq) cls += ' check';
      if (hl.indexOf(i) >= 0) cls += ' hl';
      if (good.indexOf(i) >= 0) cls += ' found';
      var t = targets.find(function (m) { return m.to === i; });
      if (t) cls += (s.board[i] || t.flag === 'ep') ? ' target cap' : ' target';
      cell.className = cls; cell.dataset.i = i;
      var p = s ? s.board[i] : null, html = '';
      if (p && !marks.hidePieces) html += '<span class="pc ' + (p === p.toUpperCase() ? 'w' : 'b') + '">' + glyph(p.toLowerCase()) + '</span>';
      var row = pos >> 3, col = pos & 7;
      if (col === 0) html += '<span class="co rank">' + (8 - r) + '</span>';
      if (row === 7) html += '<span class="co file">' + E.FILES[c] + '</span>';
      cell.innerHTML = html;
      cell.setAttribute('aria-label', E.sqName(i) + (p ? ' ' + (p === p.toUpperCase() ? 'white ' : 'black ') + ({ k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' })[p.toLowerCase()] : ''));
    }
    // arrows
    var uid = this.uid || (this.uid = Math.random().toString(36).slice(2));
    var mk = function (id, cls) { return '<marker id="' + id + '" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="2.6" markerHeight="2.6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="' + cls + '"/></marker>'; };
    var svg = '<defs>' + mk('ah-' + uid, 'ah') + mk('ah-hint-' + uid, 'ah hint') + '</defs>';
    (marks.arrows || []).forEach(function (a) {
      var f = self.center(E.sqIndex(a[0])), tt = self.center(E.sqIndex(a[1]));
      var dx = tt[0] - f[0], dy = tt[1] - f[1], len = Math.sqrt(dx * dx + dy * dy) || 1;
      var ex = tt[0] - dx / len * 0.32, ey = tt[1] - dy / len * 0.32;
      svg += '<line x1="' + f[0] + '" y1="' + f[1] + '" x2="' + ex + '" y2="' + ey + '" class="arrow ' + (a[2] || '') + '" marker-end="url(#ah-' + (a[2] === 'hint' ? 'hint-' : '') + uid + ')"/>';
    });
    this.svg.innerHTML = svg;
  };
  Board.prototype.center = function (i) {
    var r = i >> 3, c = i & 7;
    if (this.orient === 'b') { r = 7 - r; c = 7 - c; }
    return [c + 0.5, r + 0.5];
  };
  Board.prototype.cellFromEvent = function (e) {
    var el = document.elementFromPoint(e.clientX, e.clientY);
    el = el && el.closest ? el.closest('.sq') : null;
    return el && this.grid.contains(el) ? +el.dataset.i : -1;
  };
  Board.prototype.down = function (e) {
    var cell = e.target.closest('.sq'); if (!cell) return;
    var i = +cell.dataset.i;
    if (this.mode === 'squares') { if (this.opts.onSquare) this.opts.onSquare(i); return; }
    if (!this.canMove()) return;
    if (this.selected >= 0 && this.targets(this.selected).some(function (m) { return m.to === i; })) { this.tryMove(this.selected, i); return; }
    var p = this.state.board[i];
    if (p && E.colorOf(p) === this.movable) {
      var keep = this.selected === i;
      this.selected = i; this.render();
      var pc = this.cells.find(function (c) { return +c.dataset.i === i; }).querySelector('.pc');
      this.drag = { from: i, x: e.clientX, y: e.clientY, moved: false, pc: pc, wasSelected: keep };
      try { this.grid.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      e.preventDefault();
    } else { this.selected = -1; this.render(); }
  };
  Board.prototype.move = function (e) {
    var d = this.drag; if (!d || !d.pc) return;
    var dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > 6) { d.moved = true; d.pc.classList.add('dragging'); }
    if (d.moved) d.pc.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(1.15)';
  };
  Board.prototype.up = function (e) {
    var d = this.drag; if (!d) return;
    this.drag = null;
    if (d.moved) {
      var to = this.cellFromEvent(e);
      if (d.pc) { d.pc.style.transform = ''; d.pc.classList.remove('dragging'); }
      if (to >= 0 && to !== d.from && this.targets(d.from).some(function (m) { return m.to === to; })) this.tryMove(d.from, to);
      else this.render();
    } else if (d.wasSelected) { this.selected = -1; this.render(); }
  };
  Board.prototype.cancelDrag = function () { if (this.drag && this.drag.pc) this.drag.pc.style.transform = ''; this.drag = null; this.render(); };
  Board.prototype.tryMove = function (from, to) {
    var self = this, cands = this.legal.filter(function (m) { return m.from === from && m.to === to; });
    if (!cands.length) return;
    if (cands[0].promo) {
      var color = this.movable;
      this.promo.innerHTML = '<p>Choose your new piece</p><div class="promo-row">' + ['q', 'r', 'b', 'n'].map(function (l) {
        return '<button type="button" data-p="' + l + '" aria-label="' + ({ q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' })[l] + '"><span class="pc ' + color + '">' + glyph(l) + '</span></button>';
      }).join('') + '</div>';
      this.promo.hidden = false;
      this.promo.querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () {
          self.promo.hidden = true;
          var m = cands.find(function (x) { return x.promo === b.dataset.p; });
          self.selected = -1; if (self.opts.onMove) self.opts.onMove(m);
        });
      });
      return;
    }
    this.selected = -1;
    if (this.opts.onMove) this.opts.onMove(cands[0]);
  };
  Board.prototype.flash = function (i, kind) {
    var cell = this.cells.find(function (c) { return +c.dataset.i === i; });
    if (!cell) return;
    cell.classList.remove('flash-good', 'flash-bad'); void cell.offsetWidth;
    cell.classList.add(kind === 'good' ? 'flash-good' : 'flash-bad');
    setTimeout(function () { cell.classList.remove('flash-good', 'flash-bad'); }, 700);
  };

  /* ---------- Views ---------- */
  function showView(name) {
    ['home', 'lesson', 'play'].forEach(function (v) { $('#view-' + v).hidden = v !== name; });
    window.scrollTo(0, 0);
    if (name === 'home') renderHome();
  }

  var RANKS = [
    { at: 0, name: 'Pawn', p: 'p' }, { at: 2, name: 'Knight', p: 'n' }, { at: 4, name: 'Bishop', p: 'b' },
    { at: 6, name: 'Rook', p: 'r' }, { at: 9, name: 'Queen', p: 'q' }, { at: LESSONS.length, name: 'King', p: 'k' }
  ];
  function doneCount() { return LESSONS.filter(function (l) { return store.done[l.id]; }).length; }
  function currentRank() { var n = doneCount(), r = RANKS[0]; RANKS.forEach(function (x) { if (n >= x.at) r = x; }); return r; }
  function renderRankChip() {
    var r = currentRank();
    $('#rank-chip').innerHTML = '<span class="pc w">' + glyph(r.p) + '</span><span>Rank: <strong>' + r.name + '</strong></span>';
  }

  /* ---------- Home ---------- */
  var heroBoard = new Board($('#hero-board'));
  heroBoard.setState(E.parseFEN('r3k3/2N5/8/8/8/8/8/6K1 b - - 0 1'), { arrows: [['c7', 'e8'], ['c7', 'a8']] });

  function nextLessonIndex() { for (var i = 0; i < LESSONS.length; i++) if (!store.done[LESSONS[i].id]) return i; return -1; }

  function renderHome() {
    renderRankChip();
    var n = doneCount(), total = LESSONS.length, next = nextLessonIndex();
    $('#home-progress-text').textContent = n === 0 ? 'Start with Mission 1, or jump to any mission you like.'
      : n === total ? 'You finished every mission! Now go beat the computer.' : 'You finished ' + n + ' of ' + total + ' missions. Keep going!';
    $('#home-progress-bar').style.width = (n / total * 100) + '%';
    $('#home-progress-count').textContent = n + ' / ' + total;
    var cont = $('#continue-btn');
    if (next >= 0) { cont.hidden = false; cont.textContent = (n ? 'Continue: ' : 'Start: ') + LESSONS[next].title; cont.onclick = function () { openLesson(next, 0); }; }
    else cont.hidden = true;
    var list = $('#missions'); list.innerHTML = '';
    LESSONS.forEach(function (l, i) {
      var done = !!store.done[l.id], isNext = i === next;
      var li = h('li');
      var b = h('button', 'mission' + (done ? ' done' : '') + (isNext ? ' next' : ''));
      b.type = 'button';
      b.innerHTML = '<span class="m-icon"><span class="pc ' + (done ? 'w' : 'b') + '">' + glyph(l.icon) + '</span></span>' +
        '<span class="m-body"><span class="m-num">Mission ' + (i + 1) + '</span><span class="m-title">' + l.title + '</span><span class="m-tag">' + l.tagline + '</span></span>' +
        '<span class="m-state">' + (done ? '<span class="chip good">Badge: ' + l.badge + '</span>' : isNext ? '<span class="chip accent">Up next</span>' : '<span class="chip">' + l.steps.length + ' steps</span>') + '</span>';
      b.addEventListener('click', function () { openLesson(i, 0); });
      li.appendChild(b); list.appendChild(li);
    });
    var ladder = $('#rank-ladder'); ladder.innerHTML = '';
    var cr = currentRank();
    RANKS.forEach(function (r) {
      var reached = n >= r.at;
      ladder.appendChild(h('li', reached ? (r === cr ? 'current' : 'reached') : '',
        '<span class="pc ' + (reached ? 'w' : 'b') + '">' + glyph(r.p) + '</span><span class="r-name">' + r.name + '</span><span class="r-at">' + (r.at === 0 ? 'Start' : r.at + ' missions') + '</span>'));
    });
  }

  $('#reset-btn').addEventListener('click', function () { $('#reset-confirm').hidden = false; $('#reset-btn').hidden = true; });
  $('#reset-no').addEventListener('click', function () { $('#reset-confirm').hidden = true; $('#reset-btn').hidden = false; });
  $('#reset-yes').addEventListener('click', function () {
    store.done = {}; store.wins = {}; save();
    $('#reset-confirm').hidden = true; $('#reset-btn').hidden = false; renderHome();
  });

  /* ---------- Lessons ---------- */
  var lessonBoard = new Board($('#lesson-board'), { onMove: onLessonMove, onSquare: onLessonSquare });
  var LR = { li: 0, si: 0, ps: null, ready: false };

  function coach(html) { $('#coach-text').innerHTML = html; }
  function feedback(kind, html) {
    var f = $('#feedback');
    f.className = 'feedback ' + (kind || '');
    f.innerHTML = html || '';
    f.hidden = !html;
  }
  function setReady(on) { LR.ready = on; $('#step-next').disabled = !on; }

  function openLesson(li, si) { LR.li = li; LR.si = si || 0; showView('lesson'); renderStep(); }

  function renderStep() {
    var lesson = LESSONS[LR.li], step = lesson.steps[LR.si];
    $('#lesson-num').textContent = 'Mission ' + (LR.li + 1) + ' · Step ' + (LR.si + 1) + ' of ' + lesson.steps.length;
    $('#lesson-title').textContent = lesson.title;
    var dots = $('#step-dots'); dots.innerHTML = '';
    lesson.steps.forEach(function (st, k) {
      var d = h('button', 'dot' + (k === LR.si ? ' on' : '') + (k < LR.si ? ' past' : ''));
      d.type = 'button'; d.setAttribute('aria-label', 'Go to step ' + (k + 1));
      d.addEventListener('click', function () { LR.si = k; renderStep(); });
      dots.appendChild(d);
    });
    $('#lesson-complete').hidden = true; $('#lesson-body').hidden = false;
    $('#step-extra').innerHTML = ''; feedback();
    $('#step-prev').disabled = LR.si === 0;
    $('#step-next').textContent = LR.si === lesson.steps.length - 1 ? 'Finish mission' : 'Next';
    $('#step-hint').hidden = !(step.type === 'puzzle' || step.type === 'find');
    $('#show-me').hidden = true;
    lessonBoard.mode = 'pieces'; lessonBoard.movable = null; lessonBoard.locked = false;
    $('#lesson-board').classList.remove('dim');
    var fen = step.fen || E.START, s = E.parseFEN(fen);
    lessonBoard.orient = step.type === 'puzzle' ? s.turn : 'w';
    var marks = { highlight: step.highlight, arrows: step.arrows };
    if (step.last) marks.last = { from: E.sqIndex(step.last.slice(0, 2)), to: E.sqIndex(step.last.slice(2, 4)) };
    if (!step.fen) $('#lesson-board').classList.add('dim');

    coach(fmt(step.text));
    LR.ps = null;
    if (step.type === 'info') { lessonBoard.setState(s, marks); setReady(true); }
    else if (step.type === 'find') {
      lessonBoard.mode = 'squares'; lessonBoard.setState(s, marks);
      LR.ps = { k: 0, found: [] }; setReady(false); renderFindPrompt();
    } else if (step.type === 'quiz') {
      lessonBoard.setState(s, marks); setReady(false);
      var wrap = h('div', 'quiz');
      step.options.forEach(function (opt, k) {
        var b = h('button', 'btn option', fmt(opt)); b.type = 'button';
        b.addEventListener('click', function () {
          if (LR.ready) return;
          if (k === step.answer) {
            b.classList.add('correct'); sfx.good(); feedback('good', fmt(step.explain)); setReady(true);
            wrap.querySelectorAll('button').forEach(function (x) { x.disabled = x !== b; });
          } else { b.classList.add('wrong'); b.disabled = true; sfx.bad(); feedback('bad', 'Not quite. Try another answer!'); }
        });
        wrap.appendChild(b);
      });
      $('#step-extra').appendChild(wrap);
    } else if (step.type === 'puzzle') {
      LR.ps = { state: s, k: 0, tries: 0, solved: false };
      lessonBoard.movable = s.turn; lessonBoard.setState(s, marks);
      var side = s.turn === 'w' ? 'White' : 'Black';
      $('#step-extra').appendChild(h('p', 'turn-tag', '<span class="pc ' + s.turn + '">' + glyph('k') + '</span> You play ' + side));
      setReady(false);
    }
  }

  function renderFindPrompt() {
    var step = LESSONS[LR.li].steps[LR.si], ps = LR.ps, t = step.targets[ps.k];
    var label = step.labels && step.labels[t] ? step.labels[t] : '<span class="sq-name">' + t + '</span>';
    $('#step-extra').innerHTML = '<div class="find-prompt"><span class="find-label">Tap</span><span class="find-target">' + label + '</span><span class="find-count">' + (ps.k + 1) + ' of ' + step.targets.length + '</span></div>';
  }

  function onLessonSquare(i) {
    var step = LESSONS[LR.li].steps[LR.si], ps = LR.ps;
    if (!ps || LR.ready) return;
    var t = step.targets[ps.k], name = E.sqName(i);
    if (name === t) {
      lessonBoard.flash(i, 'good'); sfx.move(); ps.found.push(t); ps.k++;
      lessonBoard.setMarks({ good: ps.found });
      if (ps.k >= step.targets.length) {
        $('#step-extra').innerHTML = ''; sfx.good(); confetti(60);
        feedback('good', 'All ' + step.targets.length + ' found! You can read the chess map, Theo.'); setReady(true);
      } else { feedback('good', 'Yes! That\'s <strong>' + t + '</strong>.'); renderFindPrompt(); }
    } else {
      lessonBoard.flash(i, 'bad'); sfx.bad();
      feedback('bad', 'That one is <strong>' + name + '</strong>. Find <strong>' + t + '</strong>: letter first, then number.');
    }
  }

  function accepts(turn, m, ns) {
    var u = E.uci(m), u4 = u.slice(0, 4);
    return turn.some(function (a) {
      return a === u || a === u4 || a === 'ANY' || (a === 'MATE' && E.isCheckmate(ns));
    });
  }

  function onLessonMove(m) {
    var step = LESSONS[LR.li].steps[LR.si], ps = LR.ps;
    if (!ps || ps.solved) return;
    var before = ps.state, ns = E.makeMove(before, m), turn = step.moves[ps.k];
    var san = E.san(before, m);
    if (accepts(turn, m, ns)) {
      ps.state = ns; ps.k++; ps.tries = 0;
      m.captured ? sfx.capture() : sfx.move();
      lessonBoard.setState(ns, { last: m });
      if (E.inCheck(ns)) sfx.check();
      advancePuzzle(san);
    } else {
      ps.tries++;
      sfx.bad();
      lessonBoard.locked = true;
      lessonBoard.setState(ns, { last: m });
      var u4 = E.uci(m).slice(0, 4), msg;
      if (step.wrong && step.wrong[u4]) msg = step.wrong[u4];
      else if (E.isStalemate(ns)) msg = 'Oh no, that\'s **stalemate**! Black has no moves but isn\'t in check, so it\'s a draw. Try again.';
      else if (turn.indexOf('MATE') >= 0 && E.inCheck(ns)) msg = 'That\'s check, but the king can still escape. Find a **checkmate**!';
      else msg = ps.tries >= 2 ? 'Not quite. Clue: ' + step.hint : 'Not quite! ' + san + ' doesn\'t do the job. Try again.';
      feedback('bad', fmt(msg));
      setTimeout(function () {
        lessonBoard.locked = false;
        var marks = { highlight: [] };
        var firstUci = turn.find(function (a) { return /^[a-h][1-8]/.test(a); });
        if (ps.tries >= 2 && firstUci) marks.highlight = [firstUci.slice(0, 2)];
        if (step.last && ps.k === 0) marks.last = { from: E.sqIndex(step.last.slice(0, 2)), to: E.sqIndex(step.last.slice(2, 4)) };
        lessonBoard.setState(before, marks);
        if (ps.tries >= 3 && firstUci) $('#show-me').hidden = false;
      }, 1100);
    }
  }

  function advancePuzzle(lastSan) {
    var step = LESSONS[LR.li].steps[LR.si], ps = LR.ps;
    if (ps.k >= step.moves.length) {
      ps.solved = true; lessonBoard.locked = true;
      sfx.good(); confetti(90);
      feedback('good', fmt(step.win)); $('#show-me').hidden = true;
      setReady(true);
      return;
    }
    if (step.moves[ps.k] === 'auto') {
      lessonBoard.locked = true;
      feedback('', 'Good move! Your opponent is thinking…');
      setTimeout(function () {
        if (LR.ps !== ps) return;
        var r = AI.bestMove(ps.state, 2);
        var rs = E.san(ps.state, r);
        ps.state = E.makeMove(ps.state, r); ps.k++;
        r.captured ? sfx.capture() : sfx.move();
        lessonBoard.locked = false;
        lessonBoard.setState(ps.state, { last: r });
        feedback('', 'Your opponent played <strong>' + rs + '</strong>. Now finish the job!');
        if (ps.k >= step.moves.length || step.moves[ps.k] === 'auto') advancePuzzle(rs);
      }, 800);
    } else feedback('good', 'Nice, <strong>' + lastSan + '</strong>! Keep going.');
  }

  $('#step-hint').addEventListener('click', function () {
    var step = LESSONS[LR.li].steps[LR.si];
    if (step.type === 'find') feedback('', 'Clue: the <strong>letters</strong> are along the bottom and the <strong>numbers</strong> up the side. Find the letter column, then go up to the number.');
    else if (step.hint) feedback('', fmt('Clue: ' + step.hint));
  });
  $('#show-me').addEventListener('click', function () {
    var step = LESSONS[LR.li].steps[LR.si], ps = LR.ps;
    var u = step.moves[ps.k].find(function (a) { return /^[a-h][1-8]/.test(a); });
    if (!u) return;
    lessonBoard.setMarks({ arrows: [[u.slice(0, 2), u.slice(2, 4), 'hint']], highlight: [u.slice(0, 2)] });
    feedback('', 'Follow the green arrow, then make the move yourself.');
  });
  $('#step-prev').addEventListener('click', function () { if (LR.si > 0) { LR.si--; renderStep(); } });
  $('#step-next').addEventListener('click', function () { if (LR.ready) nextStep(); });
  $('#skip-step').addEventListener('click', nextStep);
  $('#skip-lesson').addEventListener('click', function () { completeLesson(true); });
  $('#lesson-back').addEventListener('click', function () { showView('home'); });

  function nextStep() {
    var lesson = LESSONS[LR.li];
    if (LR.si < lesson.steps.length - 1) { LR.si++; renderStep(); }
    else completeLesson(false);
  }

  function completeLesson(skipped) {
    var lesson = LESSONS[LR.li], wasRank = currentRank();
    store.done[lesson.id] = true; save(); renderRankChip();
    var newRank = currentRank();
    $('#lesson-body').hidden = true;
    var box = $('#lesson-complete'); box.hidden = false;
    var nextI = nextLessonIndex();
    box.innerHTML = '<div class="badge-big"><span class="pc w">' + glyph(lesson.icon) + '</span></div>' +
      '<p class="eyebrow">' + (skipped ? 'Mission skipped' : 'Mission complete') + '</p>' +
      '<h3>' + (skipped ? 'Marked as done' : 'You earned the ' + lesson.badge + ' badge!') + '</h3>' +
      (newRank !== wasRank ? '<p class="rank-up">Rank up! You are now a <strong>' + newRank.name + '</strong>.</p>' : '') +
      '<div class="complete-actions">' +
      (nextI >= 0 ? '<button type="button" class="btn primary" id="go-next">Next: ' + LESSONS[nextI].title + '</button>' : '<button type="button" class="btn primary" id="go-play">Play the computer</button>') +
      '<button type="button" class="btn" id="go-map">Back to missions</button>' +
      (skipped ? '' : '<button type="button" class="btn ghost" id="go-again">Replay this mission</button>') + '</div>';
    if (!skipped) { sfx.good(); confetti(180); }
    var gn = $('#go-next'); if (gn) gn.onclick = function () { openLesson(nextI, 0); };
    var gp = $('#go-play'); if (gp) gp.onclick = function () { openPlay(); };
    $('#go-map').onclick = function () { showView('home'); };
    var ga = $('#go-again'); if (ga) ga.onclick = function () { openLesson(LR.li, 0); };
    coach(skipped ? 'No problem, Theo. You can come back to this mission any time.' : 'Awesome work, Theo! ' + (newRank !== wasRank ? 'You just moved up a rank.' : 'On to the next one?'));
  }

  /* ---------- Play vs computer ---------- */
  var OPPONENTS = [
    { lv: 1, name: 'Pawn Pete', p: 'p', desc: 'Just learning. Makes lots of silly moves.' },
    { lv: 2, name: 'Knight Nina', p: 'n', desc: 'Grabs any free piece. Guard your army!' },
    { lv: 3, name: 'Bishop Bo', p: 'b', desc: 'Thinks 2 moves ahead and spots simple tricks.' },
    { lv: 4, name: 'Rook Rita', p: 'r', desc: 'Thinks 3 moves ahead. A real fighter.' },
    { lv: 5, name: 'Queen Quinn', p: 'q', desc: 'Boss level. Thinks 4 to 5 moves ahead.' }
  ];
  var playBoard = new Board($('#play-board'), { onMove: onHumanMove });
  var G = { id: 0, state: null, stack: [], sans: [], keys: [], human: 'w', over: false, thinking: false, opp: OPPONENTS[0] };

  var worker = null;
  (function makeWorker() {
    try {
      var src = ['src-engine', 'src-ai'].map(function (id) { var el = document.getElementById(id); return el ? el.textContent : ''; }).join('\n');
      if (!src.trim()) return;
      src += '\nself.onmessage=function(e){var d=e.data;var s=ChessEngine.parseFEN(d.fen);var m=ChessAI.pickMove(s,d.level);self.postMessage({id:d.id,uci:m?ChessEngine.uci(m):null});};';
      worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      worker.onerror = function () { worker = null; };
    } catch (e) { worker = null; }
  })();
  function askComputer(state, level, cb) {
    var fen = E.toFEN(state);
    if (worker) {
      var id = Math.random();
      var handler = function (e) { if (e.data.id !== id) return; worker.removeEventListener('message', handler); cb(e.data.uci); };
      worker.addEventListener('message', handler);
      try { worker.postMessage({ fen: fen, level: level, id: id }); return; } catch (e) { worker.removeEventListener('message', handler); }
    }
    setTimeout(function () { var m = AI.pickMove(state, level); cb(m ? E.uci(m) : null); }, 30);
  }

  function renderSetup() {
    var grid = $('#opp-grid'); grid.innerHTML = '';
    OPPONENTS.forEach(function (o) {
      var wins = store.wins[o.lv] || 0;
      var b = h('button', 'opp' + (store.level === o.lv ? ' on' : ''));
      b.type = 'button'; b.setAttribute('aria-pressed', store.level === o.lv);
      b.innerHTML = '<span class="opp-icon"><span class="pc b">' + glyph(o.p) + '</span></span><span class="opp-lv">Level ' + o.lv + '</span><span class="opp-name">' + o.name + '</span><span class="opp-desc">' + o.desc + '</span>' +
        '<span class="opp-wins">' + (wins ? 'You beat ' + (o.lv === 1 ? 'him' : 'them') + ' ' + wins + (wins === 1 ? ' time' : ' times') : 'Not beaten yet') + '</span>';
      b.addEventListener('click', function () { store.level = o.lv; save(); renderSetup(); });
      grid.appendChild(b);
    });
    document.querySelectorAll('[data-color]').forEach(function (b) {
      b.classList.toggle('on', b.dataset.color === store.color);
      b.setAttribute('aria-pressed', b.dataset.color === store.color);
    });
    $('#tips-toggle').checked = !!store.tips;
  }
  document.querySelectorAll('[data-color]').forEach(function (b) {
    b.addEventListener('click', function () { store.color = b.dataset.color; save(); renderSetup(); });
  });
  $('#tips-toggle').addEventListener('change', function (e) { store.tips = e.target.checked; save(); });

  function openPlay() { showView('play'); $('#play-setup').hidden = false; $('#play-game').hidden = true; renderSetup(); }

  $('#start-game').addEventListener('click', startGame);
  $('#new-game').addEventListener('click', function () { G.id++; openPlay(); });
  $('#rematch').addEventListener('click', startGame);

  function startGame() {
    G.id++;
    G.opp = OPPONENTS.find(function (o) { return o.lv === store.level; }) || OPPONENTS[0];
    G.human = store.color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : store.color;
    G.state = E.parseFEN(E.START); G.stack = []; G.sans = []; G.keys = [E.posKey(G.state)]; G.over = false; G.thinking = false;
    $('#play-setup').hidden = true; $('#play-game').hidden = false; $('#game-over').hidden = true;
    playBoard.orient = G.human; playBoard.movable = G.human; playBoard.locked = false;
    playBoard.setState(G.state, {});
    playCoach(G.human === 'w' ? 'You have White, so you move first. Remember the golden rules: center, knights and bishops out, castle!' :
      'You have Black. ' + G.opp.name + ' moves first. Watch what their move attacks!');
    renderGameInfo();
    if (G.human !== G.state.turn) computerTurn();
  }

  function playCoach(html) { $('#play-coach').innerHTML = fmt(html); }

  function material(board) {
    var start = { p: 8, n: 2, b: 2, r: 2, q: 1 }, have = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
    board.forEach(function (p) { if (!p) return; var l = p.toLowerCase(); if (l === 'k') return; have[p === l ? 'b' : 'w'][l]++; });
    var lost = { w: [], b: [] }, pts = { p: 1, n: 3, b: 3, r: 5, q: 9 }, score = { w: 0, b: 0 };
    ['w', 'b'].forEach(function (c) {
      ['q', 'r', 'b', 'n', 'p'].forEach(function (l) { for (var i = have[c][l]; i < start[l]; i++) lost[c].push(l); score[c] += have[c][l] * pts[l]; });
    });
    return { lost: lost, score: score };
  }

  function renderGameInfo() {
    var mat = material(G.state.board), you = G.human, them = E.other(you);
    var diff = mat.score[you] - mat.score[them];
    function strip(name, iconP, color, capturedList, d, isComputer) {
      return '<span class="who"><span class="who-icon ' + (isComputer ? 'cpu' : 'you') + '"><span class="pc ' + color + '">' + glyph(iconP) + '</span></span><span class="who-name">' + name +
        (isComputer && G.thinking ? '<span class="thinking"> is thinking<span>.</span><span>.</span><span>.</span></span>' : '') + '</span></span>' +
        '<span class="caps">' + capturedList.map(function (l) { return '<span class="pc ' + E.other(color) + '">' + glyph(l) + '</span>'; }).join('') +
        (d > 0 ? '<span class="adv">+' + d + '</span>' : '') + '</span>';
    }
    $('#strip-top').innerHTML = strip(G.opp.name, G.opp.p, them, mat.lost[you], -diff, true);
    $('#strip-bottom').innerHTML = strip('Theo', 'k', you, mat.lost[them], diff, false);
    var list = $('#move-list'), out = '';
    for (var i = 0; i < G.sans.length; i += 2) out += '<li><span class="mn">' + (i / 2 + 1) + '.</span><span>' + G.sans[i] + '</span><span>' + (G.sans[i + 1] || '') + '</span></li>';
    list.innerHTML = out || '<li class="empty">No moves yet</li>';
    list.scrollTop = list.scrollHeight;
    var st = $('#game-status');
    if (G.over) return;
    if (G.state.turn === G.human) st.innerHTML = E.inCheck(G.state) ? '<span class="pill bad">Check!</span> Save your king' : '<span class="pill good">Your move</span>';
    else st.innerHTML = '<span class="pill">' + G.opp.name + '\'s move</span>';
    $('#undo-btn').disabled = !G.stack.length || G.thinking;
    $('#hint-btn').disabled = G.thinking || G.state.turn !== G.human;
  }

  function applyMove(m) {
    var san = E.san(G.state, m);
    G.stack.push({ state: G.state });
    G.state = E.makeMove(G.state, m); G.sans.push(san); G.keys.push(E.posKey(G.state));
    playBoard.setState(G.state, { last: m });
    m.captured ? sfx.capture() : sfx.move();
    if (E.inCheck(G.state)) sfx.check();
    var st = E.status(G.state, G.keys);
    if (st.over) endGame(st);
    renderGameInfo();
    return san;
  }

  var NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
  function hangingWarning(state, m) {
    // After the human's move: can the moved piece be captured for free or by something cheaper?
    var to = m.to, piece = state.board[to]; if (!piece) return null;
    var l = piece.toLowerCase(); if (l === 'k' || l === 'p') return null;
    var caps = E.legalMoves(state).filter(function (x) { return x.to === to; });
    if (!caps.length) return null;
    var V = AI.VAL, cheapest = Math.min.apply(null, caps.map(function (x) { return V[x.piece.toLowerCase()] || 0; }));
    var defended = E.attacked(state.board, to, E.colorOf(piece));
    if (!defended || cheapest < V[l]) return 'Careful, Theo! Your ' + NAMES[l] + ' on ' + E.sqName(to) + ' can be captured' + (defended ? ' by a cheaper piece.' : ' for free.') + ' Tap **Undo** to take it back, or keep going if it\'s a plan.';
    return null;
  }

  function onHumanMove(m) {
    if (G.over || G.thinking || G.state.turn !== G.human) return;
    var san = applyMove(m);
    if (G.over) return;
    var tip = store.tips ? hangingWarning(G.state, m) : null;
    if (tip) playCoach(tip);
    else if (m.flag === 'castleK' || m.flag === 'castleQ') playCoach('Castled! Your king is safe. Golden rule 3, done.');
    else if (m.captured) playCoach('You captured a ' + NAMES[m.captured.toLowerCase()] + ' with **' + san + '**. Nice!');
    else if (E.inCheck(G.state)) playCoach('**' + san + '** is check! Now watch how they escape.');
    else playCoach('You played **' + san + '**.');
    computerTurn();
  }

  function computerTurn() {
    var id = G.id, started = Date.now();
    G.thinking = true; playBoard.locked = true; renderGameInfo();
    askComputer(G.state, G.opp.lv, function (u) {
      var wait = Math.max(0, 550 - (Date.now() - started));
      setTimeout(function () {
        if (id !== G.id) return;
        G.thinking = false; playBoard.locked = false;
        var m = u ? E.findMove(G.state, u) : null;
        if (!m) { renderGameInfo(); return; }
        var san = applyMove(m);
        if (!G.over) {
          var msg = G.opp.name + ' played **' + san + '**.';
          if (m.captured) msg += ' They took your ' + NAMES[m.captured.toLowerCase()] + '. Can you take something back?';
          else if (E.inCheck(G.state)) msg += ' Check! Remember R-B-C: Run, Block or Capture.';
          else msg += ' What does that move attack?';
          playCoach(msg);
        }
        renderGameInfo();
      }, wait);
    });
  }

  function endGame(st) {
    G.over = true; playBoard.locked = true;
    var box = $('#game-over'), title, text, win = st.winner === G.human;
    if (st.result === 'checkmate') {
      title = win ? 'Checkmate! You win, Theo!' : 'Checkmate. ' + G.opp.name + ' wins this one.';
      text = win ? 'You beat ' + G.opp.name + '! Ready to try the next level?' : 'Every chess player loses games. Look at what happened and try again!';
    } else {
      title = 'It\'s a draw';
      text = { stalemate: 'Stalemate: no legal moves, but no check.', material: 'Not enough pieces left to checkmate.', fifty: '50 moves without a capture or pawn move.', repetition: 'The same position happened 3 times.' }[st.result];
    }
    if (win) { store.wins[G.opp.lv] = (store.wins[G.opp.lv] || 0) + 1; save(); confetti(220); sfx.good(); }
    $('#game-over-title').textContent = title; $('#game-over-text').textContent = text;
    box.hidden = false;
    $('#game-status').innerHTML = '<span class="pill ' + (win ? 'good' : st.winner ? 'bad' : '') + '">Game over</span>';
    playCoach(win ? 'That was awesome. Checkmate is the best feeling in chess!' : st.winner ? 'Tip: tap **Undo** a few times to see where things went wrong.' : 'A draw is better than a loss. When you\'re ahead, watch out for stalemate!');
  }

  $('#undo-btn').addEventListener('click', function () {
    if (!G.stack.length) return;
    G.id++; G.thinking = false; G.over = false; $('#game-over').hidden = true;
    do { G.state = G.stack.pop().state; G.sans.pop(); G.keys.pop(); } while (G.stack.length && G.state.turn !== G.human);
    playBoard.locked = false;
    playBoard.setState(G.state, {});
    playCoach('Took it back. Think: **Checks, Captures, Threats**. Then choose.');
    renderGameInfo();
    if (G.state.turn !== G.human) computerTurn();
  });
  $('#hint-btn').addEventListener('click', function () {
    if (G.over || G.thinking || G.state.turn !== G.human) return;
    var m = AI.bestMove(G.state, 2); if (!m) return;
    var san = E.san(G.state, m), ns = E.makeMove(G.state, m), why;
    if (E.isCheckmate(ns)) why = 'It\'s checkmate!';
    else if (m.captured) why = 'It captures a ' + NAMES[m.captured.toLowerCase()] + '.';
    else if (m.flag === 'castleK' || m.flag === 'castleQ') why = 'It keeps your king safe.';
    else if (E.inCheck(ns)) why = 'It gives check.';
    else why = 'It improves your position. Can you see why?';
    playBoard.setMarks({ arrows: [[E.sqName(m.from), E.sqName(m.to), 'hint']], last: G.state.last });
    playCoach('Try **' + san + '** (follow the green arrow). ' + why);
  });
  $('#flip-btn').addEventListener('click', function () { playBoard.orient = playBoard.orient === 'w' ? 'b' : 'w'; playBoard.render(); });

  /* ---------- Header ---------- */
  function renderSound() { var b = $('#sound-btn'); b.textContent = store.sound ? 'Sound on' : 'Sound off'; b.setAttribute('aria-pressed', store.sound); }
  $('#sound-btn').addEventListener('click', function () { store.sound = !store.sound; save(); renderSound(); if (store.sound) sfx.move(); });
  $('#go-home').addEventListener('click', function () { G.id++; showView('home'); });
  $('#play-btn').addEventListener('click', openPlay);
  $('#play-card').addEventListener('click', openPlay);

  renderSound();
  showView('home');
})();
