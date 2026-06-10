const SPRITE = {
  frameWidth: 60,
  frameHeight: 60,
  numFrames: 4,
  animSpeed: 20,
  scale: 0.5,
  rows: {
    down: 0,
    up: 3,
    right: 2,
    left: 1,
  },
  offsets: {
    down: { x: 0, y: 10 },
    up: { x: 0, y: 20 },
    right: { x: 3, y: 10 },
    left: { x: 10, y: 10 },
  },
};

const HEART = {
  frameWidth: 32,
  frameHeight: 32,
  numFrames: 7,
  animSpeed: 6,
  scale: 1,
};

const TILE_SIZE = 50;

const MAZE = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 2, 0, 0, 1, 0, 3, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 3, 1, 1],
  [1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 3, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 4, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

// Colours for each tile type — stored as RGB arrays
const TILE_COLORS = {
  0: [71, 63, 51], // floor — dark grey
  1: [50, 168, 82], // wall  — purple-grey
  2: [71, 63, 51], // start — same as floor
  3: [71, 63, 51], // heart  — same as floor (heart drawn on top)
  4: [60, 100, 80], // exit  — green tint when locked
};

let player = {
  x: 0,
  y: 0,
  speed: 2,

  // Animation state
  currentFrame: 0,
  frameTimer: 0,
  direction: "down",
  isMoving: false,

  hw: 12, // half width
  hh: 12, // half height
};

let hearts = [];
let heartsCollected = 0;

let gameWon = false;

// Images
let characterSheet;
let heartSheet;

function preload() {
  characterSheet = loadImage("assets/images/walking.png");
  heartSheet = loadImage("assets/images/collectibles.png");
}

function setup() {
  // Size the canvas to fit the maze exactly
  createCanvas(TILE_SIZE * MAZE[0].length, TILE_SIZE * MAZE.length);
  imageMode(CENTER);

  // Scan the maze array to find the start position and heart locations
  for (let row = 0; row < MAZE.length; row++) {
    for (let col = 0; col < MAZE[row].length; col++) {
      let tile = MAZE[row][col];

      if (tile === 2) {
        // Place the player in the centre of the start tile
        player.x = col * TILE_SIZE + TILE_SIZE / 2;
        player.y = row * TILE_SIZE + TILE_SIZE / 2;
      }

      if (tile === 3) {
        // Create a heart object for each heart tile
        // Random start frame so hearts don't all spin in sync
        hearts.push({
          x: col * TILE_SIZE + TILE_SIZE / 2,
          y: row * TILE_SIZE + TILE_SIZE / 2,
          frame: floor(random(HEART.numFrames)),
          frameTimer: 0,
          collected: false,
        });
      }
    }
  }
}

function draw() {
  background(20);

  drawMaze();
  updateHearts();
  drawHearts();
  handleInput();
  resolveWallCollisions();
  checkHeartCollection();
  checkExit();
  animateSprite();
  drawCharacter();
  drawHUD();

  // Win screen is drawn last so it appears on top of everything
  if (gameWon) {
    drawWinScreen();
  }
}

function drawMaze() {
  rectMode(CORNER);
  noStroke();

  for (let row = 0; row < MAZE.length; row++) {
    for (let col = 0; col < MAZE[row].length; col++) {
      let tile = MAZE[row][col];

      if (tile === 4) {
        if (heartsCollected === hearts.length) {
          fill(82, 242, 107); // bright green — exit is open
        } else {
          fill(49, 94, 72); // dim green — exit is locked
        }
      } else {
        let c = TILE_COLORS[tile];
        fill(c[0], c[1], c[2]);
      }

      rect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }
}

function updateHearts() {
  for (let i = 0; i < hearts.length; i++) {
    if (hearts[i].collected) continue;

    hearts[i].frameTimer++;
    if (hearts[i].frameTimer >= HEART.animSpeed) {
      hearts[i].frameTimer = 0;
      hearts[i].frame = (hearts[i].frame + 1) % HEART.numFrames;
    }
  }
}

function drawHearts() {
  for (let i = 0; i < hearts.length; i++) {
    if (hearts[i].collected) continue;

    let heart = hearts[i];

    // Source x position on the sprite sheet
    // Hearts have only one row so sy is always 0
    let sx = heart.frame * HEART.frameWidth;
    let dw = HEART.frameWidth * HEART.scale;
    let dh = HEART.frameHeight * HEART.scale;

    image(
      heartSheet,
      heart.x,
      heart.y,
      dw,
      dh,
      sx,
      0,
      HEART.frameWidth,
      HEART.frameHeight,
    );
  }
}

function handleInput() {
  if (gameWon) return;

  player.isMoving = false;

  if (keyIsDown(87)) {
    // W — up
    player.y -= player.speed;
    player.direction = "up";
    player.isMoving = true;
  }
  if (keyIsDown(83)) {
    // S — down
    player.y += player.speed;
    player.direction = "down";
    player.isMoving = true;
  }
  if (keyIsDown(65)) {
    // A — left
    player.x -= player.speed;
    player.direction = "left";
    player.isMoving = true;
  }
  if (keyIsDown(68)) {
    // D — right
    player.x += player.speed;
    player.direction = "right";
    player.isMoving = true;
  }
}

function resolveWallCollisions() {
  // The four corners of the player's collision box
  let corners = [
    { x: player.x - player.hw, y: player.y - player.hh }, // top left
    { x: player.x + player.hw, y: player.y - player.hh }, // top right
    { x: player.x - player.hw, y: player.y + player.hh }, // bottom left
    { x: player.x + player.hw, y: player.y + player.hh }, // bottom right
  ];

  for (let i = 0; i < corners.length; i++) {
    let c = corners[i];

    // Convert pixel position to tile coordinates
    let col = floor(c.x / TILE_SIZE);
    let row = floor(c.y / TILE_SIZE);

    // Skip if outside the maze array bounds
    if (row < 0 || row >= MAZE.length || col < 0 || col >= MAZE[0].length)
      continue;

    if (MAZE[row][col] === 1) {
      // Calculate how far the player is overlapping each side of the wall tile
      let tileLeft = col * TILE_SIZE;
      let tileRight = tileLeft + TILE_SIZE;
      let tileTop = row * TILE_SIZE;
      let tileBottom = tileTop + TILE_SIZE;

      let overlapLeft = player.x + player.hw - tileLeft;
      let overlapRight = tileRight - (player.x - player.hw);
      let overlapTop = player.y + player.hh - tileTop;
      let overlapBottom = tileBottom - (player.y - player.hh);

      // Push the player out from the side with the smallest overlap
      let minOverlap = min(
        overlapLeft,
        overlapRight,
        overlapTop,
        overlapBottom,
      );

      if (minOverlap === overlapLeft) player.x -= overlapLeft;
      else if (minOverlap === overlapRight) player.x += overlapRight;
      else if (minOverlap === overlapTop) player.y -= overlapTop;
      else if (minOverlap === overlapBottom) player.y += overlapBottom;
    }
  }
}

function checkHeartCollection() {
  for (let i = 0; i < hearts.length; i++) {
    if (hearts[i].collected) continue;

    // dist() returns the distance between two points
    let d = dist(player.x, player.y, hearts[i].x, hearts[i].y);
    if (d < TILE_SIZE * 0.6) {
      hearts[i].collected = true;
      heartsCollected++;
    }
  }
}

function checkExit() {
  if (heartsCollected < hearts.length) return; // exit is still locked

  for (let row = 0; row < MAZE.length; row++) {
    for (let col = 0; col < MAZE[row].length; col++) {
      if (MAZE[row][col] === 4) {
        let exitX = col * TILE_SIZE + TILE_SIZE / 2;
        let exitY = row * TILE_SIZE + TILE_SIZE / 2;
        if (dist(player.x, player.y, exitX, exitY) < TILE_SIZE * 0.6) {
          gameWon = true;
        }
      }
    }
  }
}

function animateSprite() {
  if (player.isMoving) {
    player.frameTimer++;

    if (player.frameTimer >= SPRITE.animSpeed) {
      player.frameTimer = 0;
      player.currentFrame = (player.currentFrame + 1) % SPRITE.numFrames;
    }
  } else {
    // Reset to standing frame when not moving
    player.currentFrame = 0;
    player.frameTimer = 0;
  }
}

function drawCharacter() {
  // Get the correct row and offset for the current direction
  let row = SPRITE.rows[player.direction];
  let offset = SPRITE.offsets[player.direction];

  // Source position on the sprite sheet (with offset applied)
  let sx = player.currentFrame * SPRITE.frameWidth + offset.x;
  let sy = row * SPRITE.frameHeight + offset.y;

  // Draw size (original frame size multiplied by scale)
  let dw = SPRITE.frameWidth * SPRITE.scale;
  let dh = SPRITE.frameHeight * SPRITE.scale;

  image(
    characterSheet,
    player.x,
    player.y,
    dw,
    dh,
    sx,
    sy,
    SPRITE.frameWidth,
    SPRITE.frameHeight,
  );
}

function drawHUD() {
  noStroke();
  fill(255);
  textSize(14);
  textAlign(LEFT);
  textFont("Courier New");
  text("Hearts: " + heartsCollected + " / " + hearts.length, 10, 20);

  // Show exit hint once all hearts are collected
  if (heartsCollected === hearts.length) {
    fill(7, 61, 28);
    text("Exit is open! Find the green tile.", 10, 40);
  }
}

function drawWinScreen() {
  fill(0, 0, 0, 160);
  rectMode(CORNER);
  rect(0, 0, width, height);

  fill(255);
  textAlign(CENTER);
  textSize(48);
  text("AMAZING! You escaped!", width / 2, height / 2 - 20);

  textSize(16);
  fill(180);
  text(
    "Mario now has all hearts collected and can keep going.",
    width / 2,
    height / 2 + 20,
  );
}
