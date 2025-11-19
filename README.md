# Just Divide — Kid Mode

A fun visual math puzzle game for kids! The goal is to solve rows and columns by dividing and merging numbers using interactive drag & drop mechanics. Features lively animations and a clean UI designed for accessibility.

## Screenshot

![Just Divide Game Screenshot](assets/demo.png)

## Gameplay

- Place number tiles from the queue onto empty cells of a 4x4 grid.
- Tiles can merge with neighbors: identical numbers vanish, and numbers divisible by each other combine into the result of their division.
- Removed tiles add points to your score and increase your level.
- Use the "Keep" slot to save a tile for strategic use temporarily.
- Remove an unwanted tile with the "Trash" slot.
- Watch for hints highlighting valid moves.
- Progress levels to earn more points and trash uses.
- The game ends when no moves remain and the grid is full.

## Controls

- **Drag & Drop**: Drag tiles from the upcoming queue or the Keep slot onto empty grid cells.
- **Keep**: Drop a tile into the "Keep" slot to save and swap later.
- **Trash**: Drop a tile into "Trash" to discard it.
- **Keyboard shortcuts**:
  - `Z`: Undo last move.
  - `R`: Restart the game.
  - `G`: Toggle hints.
  - `1/2/3`: Change difficulty (Easy/Medium/Hard).

## Features

- Responsive UI for desktop and mobile.
- Animated backgrounds and elements (CSS "float" keyframes).
- Scoreboard with level and best score.
- Cat and badge artwork for positive feedback.
- Local storage for best score persistence.

## Technical Highlights

- **HTML/CSS/JS**: Single-page application using plain JavaScript for all logic and rendering.
- **Assets**: Tile, badge, cat, and background images provided in the `/assets` folder.

## File Overview

| File         | Purpose                                                   |
|--------------|-----------------------------------------------------------|
| index.html   | Main HTML structure                                       |
| main.js      | Game logic, rendering, and event handling                 |
| assets/      | Tile images, backgrounds, cat, badges (PNG)               |
