/* Theo's Chess Quest — the missions.
 *
 * Each mission is a list of steps. Step types:
 *   info    – coach explains something, optional board (fen, highlight, arrows)
 *   find    – tap the named squares on the board (targets)
 *   quiz    – multiple choice (options, answer = index, explain)
 *   puzzle  – make the right move(s) on the board.
 *             moves: list of turns. A turn is either an array of accepted moves
 *             (UCI like "e2e4", or the words "MATE" / "ANY"), or "auto" for the
 *             computer's reply.
 * Text supports **bold**.
 */
(function (root) {
  'use strict';
  var EMPTY = '8/8/8/8/8/8/8/8 w - - 0 1';
  var START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  var LESSONS = [
    {
      id: 'board', title: 'The Board Map', tagline: 'Every square has a name', icon: 'r', badge: 'Map Reader',
      steps: [
        { type: 'info', fen: EMPTY, highlight: ['e4'],
          text: 'Hi Theo! Before a pilot can fly, they learn the map. A chessboard is a map too. The **letters a–h** go left to right (they are called **files**). The **numbers 1–8** go bottom to top (they are called **ranks**).' },
        { type: 'info', fen: EMPTY, highlight: ['e4'], arrows: [['e1', 'e4'], ['a4', 'e4']],
          text: 'To name a square, say the **letter first, then the number**. Go up the **e** file and across rank **4** and you land on **e4**. That is one of the most famous squares in chess!' },
        { type: 'find', fen: EMPTY, targets: ['e4', 'a1', 'h8', 'd5', 'c3', 'f7', 'b6', 'g2'],
          text: 'Your turn. Tap the square I call out. Ready?' },
        { type: 'info', fen: START, highlight: ['h1', 'a8'],
          text: 'At the start, White sits on ranks 1 and 2 and Black sits on ranks 7 and 8. Check the corner: the bottom-right square is always **light**. Remember: **light on the right**.' },
        { type: 'quiz', fen: START, highlight: ['d1', 'd8'],
          text: 'Look at the queens. Where does the **White queen** start?',
          options: ['d1', 'e1', 'd8', 'c1'], answer: 0,
          explain: 'Yes! The queen starts on **d1**. Easy trick: the queen goes on **her own color**. The White queen sits on a light square.' },
        { type: 'find', fen: START, targets: ['e2', 'g1', 'c8', 'e8'],
          text: 'Now find squares with pieces on them. Tap the square of each piece I name.',
          labels: { e2: 'the White pawn in front of the king (e2)', g1: 'the White knight on g1', c8: 'the Black bishop on c8', e8: 'the Black king (e8)' } }
      ]
    },
    {
      id: 'values', title: 'Points & Trades', tagline: 'Which pieces are worth the most', icon: 'q', badge: 'Smart Trader',
      steps: [
        { type: 'info', fen: '8/8/8/8/8/8/8/PNBRQ3 w - - 0 1',
          text: 'Pieces are worth points. **Pawn = 1**, **Knight = 3**, **Bishop = 3**, **Rook = 5**, **Queen = 9**. The king has no points because you can never trade him — he is priceless!' },
        { type: 'info',
          text: 'Points help you decide trades. Giving a knight (3) to win a rook (5) means you are **+2**. Giving a queen (9) for a pawn (1) means you are **−8**. Ouch! Good players always count before they capture.' },
        { type: 'quiz', text: 'Which is worth more: one **rook**, or a **knight plus a pawn**?',
          options: ['The rook', 'The knight + pawn', 'They are exactly equal'], answer: 0,
          explain: 'Right. Rook = 5. Knight + pawn = 3 + 1 = 4. The rook wins by 1 point.' },
        { type: 'quiz', text: 'You can give your **bishop** to win the other player\'s **rook**. Is that a good deal?',
          options: ['Yes, I win 2 points', 'No, I lose 2 points', 'It does not matter'], answer: 0,
          explain: 'Great deal! You give 3 and get 5. Chess players call this **winning the exchange**.' },
        { type: 'puzzle', fen: '6k1/3r1p2/8/4N3/8/8/8/6K1 w - - 0 1', moves: [['e5d7']],
          text: 'Your knight on e5 can capture two things. Pick the **biggest prize**!',
          hint: 'A rook is worth 5. A pawn is worth 1. Also, the f7 pawn is guarded by the king.',
          wrong: { e5f7: 'You won a pawn, but the king can capture your knight. Bad trade! Look for a bigger prize.' },
          win: 'Boom! You grabbed a whole rook for free. +5 points!' },
        { type: 'puzzle', fen: '6k1/5ppp/4p3/3n3b/8/8/8/3Q2K1 w - - 0 1', moves: [['d1h5']],
          text: 'Your queen can take the knight on d5 or the bishop on h5. One of them is a **trap**. Which capture is safe?',
          hint: 'Is anything guarding the knight on d5? Look at the pawn on e6.',
          wrong: { d1d5: 'The pawn on e6 can take your queen! You would trade 9 points for 3. Try the other one.' },
          win: 'Perfect. The bishop had no guards, so it was a **free piece**. And it was attacking your queen too!' }
      ]
    },
    {
      id: 'check', title: 'Check! Escape!', tagline: 'Three ways to save your king', icon: 'k', badge: 'King Saver',
      steps: [
        { type: 'info', fen: '4r2k/8/8/8/8/8/3P1P2/4K3 w - - 0 1', highlight: ['e1'], arrows: [['e8', 'e1']],
          text: '**Check** means your king is being attacked. You are never allowed to ignore it. You must fix it right away.' },
        { type: 'info',
          text: 'There are only **3 ways** to escape check. Remember the word **R-B-C**:\n**Run** — move the king to a safe square.\n**Block** — put a piece in the way.\n**Capture** — take the piece that is giving check.' },
        { type: 'puzzle', fen: '4r2k/8/8/8/8/8/3P1P2/4K3 w - - 0 1', moves: [['ANY']],
          text: 'The rook is checking your king. Nothing can block or capture it. **Run!** Move your king to a safe square.',
          hint: 'Squares on the e-file are still attacked by the rook. Step off the line.',
          win: 'Safe! Your king stepped out of the rook\'s line.' },
        { type: 'puzzle', fen: 'k7/8/8/8/8/4B3/6PP/r6K w - - 0 1', moves: [['ANY']],
          text: 'Check from the rook on a1! Your king is stuck in the corner. **Block** the check with your bishop.',
          hint: 'The rook attacks along rank 1. Your bishop can jump onto that rank.',
          win: 'Blocked! The bishop is a shield for your king.' },
        { type: 'puzzle', fen: 'k7/8/8/8/8/5n2/5PPP/6K1 w - - 0 1', moves: [['g2f3']],
          text: 'A sneaky knight on f3 gives check. This time, escape by **capturing** it!',
          hint: 'Pawns capture diagonally. Which pawn touches f3?',
          wrong: { g1h1: 'Running works too, but capturing wins a whole knight! Try again.', g1f1: 'Running works too, but capturing wins a whole knight! Try again.' },
          win: 'Gotcha! You escaped check and won a knight. Capturing is often the best escape.' },
        { type: 'quiz', text: 'Is it ever allowed to leave your king in check?',
          options: ['Never', 'Only if I capture a queen', 'Yes, on the first move'], answer: 0,
          explain: 'Never! Every move must leave your king safe. If you have no way to escape, the game is over.' }
      ]
    },
    {
      id: 'mate', title: 'Checkmate!', tagline: 'How to win the game', icon: 'q', badge: 'Mate Maker',
      steps: [
        { type: 'info', fen: '3R2k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1', highlight: ['g8'], arrows: [['d8', 'g8']],
          text: '**Checkmate** is check where the king can\'t Run, nobody can Block, and nobody can Capture. That ends the game, and you win! Here the black king is trapped by his own pawns.' },
        { type: 'puzzle', fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', moves: [['MATE']],
          text: 'Black\'s king is hiding behind his pawns. Find **checkmate in 1 move**!',
          hint: 'The pawns can\'t move backwards. Attack the king along the back rank (rank 8).',
          win: 'Checkmate! This is called a **back-rank mate**. Always give your own king an escape square so this doesn\'t happen to you.' },
        { type: 'puzzle', fen: '7k/3Q4/6K1/8/8/8/8/8 w - - 0 1', moves: [['MATE']],
          text: 'Your queen and king work as a team. Checkmate in 1!',
          hint: 'Put the queen right next to the black king, on a square your own king protects.',
          win: 'Teamwork! The king guards the queen, so the black king can\'t take her.' },
        { type: 'puzzle', fen: '4k3/1R6/8/8/8/8/8/6KR w - - 0 1', moves: [['MATE']],
          text: 'Two rooks can climb like a ladder. One rook already blocks rank 7. Use the other one to checkmate!',
          hint: 'The h-rook can zoom all the way up to rank 8.',
          win: 'Ladder mate! One rook blocks, the other one checks. Remember this trick in your games.' },
        { type: 'quiz', fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1',
          text: 'It is **Black\'s turn**. Black is NOT in check, but every king move walks into an attack. What is this called?',
          options: ['Checkmate', 'Stalemate (a draw)', 'Black can just pass'], answer: 1,
          explain: 'Stalemate! When you have no legal moves and you are **not** in check, the game is a **draw**. When you are winning, always leave the enemy king a square until you can checkmate.' }
      ]
    },
    {
      id: 'special', title: 'Secret Moves', tagline: 'Castling, en passant, promotion', icon: 'k', badge: 'Secret Agent',
      steps: [
        { type: 'info', fen: '4k3/8/8/8/8/8/PPPPPPPP/R3K2R w KQ - 0 1', arrows: [['e1', 'g1'], ['h1', 'f1']],
          text: '**Castling** moves two pieces at once! The king jumps **two squares** toward a rook, and the rook hops over to the other side of the king. It hides your king and wakes up your rook.' },
        { type: 'info',
          text: 'Castling rules:\n1. The king and that rook have **never moved**.\n2. No pieces between them.\n3. You are **not in check**, and the king does not cross or land on an attacked square.' },
        { type: 'puzzle', fen: '4k3/8/8/8/8/8/PPPPPPPP/R3K2R w KQ - 0 1', moves: [['e1g1']],
          text: '**Castle kingside** (the short side). Move your king two squares to the right.',
          hint: 'Pick up the king on e1 and drop it on g1. The rook moves by itself.',
          wrong: { e1c1: 'That\'s castling on the queenside, the long side. Try the short side, toward the h-rook.' },
          win: 'Castled! King tucked away on g1, rook ready on f1.' },
        { type: 'puzzle', fen: '4k3/8/8/8/8/8/PPPPPPPP/R3K2R w KQ - 0 1', moves: [['e1c1']],
          text: 'Now **castle queenside** (the long side).',
          hint: 'The king still moves two squares, this time to c1.',
          win: 'Long castle! The rook landed on d1, right in the middle of the action.' },
        { type: 'info', fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', last: 'd7d5', arrows: [['e5', 'd6']],
          text: '**En passant** (French for "in passing"). If an enemy pawn jumps two squares and lands right **beside** your pawn, you can capture it as if it had moved only one square. But only on your very next move!' },
        { type: 'puzzle', fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', last: 'd7d5', moves: [['e5d6']],
          text: 'Black just played d7 to d5, sneaking past your pawn. Capture it **en passant**!',
          hint: 'Your pawn moves diagonally to d6 — the square the black pawn skipped over.',
          win: 'En passant! The black pawn disappears even though you landed behind it.' },
        { type: 'info', fen: '7k/P5pp/8/8/8/8/8/6K1 w - - 0 1', highlight: ['a8'],
          text: '**Promotion**: when a pawn reaches the last rank, it turns into a queen, rook, bishop or knight — your choice! Almost always pick the **queen**.' },
        { type: 'puzzle', fen: '7k/P5pp/8/8/8/8/8/6K1 w - - 0 1', moves: [['MATE']],
          text: 'Promote your pawn, and make it **checkmate** at the same time!',
          hint: 'Push the a-pawn to a8 and choose a piece that attacks along the rank.',
          win: 'A brand-new queen and checkmate on the same move. That\'s a great day at the office!' },
        { type: 'quiz', text: 'Can you castle while your king is **in check**?',
          options: ['No', 'Yes', 'Only queenside'], answer: 0,
          explain: 'No. Castling is never allowed to escape a check.' }
      ]
    },
    {
      id: 'opening', title: 'Opening Rules', tagline: 'The golden rules for move 1', icon: 'n', badge: 'Opening Pro',
      steps: [
        { type: 'info', fen: START, highlight: ['d4', 'e4', 'd5', 'e5'],
          text: 'The first moves of a game are the **opening**. Strong players follow **3 golden rules**:\n1. **Take the center** (the 4 glowing squares).\n2. **Bring out your knights and bishops.**\n3. **Castle early** to keep your king safe.' },
        { type: 'puzzle', fen: START, moves: [['e2e4', 'd2d4']],
          text: 'Golden rule 1. Play a pawn move that grabs the **center**.',
          hint: 'Move one of the two middle pawns forward two squares.',
          win: 'Strong start! Your pawn controls the middle and opens lines for your queen and bishop.' },
        { type: 'puzzle', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', last: 'e7e5', moves: [['g1f3', 'b1c3']],
          text: 'Black copied you. Golden rule 2: bring out a **knight** toward the center.',
          hint: 'Knights love f3 and c3. On the edge they are weak: "a knight on the rim is dim!"',
          wrong: { g1h3: 'A knight on the rim is dim! From h3 it only reaches a few squares. Try f3 or c3.', b1a3: 'A knight on the rim is dim! Try c3 or f3.' },
          win: 'Nice! If you played Nf3, you are also attacking the e5 pawn.' },
        { type: 'puzzle', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', last: 'b8c6', moves: [['f1c4', 'f1b5']],
          text: 'Now bring out your **light-squared bishop** to a strong square.',
          hint: 'c4 aims at f7, Black\'s weakest square. b5 pressures the knight.',
          win: 'Developed! Your bishop is active and you are ready to castle.' },
        { type: 'puzzle', fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', last: 'f8c5', moves: [['e1g1']],
          text: 'Golden rule 3. Everything is ready. Make your king safe!',
          hint: 'The squares between your king and the h-rook are empty...',
          win: 'Castled in 4 moves. That is exactly how grandmasters start their games.' },
        { type: 'quiz', text: 'Why is it risky to bring your **queen** out on move 2?',
          options: ['The enemy can chase her with little pieces and gain time', 'The queen is not allowed to move early', 'Queens are slow'], answer: 0,
          explain: 'Exactly. Every time your queen has to run away, the other player develops a piece for free. Bring out the small pieces first.' }
      ]
    },
    {
      id: 'scholar', title: 'Stop the 4-Move Trap', tagline: 'Never get caught by Scholar\'s Mate', icon: 'b', badge: 'Trap Buster',
      steps: [
        { type: 'info', fen: 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4', highlight: ['f7'], arrows: [['c4', 'f7']],
          text: 'This is **Scholar\'s Mate**, the most famous trap for new players. White\'s queen and bishop both attack **f7**, and the queen captures there with checkmate in just 4 moves. Let\'s learn to beat it. In this mission **you play Black**.' },
        { type: 'puzzle', fen: 'rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2', last: 'd1h5', moves: [['b8c6']],
          text: 'White\'s queen jumped out to h5 and attacks your **e5 pawn**. Defend it with a **knight**.',
          hint: 'Which knight can reach a square that guards e5?',
          wrong: { g7g6: 'Careful! Then the queen takes e5 with check and also hits your rook. Defend e5 first.' },
          win: 'Good! Your knight guards e5 and you developed a piece.' },
        { type: 'puzzle', fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3', last: 'f1c4', moves: [['g7g6', 'd8e7', 'd8f6']],
          text: 'Danger! Queen **and** bishop now both point at f7. Stop the checkmate!',
          hint: 'Block the queen\'s path with your g-pawn, or guard f7 with your queen.',
          wrong: { g8f6: 'That is the mistake everyone makes! Queen takes f7 is checkmate. Try again.' },
          win: 'Trap stopped! Playing g6 also kicks the White queen away.' },
        { type: 'puzzle', fen: 'r1bqkbnr/pppp1p1p/2n3p1/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 1 4', last: 'h5f3', moves: [['g8f6']],
          text: 'The queen came back to f3, aiming at f7 again! Block her with a piece that also develops.',
          hint: 'Your g8 knight can jump right in front of f7\'s attacker.',
          win: 'Blocked again. Now White has wasted three queen moves and you are developing fast.' },
        { type: 'puzzle', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', last: 'g8f6',
          moves: [['MATE']],
          text: 'Now switch sides! You are White, and Black just made the big mistake. Show the trap so you never forget it.',
          hint: 'Your queen and bishop both hit f7. Capture there!',
          win: 'Checkmate on f7! Now you know the trap from both sides. Nobody will catch you with it.' }
      ]
    },
    {
      id: 'fork', title: 'The Fork', tagline: 'Attack two pieces at once', icon: 'n', badge: 'Fork Master',
      steps: [
        { type: 'info', fen: 'r3k3/2N5/8/8/8/8/8/6K1 b - - 0 1', arrows: [['c7', 'e8'], ['c7', 'a8']],
          text: 'A **fork** is when one piece attacks **two** enemy pieces at the same time. The opponent can only save one! Knights are fork champions because they jump in a funny L.' },
        { type: 'puzzle', fen: 'r3k3/8/8/1N6/8/8/8/6K1 w - - 0 1', moves: [['b5c7']],
          text: 'Find the knight move that attacks the **king and the rook** together.',
          hint: 'Find a square that is an L-jump away from both e8 and a8.',
          win: 'Fork! The king must move, and next you eat the rook.' },
        { type: 'puzzle', fen: '6k1/8/2n1n3/8/3P4/8/8/6K1 w - - 0 1', moves: [['d4d5']],
          text: 'Even a little pawn can fork. Attack **both knights** with one pawn move.',
          hint: 'A pawn attacks the two squares diagonally in front of it.',
          win: 'Pawn fork! A 1-point pawn attacking two 3-point knights. Great deal.' },
        { type: 'puzzle', fen: '3q4/6k1/8/8/5N2/8/8/6K1 w - - 0 1', moves: [['f4e6']],
          text: 'Use your knight to attack the **king and the queen** at the same time!',
          hint: 'Look for a square that is an L-jump from g7 AND from d8.',
          win: 'Royal fork! Check on the king, and the queen is next. That\'s 9 points.' },
        { type: 'puzzle', fen: 'r5k1/6pp/8/8/8/8/6PP/3Q2K1 w - - 0 1', moves: [['d1d5']],
          text: 'Queens fork too. Give check and attack the rook on a8 with the same move.',
          hint: 'The rook and king are both on rank 8. Find a square on two diagonals that see them both.',
          wrong: { d1d8: 'Check, but the rook can just capture your queen! Find a safer square.' },
          win: 'Queen fork! The king must move, then your queen takes the rook.' }
      ]
    },
    {
      id: 'pin', title: 'Pins & Skewers', tagline: 'Line attacks with long pieces', icon: 'b', badge: 'Pin Wizard',
      steps: [
        { type: 'info', fen: '4k3/3n4/8/1B6/8/8/8/6K1 b - - 0 1', arrows: [['b5', 'e8']],
          text: 'A **pin** is when a piece can\'t move because a more valuable piece is hiding **behind** it. Here the black knight is pinned: if it moves, the bishop attacks the king. So it is not allowed to move at all!' },
        { type: 'puzzle', fen: '4k3/3n4/8/8/8/8/8/5BK1 w - - 0 1', moves: [['f1b5']],
          text: 'Your turn. **Pin** the knight to the king with your bishop.',
          hint: 'Get your bishop onto the diagonal that goes through d7 and e8.',
          win: 'Pinned! That knight is frozen.' },
        { type: 'puzzle', fen: '4k3/8/2n5/1B6/3P4/8/8/6K1 w - - 0 1', moves: [['d4d5']],
          text: 'The black knight is pinned. **Attack the pinned piece** — it can\'t run away!',
          hint: 'A pawn attack is the cheapest. Which pawn can hit c6?',
          win: 'The knight can\'t escape. Next move you win it. Pins plus pawn attacks are deadly.' },
        { type: 'info', fen: '4q3/8/8/4k3/8/8/8/4R1K1 b - - 0 1', arrows: [['e1', 'e5'], ['e5', 'e8']],
          text: 'A **skewer** is a pin turned around. The **more valuable** piece is in front. When it moves out of the way, you capture the piece behind it.' },
        { type: 'puzzle', fen: '4q3/8/8/4k3/8/8/8/R5K1 w - - 0 1', moves: [['a1e1'], 'auto', ['e1e8']],
          text: 'Skewer time! Give check with your rook so that the queen is behind the king. Then grab her!',
          hint: 'The king and queen are both on the e-file.',
          win: 'Skewered! The king had to move, and the queen fell.' }
      ]
    },
    {
      id: 'safety', title: 'Is It Safe?', tagline: 'The blunder-check habit', icon: 'p', badge: 'Safety Captain',
      steps: [
        { type: 'info',
          text: 'Here is the secret of strong players, Theo. Before **every** move, ask two questions:\n1. **What does my opponent want?** (What did their last move attack?)\n2. **Is the square I\'m moving to safe?**\nThis habit wins more games than any trick.' },
        { type: 'info',
          text: 'Then look for **C-C-T**, in this order: **Checks**, **Captures**, **Threats**. Check them for you AND for your opponent. It is like looking both ways before crossing the street.' },
        { type: 'quiz', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', arrows: [['f3', 'e5'], ['c6', 'e5']],
          text: 'Should your knight on f3 capture the pawn on **e5**?',
          options: ['No — the c6 knight guards e5', 'Yes — free pawn!'], answer: 0,
          explain: 'Right! You would win a pawn (1) but lose your knight (3). Count attackers and defenders before you capture.' },
        { type: 'puzzle', fen: '6k1/4b3/1p6/3p4/4N3/8/8/6K1 w - - 0 1', moves: [['e4c3', 'e4d2', 'e4f2', 'e4g3']],
          text: 'Your knight on e4 is attacked by the pawn on d5! Move it to a **safe** square — one where nothing can capture it.',
          hint: 'The bishop on e7 controls d6, f6 and g5. The b6 pawn controls c5. Go backwards!',
          wrong: { e4d6: 'The bishop on e7 captures you there. Look again.', e4f6: 'The bishop on e7 captures you there.', e4g5: 'The bishop on e7 can reach g5.', e4c5: 'The pawn on b6 can capture on c5!' },
          win: 'Safe and sound. Running away to a safe square is a real skill.' },
        { type: 'quiz', text: 'Your opponent just moved a piece. What should you do **first**?',
          options: ['Figure out what that move attacks', 'Move my favorite piece', 'Attack their queen right away'], answer: 0,
          explain: 'Yes! Always ask "What does my opponent want?" first.' }
      ]
    },
    {
      id: 'endgame', title: 'Finish the Game', tagline: 'Checkmate with fewer pieces', icon: 'r', badge: 'Closer',
      steps: [
        { type: 'info', fen: '4k3/8/4K3/8/8/8/8/R7 w - - 0 1', highlight: ['e8'],
          text: 'When most pieces are gone, it\'s the **endgame**. Now your **king becomes a fighter**! Bring him forward to help. A king plus a rook or queen can always checkmate a lone king — if you push it to the **edge**.' },
        { type: 'puzzle', fen: '4k3/8/4K3/8/8/8/8/R7 w - - 0 1', moves: [['MATE']],
          text: 'Your king blocks the black king from coming forward. Checkmate with the rook!',
          hint: 'The rook can attack the whole back rank from a8.',
          win: 'Rook checkmate! The kings face each other and the rook finishes the job.' },
        { type: 'puzzle', fen: '7k/8/5QK1/8/8/8/8/8 w - - 0 1', moves: [['MATE']],
          text: 'Careful, Theo! Some queen moves here are **stalemate** (a draw). Find the **checkmate**.',
          hint: 'Check the king along rank 8, on a square the black king can\'t capture.',
          wrong: { f6f7: 'Stalemate! Black has no moves but is not in check. It\'s a draw. Try again!' },
          win: 'Checkmate, not stalemate! You stayed calm and finished the game.' },
        { type: 'puzzle', fen: '6k1/5ppp/8/8/8/8/2r1QPPP/6K1 w - - 0 1', moves: [['MATE']],
          text: 'Your queen is attacked by the rook. Don\'t panic! Look for checks first: there is a **checkmate**.',
          hint: 'C-C-T: checks first. What about the back rank?',
          win: 'Checks first! That checkmate was hiding in plain sight.' }
      ]
    },
    {
      id: 'gauntlet', title: 'Puzzle Gauntlet', tagline: 'Mixed challenges, no clues', icon: 'k', badge: 'Puzzle Champion',
      steps: [
        { type: 'info',
          text: 'Final challenge, Theo! These puzzles mix everything you learned. I won\'t tell you which trick it is. Use C-C-T: **Checks, Captures, Threats**.' },
        { type: 'puzzle', fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', moves: [['MATE']],
          text: 'White to move. Checkmate in 1.',
          hint: 'The black king is surrounded by his own pieces. A knight can jump over them.',
          win: 'Smothered mate! The king was trapped by his own army. That\'s one of the coolest checkmates in chess.' },
        { type: 'puzzle', fen: '3q3k/8/8/4N3/8/8/8/6K1 w - - 0 1', moves: [['e5f7']],
          text: 'White to move. Win the black queen!',
          hint: 'Find a knight check that also attacks the queen on d8.',
          win: 'Fork! Check and the queen is gone next move.' },
        { type: 'puzzle', fen: '6q1/8/8/3k4/8/8/8/3B3K w - - 0 1', moves: [['d1b3'], 'auto', ['b3g8']],
          text: 'White to move. Win the queen.',
          hint: 'The king and queen are on the same diagonal.',
          win: 'Bishop skewer! You captured the queen.' },
        { type: 'puzzle', fen: '6k1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1', moves: [['MATE']],
          text: 'White to move. Checkmate in 1.',
          hint: 'Remember the back rank.',
          win: 'Back-rank mate! You are a real chess player now, Theo.' }
      ]
    }
  ];

  root.LESSONS = LESSONS;
  if (typeof module !== 'undefined' && module.exports) module.exports = LESSONS;
})(typeof globalThis !== 'undefined' ? globalThis : this);
