# Chess.ts

## Description

Chess.ts is a Javascript chess library, written in TypeScript. It includes a FEN and PGN parser, legal (and illegal) move generator, board visualization in ASCII, and much more.

## Installation

`npm install -S typescript-chess`

## Usage

You may need to create a declaration file for the package. Just create `.d.ts` file (such as `chess.d.ts`) to your types folder with the content:
```javascript
declare module 'typescript-chess' {
    import Chess from 'typescript-chess/dist/chess'
    export default Chess
}
```

### Creating games

You need a `Chess` instance to start creating games. You can create the instance with:
```javascript
import Chess from 'typescript-chess'
const chess = new Chess()
```

The library supports two ways to create games.
1. Creating a new (blank) game with `chess.newGame()`. The method accepts three optional parameters:
  * Starting state as a FEN string (defaults to classical starting state).
  * Group to add this game to (defaults to currently active group).
  * Whether to remove the currently active game and replace it with the new one (default false).
2. Creating a game from a loaded PGN with `createGameFromPgn(parsedPgn)`.
  * This requires that the raw PGN text has first been parsed with `parseFullPgn(pgn)`.
  * A second, optional argument can be used to define the group the game is added to (defaults to currently active group).

### Parsing games from PGN

Before games can be loaded they must be parsed from PGN. This process separates the header and move information and is much faster than directly parsing the whole PGN, including moves. The separation is sort of pointless when opening single games from PGN, but vitally important when laoding records with hundreds of games or more.

The parsed games are returned as an array of objects containing the headers and moves `{ headers: [key, value][], moves: string }`. The fully parsed header information can then be used to decide which games to load completely. The method stores parsed games in the `parsedPgnGames` property as arrays of above mentioned objects under the given group key:
```javascript
chess.parsedPgnGames: { headers: [key, value][], moves: string }[]
```

Example:
```javascript
const parsed = chess.parseFullPgn(pgn<string>)
console.log(parsed[0].headers)
/////////////////////////
[
    ['Event', 'F/S Return Match'],
    ['Site', 'Belgrade, Serbia JUG'],
    ['Date', '1992.11.04'],
    ['Round', '29'],
    ['White', 'Fischer, Robert J.'],
    ['Black', 'Spassky, Boris V.'],
    ['Result', '1/2-1/2']
]
/////////////////////////
console.log(parsed[0].moves)
/////////////////////////
"1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 {This opening is called the Ruy Lopez.}\
4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7\
11. c4 c6 12. cxb5 axb5 13. Nc3 Bb7 14. Bg5 b4 15. Nb1 h6 16. Bh4 c5 17. dxe5\
Nxe4 18. Bxe7 Qxe7 19. exd6 Qf6 20. Nbd2 Nxd6 21. Nc4 Nxc4 22. Bxc4 Nb6\
23. Ne5 Rae8 24. Bxf7+ Rxf7 25. Nxf7 Rxe1+ 26. Qxe1 Kxf7 27. Qe3 Qg5 28. Qxg5\
hxg5 29. b3 Ke6 30. a3 Kd6 31. axb4 cxb4 32. Ra5 Nd5 33. f3 Bc8 34. Kf2 Bf5\
35. Ra7 g6 36. Ra6+ Kc5 37. Ke1 Nf4 38. g3 Nxh3 39. Kd2 Kb5 40. Rd6 Kc5 41. Ra6\
Nf2 42. g4 Bd3 43. Re6 1/2-1/2"
/////////////////////////
const { game, group, index } = chess.createGameFromPgn(parsed)
```

The process can be streamlined by using the `loadPgn(pgn<string>)` method. This method will parse and load games from the given PGN string. This method is only meant for loading a handful of games at a time and there is a default setting for maximum number of games loaded in one go. The method will return loaded game headers are an array, unless a special callback function for headers is provided. The method has two optional arguments:
* Name of the group where the loaded games should added.
* Options object with the following properties:
  * `maxItems` - maximum items to load from the file (default 10).
  * `activateFirst` - should the first loaded item be automatically activated (default true).
  * `returnHeaders` - callback function that takes loaded game headers as an argument (default null).
  * `resetGroup` - should target group be cleared (**existing games removed**) before adding the loaded games (default true).

Larger amounts of games can be parsed and loaded using the `loadPgnInBatches(pgn<string>)` function. This method will load all the games in a given PGN in batches, taking a short break after finishing a batch and reporting loading process. The method accepts three optional arguments:
* Name of the group where the games should be added.
* Options object with the following properties:
  * `batchSize` - how many games to load in a batch (progress is reported between batches, default 10).
  * `maxAmount` - maximum amount of games to load in total (default 100).
  * `reportProgress` - a callback function that takes current loading progress [loaded, total] as an argument (default null).
  * `startFrom` - start loading from the game at the given index (default 0).
**NOTE**: This method may use large amounts of processing power and memory if very large game libraries are loaded. If loading only the header information and letting the user choose which games to fully load is acceptable, it is recommended to only parse the games with `parseFullPgn()` and load them fully after the user selects them.

### Switching and removing games

Loaded and created games are stored in groups under the property `Chess.games`. Games are, by default, added to the currently active group. The active group and game within the group can be switched by changing their properties, or using the `selectGame(index<number>)` method:
```javascript
chess.activeGroup = <string>
chess.activeGame = <number>
const game = chess.selectGame(index<number>, group<string>) // Group defaults to currently active group
```
The currently active game can be accessed from `Chess.activeGame` or with `Chess.getActiveGame()`. Alternatively, `Chess.active` is an object also holding the game, as well as the group name and the index of the game within that group.
```javascript
const { game, group, index } = chess.active
```
The active game can be unset with `Chess.unsetActive()`, after which `Chess.activeGame` will return null. A game's state can be reset to default starting state with `Chess.resetGame()`, which accepts the group and the index of the game as optional arguments (defaults to currently active values).

A single game can be removed with `Chess.removeGame()`, which accepts a group name as first optional argument and game index within the group as second optional argument (both default to current active values). `Chess.clearAllGames()` will clear all the games in a group that it accepts as an optional argument (defaults to currently active group).

## Attributions

This app is a derivative of [aaronfi's chess-es6](https://github.com/aaronfi/chess-es6.js), licensed under GPL3.
