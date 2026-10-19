# Changelog

## 0.2.0

### Breaking
- Published as native ES modules with an `exports` map. CommonJS and the UMD bundle (`umd/chess.js`) are no longer built.
- Requires Node.js 20+ when used outside a bundler.
- The `scoped-event-log` dependency was replaced by a built-in `Log` with a compatible subset of its API. It prints warnings and errors by default (previously also info messages) and keeps only the latest 500 events.
- SAN input must match a legal move exactly. Check, mate and annotation symbols, the promotion `=` and `0-0` style castling are still accepted. Previously truncated input such as `N` or `e` was matched to some move.
- `Move.uci` includes the promotion piece (`e7e8q`).
- Repetition counts (`Board.posCount`) are keyed by `Board.positionKey`: piece placement, player in turn, castling rights and capturable en passant square.
- Exported PGN always ends with a game termination marker (`*` for an ongoing game).
- `Game.makeMove` refuses moves after a player's time has run out, until the game has ended (automatically with `autoTimeout`, or with `Game.end()`).
- FEN validation is stricter: pawns on the first or last rank, non-numeric counters (`1x`, `1.5`, `-0`), a `0` in the piece placement and an en passant square without a pawn that just advanced two squares are rejected. Positions where the player not in turn is in check cannot be loaded. Castling rights are accepted in any order.
- `Game.loadFen()` and `Chess.loadFen()` return whether the FEN was loaded. An invalid FEN leaves the game unchanged. A loaded FEN starts a new game: the result, start and end times and timers are reset.
- Repetition counts (`Board.posCount`) follow the selected turn when browsing history.

### Fixed
Move generation and board state
- Castling out of check or through an attacked square was generated as a legal move.
- Undoing an en passant capture put the captured pawn back on the wrong square.
- Every move had a queen as its `promotionPiece`; it is now `null` for moves that are not promotions.
- Castling rights from a FEN were kept even when the king or rook was not on its original square.
- Creating a variation for a move made before a castling move removed the castled rook from the variation's board.
- New variations and continuations inherited repetition counts from later in the line they branched from.
- Generating moves for a single square replaced the cached move list of the whole position, breaking checkmate and stalemate detection. Numeric square indices did not work for `onlyForSquare`.
- Every valid move was treated as an error when the library was compiled with standard class field semantics (any ES2022+ target, as used by modern bundlers).

Game end
- Threefold and fivefold repetition were never detected: the position counter never went past one.
- Repetition ignored the player in turn and castling rights, and undoing moves did not revert repetition counts.
- Insufficient material checked bishop square colors wrong, and did not end the game.
- Untimed games could not be started, so checkmate never set the game result.
- A player's flag never fell: time could run negative and moves were still accepted. Running out of time now flags the player, and with `autoTimeout` ends the game (a draw if the opponent cannot checkmate).
- `Board.validate()` reported the player in turn being in check as invalid, instead of the opponent.
- `Board.undoMoves()` corrupted the board when called while browsing an earlier turn.
- `Game.createVariationFromSan()` threw an error when no turn was selected.
- `Game.loadFen()` on an existing game numbered the new main line as a variation, so the game could no longer end. An invalid FEN replaced the game with an empty board, also when given to the `Game` constructor.

PGN
- Loading a PGN with more than one game threw an error or skipped games.
- A comment or NAG before the first move made the whole game fail to parse; it is now skipped. An unterminated comment froze the parser in an endless loop.
- Evaluation glyphs such as `+/-` in the move text ended the game. They are read as NAGs.
- A comment after a variation was attached to the last move of the variation instead of the move before it.
- A result at the end of the move text was ignored when there was no `Result` header.
- Move numbers that did not match the parser's own count aborted parsing.
- Games set up from a FEN were exported with move numbers starting from 1, so they could not be loaded back.
- NAGs were exported as comments and glyph NAGs (`!?`) were lost.
- Exported move text could start with a space.
- Promotions to different pieces were treated as the same move when creating variations.
- Making a move that branches a new variation returned the parent's turn instead of the new one.
- Move times were ignored when given, and time deltas were measured from the wrong move.

Time controls
- PGN `TimeControl` values were rescaled to minutes or hours; they are now read as seconds (`Game.setTimeControlFromPgn`). Descriptors passed to `new ChessTimer()` keep the minutes/hours interpretation of small values.
- Increment, delay and hourglass settings stopped applying one and a half turns before the end of a stage.
- A universal delay was ignored when an increment was also set.
- The time of the next stage (e.g. 30 minutes after move 40) was added to both players only after the first move of the next stage. It is now added to each player as they complete the last move of a stage, so a player is not flagged during their first move of the new stage.
- Hourglass clocks never flagged a player whose time ran out during their move.
- `ChessTimer.toString()` left out a sudden death limit when it was the only field.
- Timers no longer require a `window` object, so they work in Node.js and Web Workers.

Other
- Wrong square reported in the `Board.distanceBetween` error message.

### Added
- `isMoveError()` type guard, `Log` and all public types are exported from the package root.
- `Log.addListener()` for routing log events.
- `Board.positionKey`, `Board.syncPosCount()`, `Move.normalizeSan()`, `ChessTimer.flagged`, `ChessTimer.timeoutFunction`, `ChessTimer.reset()`, `ChessTimer.getStageAddition()`, `Game.handleTimeout()` and `Game.createTimers()`.
- Perft tests for the move generator, and regression tests for all of the fixes above.

### Changed
- When loading a PGN, the recorded result (the `Result` header, or the result at the end of the move text) takes precedence over a game end detected from the moves.
- The TypeScript sources are published alongside the source maps.
- Toolchain: Vitest, TypeScript 5.9, ESLint flat config. Removes Jest, Babel and webpack, and all dependency vulnerabilities reported by `npm audit`.
