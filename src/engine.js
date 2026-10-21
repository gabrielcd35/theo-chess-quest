/* Theo's Chess Quest — chess rules engine.
 * Board: array of 64, index 0 = a8, 63 = h1. Uppercase = White, lowercase = Black.
 */
(function (root) {
  'use strict';
  var FILES = 'abcdefgh';
  function sqName(i) { return FILES[i & 7] + (8 - (i >> 3)); }
  function sqIndex(n) { return (8 - parseInt(n[1], 10)) * 8 + FILES.indexOf(n[0]); }
  function colorOf(p) { return p ? (p === p.toUpperCase() ? 'w' : 'b') : null; }
  function other(c) { return c === 'w' ? 'b' : 'w'; }

  function parseFEN(fen) {
    var parts = fen.trim().split(/\s+/);
    var board = new Array(64).fill(null), i = 0;
    for (var k = 0; k < parts[0].length; k++) {
      var ch = parts[0][k];
      if (ch === '/') continue;
      if (ch >= '1' && ch <= '8') i += +ch; else board[i++] = ch;
    }
    return {
      board: board, turn: parts[1] || 'w',
      castling: parts[2] && parts[2] !== '-' ? parts[2] : '',
      ep: parts[3] && parts[3] !== '-' ? sqIndex(parts[3]) : -1,
      half: +(parts[4] || 0), full: +(parts[5] || 1), last: null
    };
  }

  function toFEN(s) {
    var out = '';
    for (var r = 0; r < 8; r++) {
      var empty = 0;
      for (var c = 0; c < 8; c++) {
        var p = s.board[r * 8 + c];
        if (!p) empty++;
        else { if (empty) { out += empty; empty = 0; } out += p; }
      }
      if (empty) out += empty;
      if (r < 7) out += '/';
    }
    return out + ' ' + s.turn + ' ' + (s.castling || '-') + ' ' +
      (s.ep >= 0 ? sqName(s.ep) : '-') + ' ' + s.half + ' ' + s.full;
  }
  function posKey(s) { return toFEN(s).split(' ').slice(0, 4).join(' '); }

  var KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  var KG = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  var DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  var ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  // Is square `sq` attacked by color `by`?
  function attacked(b, sq, by) {
    if (sq < 0) return false;
    var r = sq >> 3, c = sq & 7, i, rr, cc, p, w = by === 'w';
    var pr = w ? r + 1 : r - 1, P = w ? 'P' : 'p';
    if (pr >= 0 && pr < 8) {
      if (c > 0 && b[pr * 8 + c - 1] === P) return true;
      if (c < 7 && b[pr * 8 + c + 1] === P) return true;
    }
    var N = w ? 'N' : 'n', K = w ? 'K' : 'k', B = w ? 'B' : 'b', R = w ? 'R' : 'r', Q = w ? 'Q' : 'q';
    for (i = 0; i < 8; i++) {
      rr = r + KN[i][0]; cc = c + KN[i][1];
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === N) return true;
      rr = r + KG[i][0]; cc = c + KG[i][1];
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === K) return true;
    }
    for (i = 0; i < 4; i++) {
      rr = r + DIAG[i][0]; cc = c + DIAG[i][1];
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        p = b[rr * 8 + cc];
        if (p) { if (p === B || p === Q) return true; break; }
        rr += DIAG[i][0]; cc += DIAG[i][1];
      }
      rr = r + ORTH[i][0]; cc = c + ORTH[i][1];
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        p = b[rr * 8 + cc];
        if (p) { if (p === R || p === Q) return true; break; }
        rr += ORTH[i][0]; cc += ORTH[i][1];
      }
    }
    return false;
  }

  function kingSq(b, color) {
    var K = color === 'w' ? 'K' : 'k';
    for (var i = 0; i < 64; i++) if (b[i] === K) return i;
    return -1;
  }
  function inCheck(s, color) {
    color = color || s.turn;
    return attacked(s.board, kingSq(s.board, color), other(color));
  }

  function pseudoMoves(s, capturesOnly) {
    var b = s.board, us = s.turn, them = other(us), moves = [];
    function add(f, to, flag, promo) {
      moves.push({
        from: f, to: to, piece: b[f],
        captured: flag === 'ep' ? (us === 'w' ? 'p' : 'P') : b[to],
        flag: flag || '', promo: promo || null
      });
    }
    function slide(from, dirs) {
      var r = from >> 3, c = from & 7;
      for (var i = 0; i < dirs.length; i++) {
        var rr = r + dirs[i][0], cc = c + dirs[i][1];
        while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
          var to = rr * 8 + cc, t = b[to];
          if (!t) { if (!capturesOnly) add(from, to); }
          else { if (colorOf(t) === them) add(from, to); break; }
          rr += dirs[i][0]; cc += dirs[i][1];
        }
      }
    }
    function jump(from, offs) {
      var r = from >> 3, c = from & 7;
      for (var i = 0; i < 8; i++) {
        var rr = r + offs[i][0], cc = c + offs[i][1];
        if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
        var to = rr * 8 + cc, t = b[to];
        if (!t) { if (!capturesOnly) add(from, to); }
        else if (colorOf(t) === them) add(from, to);
      }
    }
    for (var from = 0; from < 64; from++) {
      var p = b[from];
      if (!p || colorOf(p) !== us) continue;
      var lower = p.toLowerCase(), r = from >> 3, c = from & 7;
      if (lower === 'p') {
        var dir = us === 'w' ? -1 : 1, start = us === 'w' ? 6 : 1, last = us === 'w' ? 0 : 7;
        var rr = r + dir;
        if (rr < 0 || rr > 7) continue;
        var to = rr * 8 + c;
        if (!b[to]) {
          if (rr === last) {
            add(from, to, '', 'q');
            if (!capturesOnly) { add(from, to, '', 'r'); add(from, to, '', 'b'); add(from, to, '', 'n'); }
          } else if (!capturesOnly) {
            add(from, to);
            if (r === start && !b[(r + 2 * dir) * 8 + c]) add(from, (r + 2 * dir) * 8 + c, 'double');
          }
        }
        for (var dc = -1; dc <= 1; dc += 2) {
          var cc = c + dc;
          if (cc < 0 || cc > 7) continue;
          to = rr * 8 + cc;
          var t = b[to];
          if (t && colorOf(t) === them) {
            if (rr === last) {
              add(from, to, '', 'q');
              if (!capturesOnly) { add(from, to, '', 'r'); add(from, to, '', 'b'); add(from, to, '', 'n'); }
            } else add(from, to);
          } else if (!t && to === s.ep) add(from, to, 'ep');
        }
      } else if (lower === 'n') jump(from, KN);
      else if (lower === 'b') slide(from, DIAG);
      else if (lower === 'r') slide(from, ORTH);
      else if (lower === 'q') { slide(from, DIAG); slide(from, ORTH); }
      else if (lower === 'k') {
        jump(from, KG);
        if (!capturesOnly && s.castling) {
          var cr = s.castling;
          if (us === 'w' && from === 60) {
            if (cr.indexOf('K') >= 0 && !b[61] && !b[62] && b[63] === 'R' &&
              !attacked(b, 60, them) && !attacked(b, 61, them) && !attacked(b, 62, them)) add(60, 62, 'castleK');
            if (cr.indexOf('Q') >= 0 && !b[59] && !b[58] && !b[57] && b[56] === 'R' &&
              !attacked(b, 60, them) && !attacked(b, 59, them) && !attacked(b, 58, them)) add(60, 58, 'castleQ');
          }
          if (us === 'b' && from === 4) {
            if (cr.indexOf('k') >= 0 && !b[5] && !b[6] && b[7] === 'r' &&
              !attacked(b, 4, them) && !attacked(b, 5, them) && !attacked(b, 6, them)) add(4, 6, 'castleK');
            if (cr.indexOf('q') >= 0 && !b[3] && !b[2] && !b[1] && b[0] === 'r' &&
              !attacked(b, 4, them) && !attacked(b, 3, them) && !attacked(b, 2, them)) add(4, 2, 'castleQ');
          }
        }
      }
    }
    return moves;
  }

  function makeMove(s, m) {
    var b = s.board.slice(), us = s.turn, p = b[m.from];
    b[m.to] = m.promo ? (us === 'w' ? m.promo.toUpperCase() : m.promo) : p;
    b[m.from] = null;
    if (m.flag === 'ep') b[(m.from >> 3) * 8 + (m.to & 7)] = null;
    if (m.flag === 'castleK') { b[m.to - 1] = b[m.to + 1]; b[m.to + 1] = null; }
    if (m.flag === 'castleQ') { b[m.to + 1] = b[m.to - 2]; b[m.to - 2] = null; }
    var cr = s.castling;
    if (cr) {
      if (p === 'K') cr = cr.replace('K', '').replace('Q', '');
      if (p === 'k') cr = cr.replace('k', '').replace('q', '');
      var corners = [[63, 'K'], [56, 'Q'], [7, 'k'], [0, 'q']];
      for (var i = 0; i < 4; i++) if (m.from === corners[i][0] || m.to === corners[i][0]) cr = cr.replace(corners[i][1], '');
    }
    return {
      board: b, turn: other(us), castling: cr,
      ep: m.flag === 'double' ? (m.from + m.to) / 2 : -1,
      half: (p.toLowerCase() === 'p' || m.captured) ? 0 : s.half + 1,
      full: s.full + (us === 'b' ? 1 : 0), last: m
    };
  }

  function legalMoves(s, capturesOnly) {
    var us = s.turn, them = other(us);
    return pseudoMoves(s, capturesOnly).filter(function (m) {
      var ns = makeMove(s, m);
      return !attacked(ns.board, kingSq(ns.board, us), them);
    });
  }

  function uci(m) { return sqName(m.from) + sqName(m.to) + (m.promo || ''); }

  function findMove(s, str) {
    var from = sqIndex(str.slice(0, 2)), to = sqIndex(str.slice(2, 4)), promo = str[4] || null;
    var list = legalMoves(s).filter(function (m) { return m.from === from && m.to === to; });
    if (!list.length) return null;
    if (promo) return list.find(function (m) { return m.promo === promo; }) || null;
    return list.find(function (m) { return !m.promo || m.promo === 'q'; });
  }

  function isCheckmate(s) { return inCheck(s) && legalMoves(s).length === 0; }
  function isStalemate(s) { return !inCheck(s) && legalMoves(s).length === 0; }

  function insufficient(s) {
    var minors = 0;
    for (var i = 0; i < 64; i++) {
      var p = s.board[i];
      if (!p) continue;
      var l = p.toLowerCase();
      if (l === 'k') continue;
      if (l === 'n' || l === 'b') { minors++; continue; }
      return false;
    }
    return minors <= 1;
  }

  // history: array of posKey strings for repetition detection
  function status(s, history) {
    var legal = legalMoves(s);
    if (!legal.length) {
      if (inCheck(s)) return { over: true, result: 'checkmate', winner: other(s.turn) };
      return { over: true, result: 'stalemate', winner: null };
    }
    if (insufficient(s)) return { over: true, result: 'material', winner: null };
    if (s.half >= 100) return { over: true, result: 'fifty', winner: null };
    if (history) {
      var key = posKey(s), n = 0;
      for (var i = 0; i < history.length; i++) if (history[i] === key) n++;
      if (n >= 3) return { over: true, result: 'repetition', winner: null };
    }
    return { over: false, check: inCheck(s), legal: legal };
  }

  function san(s, m, legal) {
    legal = legal || legalMoves(s);
    var str;
    if (m.flag === 'castleK') str = 'O-O';
    else if (m.flag === 'castleQ') str = 'O-O-O';
    else {
      var P = m.piece.toUpperCase(), toN = sqName(m.to);
      if (P === 'P') {
        str = m.captured ? FILES[m.from & 7] + 'x' + toN : toN;
        if (m.promo) str += '=' + m.promo.toUpperCase();
      } else {
        var amb = legal.filter(function (x) { return x.piece === m.piece && x.to === m.to && x.from !== m.from; });
        var dis = '';
        if (amb.length) {
          var sameFile = amb.some(function (x) { return (x.from & 7) === (m.from & 7); });
          var sameRank = amb.some(function (x) { return (x.from >> 3) === (m.from >> 3); });
          if (!sameFile) dis = FILES[m.from & 7];
          else if (!sameRank) dis = String(8 - (m.from >> 3));
          else dis = sqName(m.from);
        }
        str = P + dis + (m.captured ? 'x' : '') + toN;
      }
    }
    var ns = makeMove(s, m);
    if (inCheck(ns)) str += legalMoves(ns).length ? '+' : '#';
    return str;
  }

  function perft(s, depth) {
    if (depth === 0) return 1;
    var moves = legalMoves(s), n = 0;
    if (depth === 1) return moves.length;
    for (var i = 0; i < moves.length; i++) n += perft(makeMove(s, moves[i]), depth - 1);
    return n;
  }

  var START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  var api = {
    START: START, FILES: FILES, sqName: sqName, sqIndex: sqIndex, colorOf: colorOf, other: other,
    parseFEN: parseFEN, toFEN: toFEN, posKey: posKey, attacked: attacked, kingSq: kingSq,
    inCheck: inCheck, pseudoMoves: pseudoMoves, legalMoves: legalMoves, makeMove: makeMove,
    uci: uci, findMove: findMove, isCheckmate: isCheckmate, isStalemate: isStalemate,
    status: status, san: san, perft: perft
  };
  root.ChessEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
