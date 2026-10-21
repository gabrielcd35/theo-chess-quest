# Theo's Chess Quest

A chess tutorial game made for Theo (age 8). Step-by-step missions teach real chess
strategy with interactive puzzles, then Theo can play a computer opponent at 5 levels.

## Play it

Open `index.html` in any browser. No install, no internet needed (except fonts).
To put it online for free: push this repo to GitHub, then Settings → Pages → deploy from `main`.

## What's inside

**12 missions** (every mission and every step can be skipped):

1. The Board Map – square names, find-the-square game
2. Points & Trades – piece values, choosing good captures
3. Check! Escape! – Run, Block, Capture
4. Checkmate! – back-rank mate, queen mate, ladder mate, stalemate
5. Secret Moves – castling, en passant, promotion
6. Opening Rules – center, development, castle early
7. Stop the 4-Move Trap – defending Scholar's Mate
8. The Fork – knight, pawn and queen forks
9. Pins & Skewers
10. Is It Safe? – the blunder-check habit (Checks, Captures, Threats)
11. Finish the Game – endgame mates, avoiding stalemate
12. Puzzle Gauntlet – mixed puzzles with no clues

Progress, badges and ranks (Pawn → King) are saved in the browser.

**Play vs computer**: Pawn Pete (1), Knight Nina (2), Bishop Bo (3), Rook Rita (4), Queen Quinn (5).
The engine is a real minimax search with alpha-beta pruning and quiescence search; levels
change search depth and randomness. Includes hints, undo, board flip, and a coach that warns
when Theo leaves a piece hanging.

## Project layout

```
src/engine.js    chess rules (all legal moves, check/mate/draws, notation)
src/ai.js        computer opponent
src/lessons.js   missions and puzzles (edit here to add your own!)
src/app.js       board, lessons and game UI
src/style.css    styles (light + dark)
src/body.html    page markup
build.py         bundles everything into index.html
tests/           node tests: rules (perft) + validates every puzzle
```

## Develop

```
node tests/run-tests.js   # check rules and puzzles
python3 build.py          # rebuild index.html after editing src/
```

### Adding a puzzle

Add a step to any mission in `src/lessons.js`:

```js
{ type: 'puzzle', fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', moves: [['MATE']],
  text: 'Checkmate in 1!', hint: 'Look at the back rank.', win: 'Back-rank mate!' }
```

`moves` accepts exact moves (`'d1d8'`), `'MATE'` (any checkmate) or `'ANY'`, and `'auto'`
for the computer's reply in multi-move puzzles. Run the tests to make sure it's valid.
