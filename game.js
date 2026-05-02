const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const mainMenu = document.getElementById('mainMenu');
const gameOverScreen = document.getElementById('gameOver');
const hud = document.getElementById('hud');
const timeSurvivedEl = document.getElementById('timeSurvived');
const currentItemEl = document.getElementById('currentItem');
const finalTimeEl = document.getElementById('finalTime');
const avatarBtns = document.querySelectorAll('.avatar-btn');
const restartBtn = document.getElementById('restartBtn');

// Game State
let isPlaying = false;
let lastTime = 0;
let timeScale = 0.1; // Slow motion by default
let survivalTime = 0; // In seconds
let distanceMoved = 0;
let avatarChoice = '👽';

// Input
const keys = {};

window.addEventListener('keydown', (e) => { keys[e.key] = true; });
window.addEventListener('keyup', (e) => { keys[e.key] = false; });
window.addEventListener('resize', resizeCanvas);

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();

// --- Game Objects ---

const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 20,
    speed: 300, // pixels per second
    color: '#00f0ff',
    item: null, // 'Clock', 'Gun', 'Staff'
    lastShotTime: 0
};

let enemies = [];
let items = [];
let projectiles = [];

const ITEM_TYPES = [
    { name: 'Clock', icon: '⏱️', color: '#ffea00' },
    { name: 'Gun', icon: '🔫', color: '#a0a0a0' },
    { name: 'Staff', icon: '🪄', color: '#b500ff' }
];

// --- Core Functions ---

function startGame(avatar) {
    avatarChoice = avatar;
    isPlaying = true;
    survivalTime = 0;
    distanceMoved = 0;
    
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    player.item = null;
    player.lastShotTime = 0;
    
    enemies = [];
    items = [];
    projectiles = [];
    
    mainMenu.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function endGame() {
    isPlaying = false;
    hud.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    finalTimeEl.innerText = Math.floor(survivalTime);
}

// Avatar selection
avatarBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const avatar = btn.querySelector('.avatar-icon').innerText;
        startGame(avatar);
    });
});

restartBtn.addEventListener('click', () => {
    startGame(avatarChoice);
});

// --- Game Loop ---

function gameLoop(currentTime) {
    if (!isPlaying) return;

    const dt = (currentTime - lastTime) / 1000; // Delta time in seconds
    lastTime = currentTime;

    update(dt);
    draw();

    requestAnimationFrame(gameLoop);
}

function update(dt) {
    // 1. Determine Movement and Time Scale
    let isMoving = false;
    let dx = 0;
    let dy = 0;

    if (keys['ArrowUp'] || keys['w'] || keys['W']) { dy -= 1; isMoving = true; }
    if (keys['ArrowDown'] || keys['s'] || keys['S']) { dy += 1; isMoving = true; }
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) { dx -= 1; isMoving = true; }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) { dx += 1; isMoving = true; }

    timeScale = isMoving ? 1.0 : 0.1; // Normal speed when moving, slow otherwise

    survivalTime += dt * timeScale;
    timeSurvivedEl.innerText = Math.floor(survivalTime);

    // 2. Move Player
    if (isMoving) {
        // Normalize
        const length = Math.sqrt(dx*dx + dy*dy);
        if (length > 0) {
            dx /= length;
            dy /= length;
        }

        const moveAmount = player.speed * dt; // Player moves in real-time, unaffected by slow-mo
        player.x += dx * moveAmount;
        player.y += dy * moveAmount;
        
        distanceMoved += moveAmount;

        // Keep player in bounds
        player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
        player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));

        // 50/50 Item Spawn Logic based on movement
        if (distanceMoved > 200) { // Every 200 pixels moved
            distanceMoved = 0;
            if (Math.random() > 0.5) {
                spawnItem();
            }
        }
    }

    // 3. Update Enemies
    // Spawn enemies occasionally
    if (Math.random() < 0.02 * timeScale) {
        spawnEnemy();
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        // Move towards player
        const edx = player.x - enemy.x;
        const edy = player.y - enemy.y;
        const dist = Math.sqrt(edx*edx + edy*edy);
        
        if (dist > 0) {
            enemy.x += (edx / dist) * enemy.speed * dt * timeScale;
            enemy.y += (edy / dist) * enemy.speed * dt * timeScale;
        }

        // Collision with player
        if (dist < player.radius + enemy.radius) {
            endGame();
            return;
        }
    }

    // 4. Update Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.vx * dt * timeScale;
        p.y += p.vy * dt * timeScale;
        p.life -= dt * timeScale;

        if (p.life <= 0) {
            projectiles.splice(i, 1);
            continue;
        }

        // Collision with enemies
        for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            const dist = Math.hypot(p.x - e.x, p.y - e.y);
            if (dist < p.radius + e.radius) {
                // Hit!
                enemies.splice(j, 1);
                // Staff pierces, Gun does not
                if (!p.pierce) {
                    projectiles.splice(i, 1);
                    break;
                }
            }
        }
    }

    // 5. Update Items & Collision
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        item.life -= dt * timeScale;
        
        if (item.life <= 0) {
            items.splice(i, 1);
            continue;
        }

        const dist = Math.hypot(player.x - item.x, player.y - item.y);
        if (dist < player.radius + item.radius) {
            // Pick up item
            if (item.type.name === 'Clock') {
                survivalTime += 10; // Bonus time
            } else {
                player.item = item.type.name;
                currentItemEl.innerText = item.type.name;
            }
            items.splice(i, 1);
        }
    }

    // 6. Combat / Weapons Logic
    if (player.item === 'Gun' || player.item === 'Staff') {
        const fireRate = player.item === 'Gun' ? 0.5 : 1.5; // seconds between shots
        if (survivalTime - player.lastShotTime > fireRate) {
            fireWeapon();
            player.lastShotTime = survivalTime;
        }
    }
}

function fireWeapon() {
    // Find nearest enemy
    if (enemies.length === 0) return;
    
    let nearest = enemies[0];
    let minDist = Math.hypot(player.x - nearest.x, player.y - nearest.y);
    
    for (let i = 1; i < enemies.length; i++) {
        const dist = Math.hypot(player.x - enemies[i].x, player.y - enemies[i].y);
        if (dist < minDist) {
            minDist = dist;
            nearest = enemies[i];
        }
    }

    const dx = nearest.x - player.x;
    const dy = nearest.y - player.y;
    const length = Math.hypot(dx, dy);

    if (player.item === 'Gun') {
        projectiles.push({
            x: player.x, y: player.y,
            vx: (dx/length) * 800, vy: (dy/length) * 800,
            radius: 5, color: '#ffff00', life: 2, pierce: false
        });
    } else if (player.item === 'Staff') {
        projectiles.push({
            x: player.x, y: player.y,
            vx: (dx/length) * 400, vy: (dy/length) * 400,
            radius: 15, color: '#ff5500', life: 3, pierce: true
        });
    }
}

function spawnEnemy() {
    let x, y;
    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? -30 : canvas.width + 30;
        y = Math.random() * canvas.height;
    } else {
        x = Math.random() * canvas.width;
        y = Math.random() < 0.5 ? -30 : canvas.height + 30;
    }

    enemies.push({
        x: x,
        y: y,
        radius: 18,
        speed: 100 + Math.random() * 50,
        icon: '🕵️'
    });
}

function spawnItem() {
    const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
    items.push({
        x: Math.random() * (canvas.width - 100) + 50,
        y: Math.random() * (canvas.height - 100) + 50,
        radius: 15,
        type: type,
        life: 10 // seconds before it disappears
    });
}

// --- Drawing ---

function draw() {
    // Background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid (Vibrant)
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.1)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Draw Items
    items.forEach(item => {
        ctx.font = "24px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        // Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = item.type.color;
        ctx.fillText(item.type.icon, item.x, item.y);
        ctx.shadowBlur = 0; // reset
    });

    // Draw Projectiles
    projectiles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    // Draw Enemies
    enemies.forEach(enemy => {
        ctx.font = "28px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(enemy.icon, enemy.x, enemy.y);
    });

    // Draw Player
    ctx.font = "32px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Player glow depending on time scale
    if (timeScale > 0.5) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00f0ff';
    }
    ctx.fillText(avatarChoice, player.x, player.y);
    ctx.shadowBlur = 0;
}
