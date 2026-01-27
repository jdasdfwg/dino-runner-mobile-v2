// ============================================
// DINO RUNNER - UMBRELLA EDITION
// Chrome Dino-style game with asteroid defense
// ============================================

// Canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const currentScoreEl = document.getElementById('currentScore');
const highScoreEl = document.getElementById('highScore');
const finalScoreEl = document.getElementById('finalScore');
const gameContainer = document.getElementById('game-container');

// ============================================
// GAME CONSTANTS
// ============================================
const GROUND_Y = 250;           // Ground level
const GRAVITY = 0.8;            // Gravity strength
const JUMP_FORCE = -15;         // Jump velocity
const BASE_SPEED = 5;           // Starting game speed
const MAX_SPEED = 18;           // Maximum game speed
const SPEED_INCREMENT = 0.002;  // Speed increase per frame (faster ramp up)

// ============================================
// GAME STATE
// ============================================
let gameState = 'start'; // 'start', 'playing', 'gameover'
let score = 0;
let highScore = parseInt(localStorage.getItem('dinoHighScore')) || 0;
let gameSpeed = BASE_SPEED;
let frameCount = 0;

// ============================================
// INPUT STATE
// ============================================
const keys = {
    jump: false,      // Space or J
    umbrella: false   // U key
};

// ============================================
// PLAYER (DINOSAUR)
// ============================================
const player = {
    x: 80,
    y: GROUND_Y,
    width: 40,
    height: 50,
    velocityY: 0,
    isJumping: false,
    isUmbrellaActive: false,
    
    // Umbrella hitbox (above player)
    umbrellaWidth: 60,
    umbrellaHeight: 15,
    
    reset() {
        this.y = GROUND_Y;
        this.velocityY = 0;
        this.isJumping = false;
        this.isUmbrellaActive = false;
    },
    
    update() {
        // Handle umbrella - can only use when not jumping
        if (keys.umbrella && !this.isJumping) {
            this.isUmbrellaActive = true;
        } else {
            this.isUmbrellaActive = false;
        }
        
        // Handle jump - can only jump when not using umbrella and on ground
        if (keys.jump && !this.isJumping && !this.isUmbrellaActive) {
            this.velocityY = JUMP_FORCE;
            this.isJumping = true;
        }
        
        // Apply gravity
        this.velocityY += GRAVITY;
        this.y += this.velocityY;
        
        // Ground collision
        if (this.y >= GROUND_Y) {
            this.y = GROUND_Y;
            this.velocityY = 0;
            this.isJumping = false;
        }
    },
    
    draw() {
        ctx.fillStyle = '#535353';
        
        // Draw dinosaur body
        const drawY = this.y - this.height;
        
        // Body
        ctx.fillRect(this.x, drawY + 15, 30, 35);
        
        // Head
        ctx.fillRect(this.x + 15, drawY, 25, 20);
        
        // Eye
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x + 32, drawY + 5, 5, 5);
        
        ctx.fillStyle = '#535353';
        
        // Legs (animated)
        const legOffset = Math.sin(frameCount * 0.3) * 5;
        if (!this.isJumping) {
            ctx.fillRect(this.x + 5, drawY + 45, 8, 10 + legOffset);
            ctx.fillRect(this.x + 18, drawY + 45, 8, 10 - legOffset);
        } else {
            // Tucked legs when jumping
            ctx.fillRect(this.x + 5, drawY + 42, 8, 8);
            ctx.fillRect(this.x + 18, drawY + 42, 8, 8);
        }
        
        // Tail
        ctx.fillRect(this.x - 15, drawY + 20, 18, 10);
        
        // Draw umbrella if active
        if (this.isUmbrellaActive) {
            this.drawUmbrella(drawY);
        }
    },
    
    drawUmbrella(dinoY) {
        const umbrellaX = this.x - 10;
        const umbrellaY = dinoY - 30;
        
        ctx.fillStyle = '#535353';
        
        // Umbrella canopy (dome shape using arc)
        ctx.beginPath();
        ctx.arc(umbrellaX + 30, umbrellaY + 15, 35, Math.PI, 0, false);
        ctx.fill();
        
        // Umbrella handle
        ctx.fillRect(this.x + 18, dinoY - 5, 4, 25);
        
        // Umbrella edge decorations
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(umbrellaX + 5 + i * 13, umbrellaY + 15, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    },
    
    // Get umbrella hitbox for collision detection
    getUmbrellaHitbox() {
        return {
            x: this.x - 15,
            y: this.y - this.height - 45,
            width: 70,
            height: 30
        };
    },
    
    // Get player hitbox
    getHitbox() {
        return {
            x: this.x,
            y: this.y - this.height + 10,
            width: this.width - 5,
            height: this.height - 10
        };
    }
};

// ============================================
// OBSTACLES - CACTUS
// ============================================
const cacti = [];

function spawnCactus() {
    const types = [
        { width: 20, height: 40 },  // Small
        { width: 25, height: 50 },  // Medium
        { width: 35, height: 45 }   // Wide
    ];
    
    const type = types[Math.floor(Math.random() * types.length)];
    
    cacti.push({
        x: canvas.width + 50,
        y: GROUND_Y - type.height,
        width: type.width,
        height: type.height
    });
}

function updateCacti() {
    for (let i = cacti.length - 1; i >= 0; i--) {
        cacti[i].x -= gameSpeed;
        
        // Remove off-screen cacti
        if (cacti[i].x + cacti[i].width < 0) {
            cacti.splice(i, 1);
        }
    }
}

function drawCacti() {
    ctx.fillStyle = '#535353';
    
    cacti.forEach(cactus => {
        // Main trunk
        ctx.fillRect(cactus.x, cactus.y, cactus.width, cactus.height);
        
        // Arms
        if (cactus.width > 22) {
            // Left arm
            ctx.fillRect(cactus.x - 8, cactus.y + 10, 10, 5);
            ctx.fillRect(cactus.x - 8, cactus.y + 5, 5, 15);
            
            // Right arm
            ctx.fillRect(cactus.x + cactus.width - 2, cactus.y + 15, 10, 5);
            ctx.fillRect(cactus.x + cactus.width + 3, cactus.y + 10, 5, 15);
        }
    });
}

// ============================================
// OBSTACLES - ASTEROIDS
// ============================================
const asteroids = [];

function spawnAsteroid() {
    const size = 25 + Math.random() * 15;
    
    // Spawn asteroids ahead of player so they fall toward the dino
    // Closer spawn distance = more threatening, but still reactable
    const spawnAheadDistance = 80 + Math.random() * 150;
    const targetX = player.x + spawnAheadDistance;
    
    // Calculate fall speed based on game difficulty - faster as game progresses
    const baseFallSpeed = 4 + (gameSpeed - BASE_SPEED) * 0.4;
    const fallSpeed = baseFallSpeed + Math.random() * 2;
    
    asteroids.push({
        x: targetX,
        y: -size - 10,
        width: size,
        height: size,
        speedY: fallSpeed,
        speedX: -gameSpeed * 0.2, // Move left slightly with game scroll
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.2
    });
}

function updateAsteroids() {
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const asteroid = asteroids[i];
        asteroid.x += asteroid.speedX;
        asteroid.y += asteroid.speedY;
        asteroid.rotation += asteroid.rotationSpeed;
        
        // Remove off-screen asteroids
        if (asteroid.y > canvas.height + 50 || asteroid.x < -50) {
            asteroids.splice(i, 1);
        }
    }
}

function drawAsteroids() {
    asteroids.forEach(asteroid => {
        ctx.save();
        ctx.translate(asteroid.x + asteroid.width / 2, asteroid.y + asteroid.height / 2);
        ctx.rotate(asteroid.rotation);
        
        ctx.fillStyle = '#535353';
        
        // Draw jagged asteroid shape
        ctx.beginPath();
        const points = 8;
        for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const radius = asteroid.width / 2 * (0.7 + Math.random() * 0.3);
            const px = Math.cos(angle) * radius;
            const py = Math.sin(angle) * radius;
            
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
        ctx.fill();
        
        // Crater details
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.arc(-3, -2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(5, 4, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    });
}

// ============================================
// BACKGROUND ELEMENTS
// ============================================
const clouds = [];
const groundLines = [];

function initBackground() {
    // Initialize clouds
    for (let i = 0; i < 5; i++) {
        clouds.push({
            x: Math.random() * canvas.width,
            y: 30 + Math.random() * 50,
            width: 40 + Math.random() * 30
        });
    }
    
    // Initialize ground texture lines
    for (let i = 0; i < 20; i++) {
        groundLines.push({
            x: Math.random() * canvas.width,
            width: 10 + Math.random() * 30
        });
    }
}

function updateBackground() {
    // Update clouds
    clouds.forEach(cloud => {
        cloud.x -= gameSpeed * 0.2;
        if (cloud.x + cloud.width < 0) {
            cloud.x = canvas.width + 50;
            cloud.y = 30 + Math.random() * 50;
        }
    });
    
    // Update ground lines
    groundLines.forEach(line => {
        line.x -= gameSpeed;
        if (line.x + line.width < 0) {
            line.x = canvas.width + Math.random() * 100;
        }
    });
}

function drawBackground() {
    // Draw clouds
    ctx.fillStyle = '#e0e0e0';
    clouds.forEach(cloud => {
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, 15, 0, Math.PI * 2);
        ctx.arc(cloud.x + 20, cloud.y - 5, 18, 0, Math.PI * 2);
        ctx.arc(cloud.x + 40, cloud.y, 15, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw ground line
    ctx.fillStyle = '#535353';
    ctx.fillRect(0, GROUND_Y, canvas.width, 2);
    
    // Draw ground texture
    ctx.fillStyle = '#c0c0c0';
    groundLines.forEach(line => {
        ctx.fillRect(line.x, GROUND_Y + 5, line.width, 2);
    });
}

// ============================================
// COLLISION DETECTION
// ============================================
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function checkCollisions() {
    const playerHitbox = player.getHitbox();
    const umbrellaHitbox = player.getUmbrellaHitbox();
    
    // Check cactus collisions
    for (const cactus of cacti) {
        if (checkCollision(playerHitbox, cactus)) {
            return true; // Game over
        }
    }
    
    // Check asteroid collisions
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const asteroid = asteroids[i];
        
        // Check if umbrella blocks asteroid
        if (player.isUmbrellaActive && checkCollision(umbrellaHitbox, asteroid)) {
            // Asteroid blocked! Remove it and add points
            asteroids.splice(i, 1);
            score += 10;
            createBlockEffect(asteroid.x, asteroid.y);
            continue;
        }
        
        // Check if asteroid hits player
        if (checkCollision(playerHitbox, asteroid)) {
            return true; // Game over
        }
    }
    
    return false;
}

// ============================================
// VISUAL EFFECTS
// ============================================
const particles = [];

function createBlockEffect(x, y) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 20,
            size: 3 + Math.random() * 4
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.vy += 0.3; // Gravity on particles
        
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    ctx.fillStyle = '#535353';
    particles.forEach(p => {
        ctx.globalAlpha = p.life / 20;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1;
}

function screenShake() {
    gameContainer.classList.add('shake');
    setTimeout(() => gameContainer.classList.remove('shake'), 300);
}

// ============================================
// SCORING
// ============================================
function updateScore() {
    score++;
    
    // Format score with leading zeros
    currentScoreEl.textContent = score.toString().padStart(5, '0');
    
    // Update high score if beaten
    if (score > highScore) {
        highScore = score;
        highScoreEl.textContent = highScore.toString().padStart(5, '0');
        localStorage.setItem('dinoHighScore', highScore);
    }
}

// ============================================
// SPAWN MANAGEMENT
// ============================================
let lastCactusSpawn = 0;
let lastAsteroidSpawn = 0;

// Check if there's a cactus in the "jump zone" - where player needs to jump
function isCactusInJumpZone() {
    const jumpZoneStart = player.x + 50;  // Close enough that player needs to jump soon
    const jumpZoneEnd = player.x + 200;   // Far enough that asteroid would conflict
    
    for (const cactus of cacti) {
        if (cactus.x > jumpZoneStart && cactus.x < jumpZoneEnd) {
            return true;
        }
    }
    return false;
}

// Check if there's already an asteroid threatening the player
function isAsteroidAlreadyThreatening() {
    const dangerZone = player.x + 250;
    for (const asteroid of asteroids) {
        if (asteroid.x < dangerZone && asteroid.y < 150) {
            return true;
        }
    }
    return false;
}

function manageSpawns() {
    // Spawn cacti - interval decreases as speed increases
    const cactusInterval = Math.max(50, 140 - gameSpeed * 6);
    if (frameCount - lastCactusSpawn > cactusInterval + Math.random() * 80) {
        spawnCactus();
        lastCactusSpawn = frameCount;
    }
    
    // Spawn asteroids more frequently, but prevent impossible situations
    // Don't spawn asteroid if:
    // 1. There's a cactus in the jump zone (would require jumping + umbrella simultaneously)
    // 2. There's already an asteroid threatening the player
    const minAsteroidInterval = Math.max(25, 60 - gameSpeed * 2);
    const asteroidChance = Math.min(0.12, 0.04 + gameSpeed * 0.006);
    
    const canSpawnAsteroid = 
        frameCount > 90 && // Short grace period at start
        !isCactusInJumpZone() && // No cactus requiring a jump
        !isAsteroidAlreadyThreatening() && // No existing asteroid threat
        frameCount - lastAsteroidSpawn > minAsteroidInterval;
    
    if (canSpawnAsteroid && Math.random() < asteroidChance) {
        spawnAsteroid();
        lastAsteroidSpawn = frameCount;
    }
}

// ============================================
// GAME LOOP
// ============================================
function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (gameState === 'playing') {
        frameCount++;
        
        // Increase difficulty over time
        gameSpeed = Math.min(MAX_SPEED, BASE_SPEED + frameCount * SPEED_INCREMENT);
        
        // Update game objects
        player.update();
        updateCacti();
        updateAsteroids();
        updateBackground();
        updateParticles();
        manageSpawns();
        
        // Check for collisions
        if (checkCollisions()) {
            gameOver();
        }
        
        // Update score every 5 frames
        if (frameCount % 5 === 0) {
            updateScore();
        }
    }
    
    // Draw everything
    drawBackground();
    drawCacti();
    drawAsteroids();
    player.draw();
    drawParticles();
    
    // Continue game loop
    requestAnimationFrame(gameLoop);
}

// ============================================
// GAME STATE MANAGEMENT
// ============================================
function startGame() {
    gameState = 'playing';
    score = 0;
    gameSpeed = BASE_SPEED;
    frameCount = 0;
    lastCactusSpawn = 0;
    lastAsteroidSpawn = 0;
    
    // Clear obstacles
    cacti.length = 0;
    asteroids.length = 0;
    particles.length = 0;
    
    // Reset player
    player.reset();
    
    // Update UI
    currentScoreEl.textContent = '00000';
    highScoreEl.textContent = highScore.toString().padStart(5, '0');
    
    // Hide screens
    startScreen.style.display = 'none';
    gameOverScreen.classList.add('hidden');
}

function gameOver() {
    gameState = 'gameover';
    screenShake();
    
    // Show game over screen
    finalScoreEl.textContent = score;
    gameOverScreen.classList.remove('hidden');
}

function restartGame() {
    startGame();
}

// ============================================
// INPUT HANDLING
// ============================================
document.addEventListener('keydown', (e) => {
    // Jump keys: Space or J
    if (e.code === 'Space' || e.code === 'KeyJ') {
        e.preventDefault();
        keys.jump = true;
        
        // Handle game state transitions
        if (gameState === 'start') {
            startGame();
        } else if (gameState === 'gameover') {
            restartGame();
        }
    }
    
    // Umbrella key: U
    if (e.code === 'KeyU') {
        keys.umbrella = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'Space' || e.code === 'KeyJ') {
        keys.jump = false;
    }
    
    if (e.code === 'KeyU') {
        keys.umbrella = false;
    }
});

// Prevent spacebar from scrolling
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
    }
});

// ============================================
// INITIALIZATION
// ============================================
function init() {
    // Load high score
    highScoreEl.textContent = highScore.toString().padStart(5, '0');
    
    // Initialize background
    initBackground();
    
    // Start game loop
    gameLoop();
}

// Start the game
init();
