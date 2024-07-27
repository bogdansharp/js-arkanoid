# js-arkanoid

#### Video Demo: [https://youtu.be/s9ONJxGcuyo](https://youtu.be/s9ONJxGcuyo)
#### Github: [https://github.com/bogdansharp/js-arkanoid](https://github.com/bogdansharp/js-arkanoid)

## Description
**js-arkanoid** is a web-based Arkanoid game. The game runs in a browser window on both PC/laptop and smartphone. It features a menu where the user can restart the game, and turn on music and sounds. The music is a simple AI-generated track. The game currently has 6 levels. The user scores points each second proportional to the speed of the ball, which increases during the game. Additional points are added when bricks are destroyed by the ball.

### Project Files
The project is built using JavaScript and consists of the following components:
- **Folder with sounds**: Contains all audio files.
- **index.html**: A simple HTML page with the following elements:
  - `<div id="ball">`: Game area containing the ball, paddle, and info panel.
  - `<div id="mainstatus">`: Output messages about level start or game end.
  - `<div id="controls">`: User menu.
- **code.js**: Contains the main game code.
- **styles.css**: Manages the game's styles.
- **game.json**: Configuration of the levels in JSON format.

### Coding
The application utilizes the MVC (Model-View-Controller) design pattern and consists of three classes: `GameController`, `GameView`, and `GameModel`. These classes are created as single instances, independent of each other, and communicate via events.

### 1. GameController
Captures user input in the form of key press events, mouse clicks/movements, and touchpad movements. It creates other objects and sends them corresponding events.

**Properties:**
- `m` of type `GameModel`.
- `v` of type `GameView`.

**Methods:**
- `constructor()`
  - Creates an instance of `GameModel`.
  - Loads level data via the `m.loadGameData()` method.
  - Allocates event handlers.
  - After `loadGameData()` completes asynchronously:
    - Creates `GameView`.
    - Allocates game area-specific event handlers.
    - Calls `startNewGame()`.
- `startNewGame(level)`
  - Calls methods to start a new game for `GameModel` and `GameView`.
  - Loads the level.
  - Starts a timer for time intervals to update the model and visualization.
- `step()`: Method for each time tick.
  - If the model reports "End Game" status, shows "End Game" message via `GameView.endGame()`.
  - If the model reports "Level complete" status, calls `startNewGame(level + 1)` or shows "Victory" message via `GameView.endGame()`.
  - Updates the model simulation by calling `timeStep(deltaTime)` of `GameModel`, where `deltaTime` is the time from the previous tick.
  - Processes sound events via `processSoundEvents()`.
  - Updates bricks via `processBricks()`.
  - Renders `GameView`.
  - Schedules the next tick.
- `processSoundEvents()`: Traverses `GameModel` sound event queue and plays sounds whose time has passed.
- `processBricks()`: Traverses `GameModel` destroyed bricks queue and calls `GameView` to remove them from visualization.
- `keyListener(e)`, `mouseDown(e)`, `mouseUp(e)`, `mouseMove(e)`: Handles user input.
- `showControls(e)`: Pauses/starts the game and shows/hides the menu.

### 2. GameView
Responsible for creating the visual interface for the user. All graphical elements are browser DOM elements. The output is completely independent of the model, so if the user changes the window size, it does not affect the game process, and the game remains playable in any reasonable window size.

**Methods:**
- `constructor(model)`
  - Initializes `GameView`.
  - Saves a link to the `GameModel` instance to an internal property.
  - Calls the `newGame()` method.
  - Calls the `resize()` method.
- `render()`: Method for frame visualization.
  - Updates ball position, paddle position, and score.
- `resize(ev)`: Handles changes to the game area size (also used in the constructor for initial setup). Draws all game objects proportional to the game area size.
- `showMainStatus()`: Outputs status messages like "Game Over", "Victory", "Level x". Asynchronous function. Sets a timeout for the user to prepare for the next actions.
- `newGame()`: Draws bricks for a new level and sets the initial position and parameters for the ball and paddle.
- `endGame()`: Hides the ball, shows the status message.
- `playSound(sound)`, `playMusic(on)`: Plays sound effects.

### 3. GameModel
The core component where all simulations happen.

**Properties:**
- `state`: One of the set: `{ init, active, pause, missed, game over, level complete }`.
- `width`, `height`: Internal model coordinates (separate from `GameView` coordinates).
- `time`: Internal game time in milliseconds starting from 0.
- `score`: User score.
- `bricks`: Array of bricks.
- `levels`: All levels data.
- `level`: Current level number.
- `bq`: List of destroyed bricks queued to be visually hidden.
- `eq`: Queue of game events.
- `sq`: Queue of sound events.

**Methods:**
- `constructor()`: Initializes the model.
- `newGame()`: Starts a new game.
  - Sets time to 0.
  - Sets ball speed to initial speed.
  - Sets state to "active".
  - Initializes `bq`, `eq`, and `sq` to empty arrays.
- `loadGameData()`: Asynchronously loads `game.json` into the levels instance variable.
- `loadLevel(level)`: Loads the current level, by default the first level.
- `movePaddleLeft()`, `movePaddleRight()`, `movePaddlePos()`: Changes paddle position according to user activity.
- `queueBounce()`
  - Simulates ball bounce from paddle/wall/brick.
  - Schedules the next game event.
  - Schedules a sound event if necessary.
- `processEvent()`: Processes game events (types are: release ball, paddle left, paddle right, paddle move to position, horizontal bounce, horizontal paddle bounce, vertical bounce, game over, add score for time, speed up).
- `moveBall(delta)`: Moves the ball to a new position after delta time from the current time.
- `timeStep(increment)`: Updates the model.
  - Traverses the queue of game events and processes those whose time has come, updating the current time each time.
  - Calls `moveBall()` to position the ball to the corresponding position.
