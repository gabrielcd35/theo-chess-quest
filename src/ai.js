/* Theo's Chess Quest — computer opponent.
 * Negamax search with alpha-beta pruning, quiescence search (so it doesn't
 * blunder pieces in the middle of a trade), move ordering and piece-square tables.
 * Each level changes how deep it thinks and how much "random" it adds.
 */
(function (root) {
  'use strict';
  var E = root.ChessEngine || (typeof require !== 'undefined' ? require('./engine.js') : null);

  var VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

  // Piece-square tables from White's point of view, index 0 = a8.
  var PST = {
    p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10,
      5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5,
      5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40,
      -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30,
      -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10,
      -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10,
      -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10,
      -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10,
      -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30,
      -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30,
      -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10,
      20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
    kEnd: [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30,
      -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30,
      -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30,
      -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50]
  };

  function centerDist(sq) {
    var r = sq >> 3, c = sq & 7;
    return Math.max(3 - r, r - 4, 0) + Math.max(3 - c, c - 4, 0);
  }

  // Score from the side-to-move's point of view.
  function evaluate(s) {
    var b = s.board, score = 0, i, p, l, w, idx;
    var nonPawn = { w: 0, b: 0 }, total = { w: 0, b: 0 }, kings = { w: -1, b: -1 };
    for (i = 0; i < 64; i++) {
      p = b[i]; if (!p) continue;
      l = p.toLowerCase(); w = p !== l;
      if (l === 'k') { kings[w ? 'w' : 'b'] = i; continue; }
      if (l !== 'p') nonPawn[w ? 'w' : 'b'] += VAL[l];
      total[w ? 'w' : 'b'] += VAL[l];
    }
    var endgame = nonPawn.w + nonPawn.b <= 1300;
    for (i = 0; i < 64; i++) {
      p = b[i]; if (!p) continue;
      l = p.toLowerCase(); w = p !== l;
      idx = w ? i : (7 - (i >> 3)) * 8 + (i & 7);
      var v = VAL[l] + (l === 'k' ? (endgame ? PST.kEnd[idx] : PST.k[idx]) : PST[l][idx]);
      score += w ? v : -v;
    }
    // Mop-up: when one side has only a king left, push it to the edge and bring our king close.
    ['w', 'b'].forEach(function (side) {
      var opp = side === 'w' ? 'b' : 'w';
      if (total[opp] === 0 && total[side] >= 500 && kings[opp] >= 0 && kings[side] >= 0) {
        var ko = kings[opp], ks = kings[side];
        var dist = Math.abs((ko >> 3) - (ks >> 3)) + Math.abs((ko & 7) - (ks & 7));
        var bonus = centerDist(ko) * 40 + (14 - dist) * 12;
        score += side === 'w' ? bonus : -bonus;
      }
    });
    return s.turn === 'w' ? score : -score;
  }

  function orderMoves(moves) {
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i], o = 0;
      if (m.captured) o += 10000 + 10 * VAL[m.captured.toLowerCase()] - VAL[m.piece.toLowerCase()] / 10;
      if (m.promo) o += 9000;
      if (m.flag === 'castleK' || m.flag === 'castleQ') o += 50;
      m._o = o;
    }
    moves.sort(function (a, b) { return b._o - a._o; });
  }

  var nodes = 0, deadline = Infinity, aborted = false;
  var MATE = 100000;

  function quiesce(s, alpha, beta, qd) {
    nodes++;
    var stand = evaluate(s);
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    if (qd <= 0) return alpha;
    var moves = E.pseudoMoves(s, true), us = s.turn;
    orderMoves(moves);
    for (var i = 0; i < moves.length; i++) {
      var ns = E.makeMove(s, moves[i]);
      if (E.attacked(ns.board, E.kingSq(ns.board, us), ns.turn)) continue;
      var sc = -quiesce(ns, -beta, -alpha, qd - 1);
      if (sc >= beta) return beta;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  }

  function negamax(s, depth, alpha, beta, ply) {
    if ((nodes & 1023) === 0 && Date.now() > deadline) aborted = true;
    if (aborted) return 0;
    if (depth <= 0) return quiesce(s, alpha, beta, 6);
    nodes++;
    var moves = E.pseudoMoves(s, false), us = s.turn, legal = 0;
    orderMoves(moves);
    for (var i = 0; i < moves.length; i++) {
      var ns = E.makeMove(s, moves[i]);
      if (E.attacked(ns.board, E.kingSq(ns.board, us), ns.turn)) continue;
      legal++;
      var sc = -negamax(ns, depth - 1, -beta, -alpha, ply + 1);
      if (sc >= beta) return beta;
      if (sc > alpha) alpha = sc;
    }
    if (!legal) return E.inCheck(s) ? -MATE + ply : 0;
    return alpha;
  }

  // Scores every root move. `margin` lets us skip exact scores for clearly bad moves.
  function rootScores(s, depth, margin) {
    var moves = E.legalMoves(s);
    orderMoves(moves);
    var out = [], best = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      var ns = E.makeMove(s, moves[i]);
      var lower = best === -Infinity ? -1e9 : best - margin;
      var sc;
      if (depth <= 1) sc = E.legalMoves(ns).length ? -quiesce(ns, -1e9, -lower, 6) : (E.inCheck(ns) ? MATE : 0);
      else sc = -negamax(ns, depth - 1, -1e9, -lower, 1);
      if (aborted) break;
      out.push({ move: moves[i], score: sc });
      if (sc > best) best = sc;
    }
    out.sort(function (a, b) { return b.score - a.score; });
    return out;
  }

  var LEVELS = {
    1: { depth: 1, noise: 220, randomChance: 0.35 },
    2: { depth: 1, noise: 70, randomChance: 0.08 },
    3: { depth: 2, noise: 25, randomChance: 0 },
    4: { depth: 3, noise: 10, randomChance: 0 },
    5: { depth: 4, noise: 4, randomChance: 0, deepen: 5, timeMs: 3000 }
  };

  function pickMove(s, level) {
    var cfg = LEVELS[level] || LEVELS[2];
    var legal = E.legalMoves(s);
    if (!legal.length) return null;
    nodes = 0; aborted = false; deadline = Infinity;
    if (Math.random() < cfg.randomChance) {
      // Level 1 sometimes just plays any move — but never misses an instant checkmate.
      var mates = legal.filter(function (m) { return E.isCheckmate(E.makeMove(s, m)); });
      if (mates.length) return mates[0];
      return legal[Math.floor(Math.random() * legal.length)];
    }
    var scores = rootScores(s, cfg.depth, cfg.noise * 3);
    if (cfg.deepen) {
      // Try one ply deeper while time allows.
      deadline = Date.now() + cfg.timeMs; aborted = false;
      var deeper = rootScores(s, cfg.deepen, cfg.noise * 3);
      if (!aborted && deeper.length === scores.length) scores = deeper;
      deadline = Infinity; aborted = false;
    }
    // Always take a forced mate when it sees one.
    if (scores[0].score > MATE - 100) return scores[0].move;
    var best = null, bestVal = -Infinity;
    for (var i = 0; i < scores.length; i++) {
      var v = scores[i].score + (Math.random() * 2 - 1) * cfg.noise;
      if (v > bestVal) { bestVal = v; best = scores[i].move; }
    }
    return best;
  }

  function bestMove(s, depth) {
    nodes = 0; aborted = false; deadline = Infinity;
    var sc = rootScores(s, depth || 2, 0);
    return sc.length ? sc[0].move : null;
  }

  var api = { pickMove: pickMove, bestMove: bestMove, evaluate: evaluate, LEVELS: LEVELS, VAL: VAL,
    stats: function () { return nodes; } };
  root.ChessAI = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
