Command Annotation Labels
=====

## Scope
PGN commentary command tags that specify instructions for graphical annotations, namely colored squares and colored arrows.

## Purpose
Annotations that have an accompanying label are not immediately displayed on the board when the move is selected, but instead after the label is clicked.

## Syntax

An additional, space delimited field within the command parentheses will denote the label for the annotation. This field may contain spaces.

Example:
- { [%csl Ge2 "The king's pawn"] }
- { [%cal Ge2e4 "The classical king's pawn opening"] }
- { The [%cal Gd2d4 do's] and [%cal Rh2h4 dont's] of chess openings. }

The label can optionally be enclosed in double quotes (for human readability). Starting and ending double quotes are stripped if and only if both are present.
- [%csl Ge2 The king's pawn] -> The king's pawn
- [%csl Ge2 "The king's pawn"] -> The king's pawn
- [%csl Gg1 The king's "steed"] -> The king's "steed"
- [%cal Ge2e4 "Supposedly" white is already "winning"] -> Supposedly" white is already "winning *(not like this!)*
- [%cal Ge2e4 ""Supposedly" white is already "winning""] -> "Supposedly" white is already "winning" *(like this!)*
