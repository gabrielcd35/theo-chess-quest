/* Run with: node tests/run-tests.js
 * 1. Perft counts prove the move generator follows the rules exactly.
 * 2. Every lesson puzzle is checked: the expected moves must be legal and,
 *    for "MATE" steps, at least one checkmate must exist.
 */
var E = require('../src/engine.js');
var AI = require('../src/ai.js');
var LESSONS = require('../src/lessons.js');
var fails = 0;
function ok(cond, msg) { if (!cond) { fails++; console.log('  FAIL', msg); } }

console.log('Perft');
[[E.START, 3, 8902],
 ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', 3, 97862],
 ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', 4, 43238]].forEach(function (t) {
  var n = E.perft(E.parseFEN(t[0]), t[1]);
  ok(n === t[2], t[0] + ' expected ' + t[2] + ' got ' + n);
});

console.log('Lessons');
LESSONS.forEach(function (lesson) {
  lesson.steps.forEach(function (step, i) {
    var tag = lesson.id + ' #' + (i + 1);
    if (step.fen) E.parseFEN(step.fen);
    if (step.type === 'quiz') ok(step.answer >= 0 && step.answer < step.options.length, tag + ' bad answer index');
    if (step.type === 'find') step.targets.forEach(function (t) { ok(/^[a-h][1-8]$/.test(t), tag + ' bad target ' + t); });
    if (step.type !== 'puzzle') return;
    var s = E.parseFEN(step.fen);
    if (step.last) ok(/^[a-h][1-8][a-h][1-8]$/.test(step.last), tag + ' bad last move');
    Object.keys(step.wrong || {}).forEach(function (w) { ok(!!E.findMove(s, w), tag + ' wrong-move key not legal: ' + w); });
    step.moves.forEach(function (turn, k) {
      if (turn === 'auto') {
        var r = AI.bestMove(s, 2);
        ok(!!r, tag + ' auto reply missing');
        if (r) s = E.makeMove(s, r);
        return;
      }
      var legal = E.legalMoves(s), chosen = null;
      turn.forEach(function (a) {
        if (a === 'ANY') { ok(legal.length > 0, tag + ' no legal moves'); chosen = chosen || legal[0]; return; }
        if (a === 'MATE') {
          var mates = legal.filter(function (m) { return E.isCheckmate(E.makeMove(s, m)); });
          ok(mates.length > 0, tag + ' no mate found');
          console.log('   ', tag, 'mates:', mates.map(function (m) { return E.san(s, m, legal); }).join(' '));
          chosen = chosen || mates[0]; return;
        }
        var m = E.findMove(s, a);
        ok(!!m, tag + ' move ' + a + ' not legal');
        chosen = chosen || m;
      });
      if (chosen) s = E.makeMove(s, chosen);
    });
  });
});

console.log('Computer opponent');
for (var lv = 1; lv <= 5; lv++) {
  var t = Date.now(), m = AI.pickMove(E.parseFEN(E.START), lv);
  ok(!!m, 'level ' + lv + ' returned no move');
  console.log('   level', lv, E.uci(m), (Date.now() - t) + 'ms');
}
var mateIn1 = E.parseFEN('6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1');
for (lv = 2; lv <= 5; lv++) ok(E.isCheckmate(E.makeMove(mateIn1, AI.pickMove(mateIn1, lv))), 'level ' + lv + ' missed mate in 1');

console.log(fails ? fails + ' FAILED' : 'All tests passed');
process.exit(fails ? 1 : 0);
