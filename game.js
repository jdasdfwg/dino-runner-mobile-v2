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
let gameState = 'start'; // 'start', 'playing', 'paused', 'gameover', 'victory'
let score = 0;
let highScore = parseInt(localStorage.getItem('dinoHighScore')) || 0;
let gameSpeed = BASE_SPEED;
let frameCount = 0;

// Volcano/fire mode (activates at score 500)
let volcanoMode = false;
const VOLCANO_SCORE = 500;

// Level system
let currentLevel = 1;
const POINTS_PER_LEVEL = 250;
const MAX_LEVEL = 10;
const WIN_SCORE = (MAX_LEVEL * POINTS_PER_LEVEL) + POINTS_PER_LEVEL; // 2750 points to win
let freePlayMode = false;
let levelUpAnimation = 0; // Timer for level up animation

// Bonus text popups
const bonusTexts = [];

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
        // Handle umbrella - can be used anytime (including mid-air)
        if (keys.umbrella) {
            this.isUmbrellaActive = true;
        } else {
            this.isUmbrellaActive = false;
        }
        
        // Handle jump - can only START a jump when on ground and not using umbrella
        // (once in the air, umbrella can be activated)
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
    // Made wider and taller to catch asteroids falling straight down
    getUmbrellaHitbox() {
        return {
            x: this.x - 25,
            y: this.y - this.height - 60,
            width: 90,
            height: 80
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
    
    // Spawn slightly to the right of player, falls down and drifts left
    const spawnX = player.x + 50 + Math.random() * 100; // 50-150px to the right
    const spawnY = -size - 20;
    
    // Difficulty progression
    const difficultyProgress = Math.min(1, frameCount / 3000);
    
    // Slight left drift (negative = moving left), never right
    const speedX = -(1 + Math.random() * 1.5); // -1 to -2.5
    
    // Fall speed - starts slow, gets faster
    const baseFallSpeed = 3 + difficultyProgress * 2;
    const speedY = baseFallSpeed + Math.random() * 1;
    
    // Pre-generate asteroid shape (so it doesn't flicker)
    const shapeVariance = [];
    for (let i = 0; i < 8; i++) {
        shapeVariance.push(0.7 + Math.random() * 0.3);
    }
    
    asteroids.push({
        x: spawnX,
        y: spawnY,
        width: size,
        height: size,
        speedY: speedY,
        speedX: speedX,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
        shape: shapeVariance
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
        
        // Draw jagged asteroid shape using pre-generated variance
        ctx.beginPath();
        const points = 8;
        for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const radius = asteroid.width / 2 * asteroid.shape[i];
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

// Volcano state
const volcano = {
    x: 700,
    baseY: GROUND_Y,
    width: 80,
    height: 100,
    currentHeight: 0,  // Starts at 0, rises to full height
    eruptionParticles: [],
    lavaGlow: 0
};

// Fire trail particles (behind asteroids in volcano mode)
const fireParticles = [];

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
    
    // Update volcano if in volcano mode
    if (volcanoMode) {
        updateVolcano();
        updateFireParticles();
    }
}

function updateVolcano() {
    // Slowly rise the volcano from the ground
    if (volcano.currentHeight < volcano.height) {
        volcano.currentHeight += 0.5; // Rise speed
    }
    
    // Animate lava glow (only when fully risen)
    if (volcano.currentHeight >= volcano.height * 0.8) {
        volcano.lavaGlow = 0.5 + Math.sin(frameCount * 0.1) * 0.3;
    }
    
    // Spawn eruption particles only when volcano is mostly risen
    if (volcano.currentHeight >= volcano.height * 0.9 && Math.random() < 0.15) {
        volcano.eruptionParticles.push({
            x: volcano.x + volcano.width / 2 + (Math.random() - 0.5) * 20,
            y: volcano.baseY - volcano.currentHeight,
            vx: (Math.random() - 0.5) * 3,
            vy: -3 - Math.random() * 4,
            life: 40 + Math.random() * 30,
            maxLife: 70,
            size: 4 + Math.random() * 6,
            type: Math.random() < 0.7 ? 'fire' : 'rock'
        });
    }
    
    // Update eruption particles
    for (let i = volcano.eruptionParticles.length - 1; i >= 0; i--) {
        const p = volcano.eruptionParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // Gravity
        p.life--;
        
        if (p.life <= 0 || p.y > GROUND_Y) {
            volcano.eruptionParticles.splice(i, 1);
        }
    }
}

function updateFireParticles() {
    // Spawn fire behind each asteroid
    asteroids.forEach(asteroid => {
        if (Math.random() < 0.4) {
            fireParticles.push({
                x: asteroid.x + asteroid.width / 2 + (Math.random() - 0.5) * 10,
                y: asteroid.y - asteroid.height / 2 + (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 2,
                vy: -1 - Math.random() * 2,
                life: 15 + Math.random() * 10,
                maxLife: 25,
                size: 3 + Math.random() * 5
            });
        }
    });
    
    // Update fire particles
    for (let i = fireParticles.length - 1; i >= 0; i--) {
        const p = fireParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.size *= 0.95;
        
        if (p.life <= 0) {
            fireParticles.splice(i, 1);
        }
    }
}

function drawVolcano() {
    if (!volcanoMode || volcano.currentHeight <= 0) return;
    
    // Draw volcano mountain (using currentHeight for rising animation)
    ctx.fillStyle = '#3d3d3d';
    ctx.beginPath();
    ctx.moveTo(volcano.x, volcano.baseY);
    ctx.lineTo(volcano.x + volcano.width / 2 - 15, volcano.baseY - volcano.currentHeight);
    ctx.lineTo(volcano.x + volcano.width / 2 + 15, volcano.baseY - volcano.currentHeight);
    ctx.lineTo(volcano.x + volcano.width, volcano.baseY);
    ctx.closePath();
    ctx.fill();
    
    // Draw crater glow only when mostly risen (grey/white)
    if (volcano.currentHeight >= volcano.height * 0.8) {
        const gradient = ctx.createRadialGradient(
            volcano.x + volcano.width / 2, volcano.baseY - volcano.currentHeight + 5,
            5,
            volcano.x + volcano.width / 2, volcano.baseY - volcano.currentHeight + 5,
            25
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${volcano.lavaGlow})`);
        gradient.addColorStop(0.5, `rgba(200, 200, 200, ${volcano.lavaGlow * 0.5})`);
        gradient.addColorStop(1, 'rgba(150, 150, 150, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(volcano.x + volcano.width / 2, volcano.baseY - volcano.currentHeight + 5, 25, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw eruption particles (grey tones)
    volcano.eruptionParticles.forEach(p => {
        const alpha = p.life / p.maxLife;
        if (p.type === 'fire') {
            // Light grey "smoke/ash"
            const grey = 180 + Math.floor(Math.random() * 50);
            ctx.fillStyle = `rgba(${grey}, ${grey}, ${grey}, ${alpha})`;
        } else {
            // Dark grey rocks
            ctx.fillStyle = `rgba(60, 60, 60, ${alpha})`;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawFireTrails() {
    if (!volcanoMode) return;
    
    fireParticles.forEach(p => {
        const alpha = p.life / p.maxLife;
        // Grey smoke trail (lighter when fresh, darker as it fades)
        const grey = Math.floor(150 + (100 * alpha));
        ctx.fillStyle = `rgba(${grey}, ${grey}, ${grey}, ${alpha * 0.7})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawBackground() {
    // Draw volcano behind everything if active
    drawVolcano();
    
    // Draw clouds (darker in volcano mode)
    ctx.fillStyle = volcanoMode ? '#b0b0b0' : '#e0e0e0';
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

// Track cacti that have been checked for near miss (to avoid double bonus)
const passedCacti = new Set();

function checkCollisions() {
    const playerHitbox = player.getHitbox();
    const umbrellaHitbox = player.getUmbrellaHitbox();
    
    // Check cactus collisions and near misses
    for (let i = cacti.length - 1; i >= 0; i--) {
        const cactus = cacti[i];
        
        // Check for collision
        if (checkCollision(playerHitbox, cactus)) {
            return true; // Game over
        }
        
        // Check for near miss bonus (player just cleared the cactus)
        // Player must be jumping, cactus must be passing under, and very close clearance
        if (player.isJumping && !passedCacti.has(i)) {
            const playerBottom = playerHitbox.y + playerHitbox.height;
            const cactusTop = cactus.y;
            const horizontalOverlap = playerHitbox.x < cactus.x + cactus.width && 
                                      playerHitbox.x + playerHitbox.width > cactus.x;
            
            // If player is directly above cactus with small clearance (within 25 pixels)
            if (horizontalOverlap && playerBottom < cactusTop && cactusTop - playerBottom < 25) {
                passedCacti.add(i);
                const bonus = 25;
                score += bonus;
                createBonusText(cactus.x + cactus.width / 2, cactus.y - 20, 'CLOSE! +' + bonus, '#333');
            }
        }
        
        // Clean up passed cacti tracking when cactus goes off screen
        if (cactus.x + cactus.width < 0) {
            passedCacti.delete(i);
        }
    }
    
    // Check asteroid collisions
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const asteroid = asteroids[i];
        
        // Check if umbrella blocks asteroid
        if (player.isUmbrellaActive && checkCollision(umbrellaHitbox, asteroid)) {
            // Asteroid blocked! Remove it (no points)
            asteroids.splice(i, 1);
            createBlockEffect(asteroid.x + asteroid.width / 2, asteroid.y + asteroid.height / 2);
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
// BONUS TEXT POPUPS
// ============================================
function createBonusText(x, y, text, color) {
    bonusTexts.push({
        x: x,
        y: y,
        text: text,
        color: color,
        life: 60,
        vy: -2
    });
}

function updateBonusTexts() {
    for (let i = bonusTexts.length - 1; i >= 0; i--) {
        const bt = bonusTexts[i];
        bt.y += bt.vy;
        bt.vy *= 0.95;
        bt.life--;
        
        if (bt.life <= 0) {
            bonusTexts.splice(i, 1);
        }
    }
}

function drawBonusTexts() {
    bonusTexts.forEach(bt => {
        const alpha = Math.min(1, bt.life / 30);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = bt.color;
        ctx.font = 'bold 16px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(bt.text, bt.x, bt.y);
    });
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
}

// ============================================
// SCORING
// ============================================
function updateScore() {
    score++;
    
    // Check for level up
    const newLevel = Math.min(MAX_LEVEL, Math.floor(score / POINTS_PER_LEVEL) + 1);
    if (newLevel > currentLevel && currentLevel < MAX_LEVEL) {
        currentLevel = newLevel;
        levelUpAnimation = 120; // 2 seconds of animation
        createBonusText(canvas.width / 2, 80, 'LEVEL ' + currentLevel, '#222');
        updateLevelDisplay();
    }
    
    // Check for victory (after completing level 10)
    if (!freePlayMode && score >= WIN_SCORE) {
        victory();
        return;
    }
    
    // Activate volcano mode at score 500
    if (!volcanoMode && score >= VOLCANO_SCORE) {
        volcanoMode = true;
        createBonusText(canvas.width / 2, canvas.height / 2, 'VOLCANO MODE!', '#222');
    }
    
    // Format score with leading zeros
    currentScoreEl.textContent = score.toString().padStart(5, '0');
    
    // Update high score if beaten
    if (score > highScore) {
        highScore = score;
        highScoreEl.textContent = highScore.toString().padStart(5, '0');
        localStorage.setItem('dinoHighScore', highScore);
    }
}

function updateLevelDisplay() {
    const levelEl = document.getElementById('levelDisplay');
    if (levelEl) {
        if (freePlayMode) {
            levelEl.textContent = 'FREE PLAY';
        } else {
            levelEl.textContent = 'LV ' + currentLevel;
        }
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
    // Check if any asteroid is falling above the player
    for (const asteroid of asteroids) {
        if (asteroid.x > player.x - 40 && 
            asteroid.x < player.x + 60 && 
            asteroid.y < GROUND_Y) {
            return true;
        }
    }
    return false;
}

function manageSpawns() {
    // Early game (first 20 seconds / 1200 frames) - easier spawning
    const isEarlyGame = frameCount < 1200;
    
    // Spawn cacti - interval decreases as speed increases
    // In early game, add extra spacing between cacti
    let cactusInterval = Math.max(50, 140 - gameSpeed * 6);
    if (isEarlyGame) {
        cactusInterval += 40; // Extra spacing in first 20 seconds
    }
    if (frameCount - lastCactusSpawn > cactusInterval + Math.random() * 80) {
        spawnCactus();
        lastCactusSpawn = frameCount;
    }
    
    // Spawn asteroids - starts easy, ramps up over time
    // Don't spawn asteroid if:
    // 1. There's a cactus in the jump zone (would require jumping + umbrella simultaneously)
    // 2. There's already an asteroid threatening the player
    
    // Difficulty scaling based on time played (frameCount)
    // Start very easy, ramp up gradually
    const difficultyProgress = Math.min(1, frameCount / 3000); // Takes ~50 seconds to reach max difficulty
    
    // Min interval: starts at 120, goes down to 40 at max difficulty
    const minAsteroidInterval = Math.max(40, 120 - difficultyProgress * 80);
    
    // Spawn chance: starts at 0.01 (1%), goes up to 0.08 (8%) at max difficulty  
    const asteroidChance = 0.01 + difficultyProgress * 0.07;
    
    const canSpawnAsteroid = 
        frameCount > 600 && // No asteroids for first 10 seconds
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
        
        // Update level up animation
        if (levelUpAnimation > 0) {
            levelUpAnimation--;
        }
        
        // Increase difficulty over time
        gameSpeed = Math.min(MAX_SPEED, BASE_SPEED + frameCount * SPEED_INCREMENT);
        
        // Update game objects
        player.update();
        updateCacti();
        updateAsteroids();
        updateBackground();
        updateParticles();
        updateBonusTexts();
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
    drawFireTrails(); // Draw fire behind asteroids
    drawCacti();
    drawAsteroids();
    player.draw();
    drawParticles();
    drawBonusTexts();
    drawLevelUpAnimation();
    
    // Continue game loop
    requestAnimationFrame(gameLoop);
}

function drawLevelUpAnimation() {
    if (levelUpAnimation <= 0) return;
    
    // Flash effect for level up
    const alpha = Math.sin(levelUpAnimation * 0.2) * 0.3;
    if (alpha > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
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
    volcanoMode = false;
    currentLevel = 1;
    freePlayMode = false;
    levelUpAnimation = 0;
    
    // Clear obstacles
    cacti.length = 0;
    asteroids.length = 0;
    particles.length = 0;
    bonusTexts.length = 0;
    fireParticles.length = 0;
    volcano.eruptionParticles.length = 0;
    volcano.currentHeight = 0;
    volcano.lavaGlow = 0;
    passedCacti.clear();
    
    // Reset player
    player.reset();
    
    // Update UI
    currentScoreEl.textContent = '00000';
    highScoreEl.textContent = highScore.toString().padStart(5, '0');
    updateLevelDisplay();
    
    // Hide all screens
    startScreen.style.display = 'none';
    gameOverScreen.classList.add('hidden');
    const pauseScreen = document.getElementById('pause-screen');
    if (pauseScreen) pauseScreen.classList.add('hidden');
    const victoryScreen = document.getElementById('victory-screen');
    if (victoryScreen) victoryScreen.classList.add('hidden');
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

function victory() {
    gameState = 'victory';
    
    // Show victory screen
    const victoryScreen = document.getElementById('victory-screen');
    if (victoryScreen) {
        document.getElementById('victoryScore').textContent = score;
        victoryScreen.classList.remove('hidden');
    }
}

function continueFreePlay() {
    freePlayMode = true;
    gameState = 'playing';
    updateLevelDisplay();
    
    // Hide victory screen
    const victoryScreen = document.getElementById('victory-screen');
    if (victoryScreen) {
        victoryScreen.classList.add('hidden');
    }
}

function togglePause() {
    if (gameState === 'playing') {
        gameState = 'paused';
        const pauseScreen = document.getElementById('pause-screen');
        if (pauseScreen) {
            pauseScreen.classList.remove('hidden');
        }
    } else if (gameState === 'paused') {
        gameState = 'playing';
        const pauseScreen = document.getElementById('pause-screen');
        if (pauseScreen) {
            pauseScreen.classList.add('hidden');
        }
    }
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
        } else if (gameState === 'paused') {
            togglePause(); // Unpause with space
        }
    }
    
    // Umbrella key: U
    if (e.code === 'KeyU') {
        keys.umbrella = true;
    }
    
    // Pause key: P
    if (e.code === 'KeyP') {
        if (gameState === 'playing' || gameState === 'paused') {
            togglePause();
        }
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
    
    // Initialize touch controls if on touch device
    initTouchControls();
    
    // Start game loop
    gameLoop();
}

// ============================================
// MOBILE TOUCH CONTROLS
// ============================================
function initTouchControls() {
    const btnJump = document.getElementById('btn-jump');
    const btnUmbrella = document.getElementById('btn-umbrella');
    const btnStart = document.getElementById('btn-start');
    const btnRestart = document.getElementById('btn-restart');
    
    // START button - tap to start game
    if (btnStart) {
        btnStart.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (gameState === 'start') {
                startGame();
            }
        }, { passive: false });
        
        btnStart.addEventListener('click', (e) => {
            e.preventDefault();
            if (gameState === 'start') {
                startGame();
            }
        });
    }
    
    // RESTART button - tap to restart game
    if (btnRestart) {
        btnRestart.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (gameState === 'gameover') {
                restartGame();
            }
        }, { passive: false });
        
        btnRestart.addEventListener('click', (e) => {
            e.preventDefault();
            if (gameState === 'gameover') {
                restartGame();
            }
        });
    }
    
    if (!btnJump || !btnUmbrella) return;
    
    // JUMP button - tap to jump (same as Space/J)
    btnJump.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys.jump = true;
        
        // Handle game state transitions (same as keyboard)
        if (gameState === 'start') {
            startGame();
        } else if (gameState === 'gameover') {
            restartGame();
        }
    }, { passive: false });
    
    btnJump.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys.jump = false;
    }, { passive: false });
    
    btnJump.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        keys.jump = false;
    }, { passive: false });
    
    // UMBRELLA button - hold to use (same as holding U)
    btnUmbrella.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys.umbrella = true;
    }, { passive: false });
    
    btnUmbrella.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys.umbrella = false;
    }, { passive: false });
    
    btnUmbrella.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        keys.umbrella = false;
    }, { passive: false });
    
    // PAUSE button
    const btnPause = document.getElementById('btn-pause');
    if (btnPause) {
        btnPause.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (gameState === 'playing' || gameState === 'paused') {
                togglePause();
            }
        }, { passive: false });
        
        btnPause.addEventListener('click', (e) => {
            e.preventDefault();
            if (gameState === 'playing' || gameState === 'paused') {
                togglePause();
            }
        });
    }
    
    // RESUME button (on pause screen)
    const btnResume = document.getElementById('btn-resume');
    if (btnResume) {
        btnResume.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (gameState === 'paused') {
                togglePause();
            }
        }, { passive: false });
        
        btnResume.addEventListener('click', (e) => {
            e.preventDefault();
            if (gameState === 'paused') {
                togglePause();
            }
        });
    }
    
    // FREE PLAY button (on victory screen)
    const btnFreePlay = document.getElementById('btn-freeplay');
    if (btnFreePlay) {
        btnFreePlay.addEventListener('touchstart', (e) => {
            e.preventDefault();
            continueFreePlay();
        }, { passive: false });
        
        btnFreePlay.addEventListener('click', (e) => {
            e.preventDefault();
            continueFreePlay();
        });
    }
    
    // PLAY AGAIN button (on victory screen)
    const btnPlayAgain = document.getElementById('btn-playagain');
    if (btnPlayAgain) {
        btnPlayAgain.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startGame();
        }, { passive: false });
        
        btnPlayAgain.addEventListener('click', (e) => {
            e.preventDefault();
            startGame();
        });
    }
}

// Start the game
init();
