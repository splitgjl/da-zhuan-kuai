const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const messageScreen = document.getElementById('messageScreen');
const messageText = document.getElementById('messageText');
const restartButton = document.getElementById('restartButton');
const gameContainer = document.getElementById('gameContainer');

// --- Game Variables ---
let score = 0;
let lives = 3;
let ball, paddle, bricks;
let gameOver = false;
let gameWon = false;
let animationFrameId; // To control the game loop

// --- Game Constants ---
const PADDLE_HEIGHT = 15;
const PADDLE_WIDTH_RATIO = 0.25; // Paddle width as a fraction of canvas width
const BALL_RADIUS = 8;
const BRICK_ROW_COUNT = 5;
const BRICK_COLUMN_COUNT = 7;
const BRICK_PADDING = 5;
const BRICK_OFFSET_TOP = 40; // Space for score/lives
const BRICK_OFFSET_LEFT = 10;
let brickWidth, brickHeight; // Will be calculated based on canvas size

const PADDLE_COLOR = '#0095DD';
const BALL_COLOR = '#FF6347'; // Tomato color
const BRICK_COLORS = ['#DD0000', '#DD7700', '#DDDD00', '#00DD00', '#0000DD']; // Different row colors

// --- Game Objects ---
function createPaddle() {
    return {
        width: canvas.width * PADDLE_WIDTH_RATIO,
        height: PADDLE_HEIGHT,
        x: (canvas.width - (canvas.width * PADDLE_WIDTH_RATIO)) / 2,
        y: canvas.height - PADDLE_HEIGHT - 10, // Position near bottom
        dx: 0 // We control position directly with touch
    };
}

function createBall() {
    return {
        radius: BALL_RADIUS,
        x: canvas.width / 2,
        y: paddle.y - BALL_RADIUS - 5, // Start above the paddle
        speed: 4,
        dx: 3 * (Math.random() < 0.5 ? 1 : -1), // Initial random horizontal direction
        dy: -3 // Initial upward direction
    };
}

function createBricks() {
    const bricksArray = [];
    brickWidth = (canvas.width - BRICK_OFFSET_LEFT * 2 - BRICK_PADDING * (BRICK_COLUMN_COUNT - 1)) / BRICK_COLUMN_COUNT;
    brickHeight = 20; // Fixed height

    for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
        bricksArray[c] = [];
        for (let r = 0; r < BRICK_ROW_COUNT; r++) {
            const brickX = BRICK_OFFSET_LEFT + c * (brickWidth + BRICK_PADDING);
            const brickY = BRICK_OFFSET_TOP + r * (brickHeight + BRICK_PADDING);
            bricksArray[c][r] = {
                x: brickX,
                y: brickY,
                width: brickWidth,
                height: brickHeight,
                color: BRICK_COLORS[r % BRICK_COLORS.length], // Cycle through colors
                status: 1 // 1: active, 0: broken
            };
        }
    }
    return bricksArray;
}

// --- Drawing Functions ---
function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.fillStyle = PADDLE_COLOR;
    ctx.fill();
    ctx.closePath();
}

function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = BALL_COLOR;
    ctx.fill();
    ctx.closePath();
}

function drawBricks() {
    for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
        for (let r = 0; r < BRICK_ROW_COUNT; r++) {
            if (bricks[c][r].status === 1) {
                const brick = bricks[c][r];
                ctx.beginPath();
                ctx.rect(brick.x, brick.y, brick.width, brick.height);
                ctx.fillStyle = brick.color;
                ctx.fill();
                ctx.closePath();
            }
        }
    }
}

function drawUI() {
    scoreElement.textContent = score;
    livesElement.textContent = lives;
}

// --- Collision Detection ---
function collisionDetection() {
    // Ball vs Bricks
    let totalBricks = 0;
    for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
        for (let r = 0; r < BRICK_ROW_COUNT; r++) {
            const brick = bricks[c][r];
            if (brick.status === 1) {
                totalBricks++;
                if (ball.x + ball.radius > brick.x &&
                    ball.x - ball.radius < brick.x + brick.width &&
                    ball.y + ball.radius > brick.y &&
                    ball.y - ball.radius < brick.y + brick.height)
                {
                    ball.dy = -ball.dy; // Reverse vertical direction
                    brick.status = 0;
                    score += 10;
                    // Check for win condition immediately after breaking a brick
                    if (score === BRICK_ROW_COUNT * BRICK_COLUMN_COUNT * 10) {
                        winGame();
                    }
                }
            }
        }
    }
     // If no active bricks left (alternative win check in case score counting is off)
    // if (totalBricks === 0 && !gameWon && !gameOver) {
    //    winGame();
    // }
}

// --- Movement ---
function movePaddle(touchX) {
     // Calculate the relative position of the touch within the canvas
    const rect = canvas.getBoundingClientRect();
    let relativeX = touchX - rect.left;

    // Center the paddle on the touch point
    paddle.x = relativeX - paddle.width / 2;

    // Keep paddle within canvas bounds
    if (paddle.x < 0) {
        paddle.x = 0;
    } else if (paddle.x + paddle.width > canvas.width) {
        paddle.x = canvas.width - paddle.width;
    }
}

function moveBall() {
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Wall Collision (Left/Right)
    if (ball.x + ball.dx > canvas.width - ball.radius || ball.x + ball.dx < ball.radius) {
        ball.dx = -ball.dx;
    }

    // Wall Collision (Top)
    if (ball.y + ball.dy < ball.radius) {
        ball.dy = -ball.dy;
    }
    // Paddle Collision
    else if (ball.y + ball.dy > paddle.y - ball.radius && // Ball is low enough
             ball.y < paddle.y && // Ball is currently above the paddle
             ball.x > paddle.x - ball.radius && // Ball is horizontally aligned (+/- radius leeway)
             ball.x < paddle.x + paddle.width + ball.radius)
    {
        // Check if the ball hit the top surface of the paddle
        if(ball.y + ball.radius > paddle.y && ball.dy > 0){
             ball.dy = -ball.dy;
            // Optional: Add angle change based on hit position on paddle
             let collidePoint = ball.x - (paddle.x + paddle.width/2);
             ball.dx = (collidePoint / (paddle.width/2)) * 3; // Adjust horizontal speed based on hit loc
        }

    }
    // Wall Collision (Bottom) - Lose Life
    else if (ball.y + ball.dy > canvas.height - ball.radius) {
        lives--;
        if (lives <= 0) {
            loseGame();
        } else {
            // Reset ball and paddle position
            resetBallAndPaddle();
        }
    }
}

// --- Game State ---
function resetBallAndPaddle() {
    paddle.x = (canvas.width - paddle.width) / 2;
    ball.x = canvas.width / 2;
    ball.y = paddle.y - BALL_RADIUS - 5;
    ball.dx = 3 * (Math.random() < 0.5 ? 1 : -1);
    ball.dy = -3;
}

function loseGame() {
    gameOver = true;
    messageText.textContent = '游戏结束!';
    messageScreen.style.display = 'block';
    cancelAnimationFrame(animationFrameId); // Stop the loop
}

function winGame() {
    gameWon = true;
    gameOver = true; // Treat win as a game over state to stop the loop
    messageText.textContent = '你赢了!';
    messageScreen.style.display = 'block';
    cancelAnimationFrame(animationFrameId); // Stop the loop
}

function restartGame() {
    // Hide message screen
    messageScreen.style.display = 'none';

    // Reset variables
    score = 0;
    lives = 3;
    gameOver = false;
    gameWon = false;

    // Recreate game objects
    setupCanvas(); // Recalculate dimensions
    paddle = createPaddle();
    bricks = createBricks();
    resetBallAndPaddle(); // This places the ball correctly

    // Start the game loop again
    gameLoop();
}


// --- Game Loop ---
function update() {
    if (gameOver) return;

    moveBall();
    collisionDetection(); // Check brick collisions first
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw elements
    drawBricks();
    drawPaddle();
    drawBall();
    drawUI(); // Update score and lives display
}

function gameLoop() {
    if (!gameOver) {
        update();
        draw();
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

// --- Initialization ---
function setupCanvas() {
    // Set logical canvas size (internal resolution)
    // Let's use a fixed aspect ratio, e.g., 2:3
    const containerWidth = gameContainer.clientWidth;
    canvas.width = containerWidth;
    canvas.height = containerWidth * 1.5; // Adjust ratio as needed

    // CSS handles the display scaling
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
}

function init() {
    setupCanvas(); // Set initial size
    paddle = createPaddle();
    bricks = createBricks();
    resetBallAndPaddle(); // Initial placement

    // --- Touch Event Listeners ---
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent scrolling/zooming
        if (e.touches.length > 0 && !gameOver) {
            movePaddle(e.touches[0].clientX);
        }
    }, { passive: false }); // Need passive: false to use preventDefault

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Prevent scrolling/zooming
        if (e.touches.length > 0 && !gameOver) {
            movePaddle(e.touches[0].clientX);
        }
    }, { passive: false });

    // Restart button listener
    restartButton.addEventListener('click', restartGame);
    // Also allow touching the message screen to restart
    messageScreen.addEventListener('touchstart', (e) => {
         e.preventDefault();
         if(gameOver){ // Only restart if game is actually over
            restartGame();
         }
    }, { passive: false });

    // Start the game
    gameLoop();
}

// Adjust canvas size on window resize (optional, but good for desktop/orientation change)
window.addEventListener('resize', () => {
    if (!gameOver) { // Avoid resizing during game over message
        setupCanvas();
        // Recalculate dependent objects if needed (paddle width, brick size/pos)
        paddle.width = canvas.width * PADDLE_WIDTH_RATIO;
        paddle.x = Math.min(Math.max(paddle.x, 0), canvas.width - paddle.width); // Keep in bounds
        paddle.y = canvas.height - PADDLE_HEIGHT - 10;
        bricks = createBricks(); // Recalculate brick layout
        // Ball position might need adjustment too if aspect ratio changes significantly
    } else {
        // Ensure message screen stays centered after resize
        setupCanvas();
    }
});


// Start the game when the page loads
init();