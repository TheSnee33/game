const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const mainMenu = document.getElementById('mainMenu');
const gameOverScreen = document.getElementById('gameOver');
const shopMenu = document.getElementById('shopMenu');
const hud = document.getElementById('hud');

const killsDisplay = document.getElementById('killsDisplay');
const timeSurvivedEl = document.getElementById('timeSurvived');
const currentWeaponsEl = document.getElementById('currentWeapons');
const moneyDisplay = document.getElementById('moneyDisplay');
const healthBarFill = document.getElementById('healthBarFill');
const healthText = document.getElementById('healthText');

const shopMoneyEl = document.getElementById('shopMoney');
const finalTimeEl = document.getElementById('finalTime');
const finalKillsEl = document.getElementById('finalKills');

const avatarBtns = document.querySelectorAll('.avatar-btn');
const restartBtn = document.getElementById('restartBtn');
const resumeBtn = document.getElementById('resumeBtn');

const buyGunBtn = document.getElementById('buyGunBtn');
const buyStaffBtn = document.getElementById('buyStaffBtn');
const buyArmorBtn = document.getElementById('buyArmorBtn');

// Game State
let isPlaying = false;
let isShopOpen = false;
let lastTime = 0;
let timeScale = 0.1; 
let survivalTime = 0; 
let distanceMoved = 0;
let avatarChoice = '👽';
let lastShopKillCount = 0;
let clockTimer = 0;

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

let player = {};
let enemies = [];
let items = [];
let projectiles = [];

const ITEM_TYPES = [
    { name: 'Gun', icon: '🔫', color: '#ffff00' },
    { name: 'Staff', icon: '🪄', color: '#ff00ff' },
    { name: 'Armor', icon: '🛡️', color: '#00ff00' },
    { name: 'Clock', icon: '⏱️', color: '#00ffff' }
];

// --- Core Functions ---

function startGame(avatar) {
    avatarChoice = avatar || avatarChoice;
    isPlaying = true;
    isShopOpen = false;
    survivalTime = 0;
    distanceMoved = 0;
    lastShopKillCount = 0;
    clockTimer = 0;
    
    player = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: 20,
        speed: 300,
        color: '#00f0ff',
        hp: 1,
        money: 0,
        kills: 0,
        gunLevel: 0,
        staffLevel: 0,
        lastGunShot: 0,
        lastStaffShot: 0,
        invincibility: 0
    };
    
    enemies = [];
    items = [];
    projectiles = [];
    
    mainMenu.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    shopMenu.classList.add('hidden');
    hud.classList.remove('hidden');
    
    updateHUD();
    
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function endGame() {
    isPlaying = false;
    hud.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    finalTimeEl.innerText = Math.floor(survivalTime);
    finalKillsEl.innerText = player.kills;
}

function openShop() {
    isShopOpen = true;
    shopMoneyEl.innerText = player.money;
    shopMenu.classList.remove('hidden');
}

function closeShop() {
    isShopOpen = false;
    shopMenu.classList.add('hidden');
    lastTime = performance.now(); // Reset time so we don't jump
    requestAnimationFrame(gameLoop);
}

// UI Listeners
avatarBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        startGame(this.textContent.trim());
    });
});

restartBtn.addEventListener('click', () => startGame());
resumeBtn.addEventListener('click', closeShop);

buyGunBtn.addEventListener('click', () => {
    if (player.money >= 25) {
        player.money -= 25;
        player.gunLevel++;
        shopMoneyEl.innerText = player.money;
        updateHUD();
    }
});

buyStaffBtn.addEventListener('click', () => {
    if (player.money >= 25) {
        player.money -= 25;
        player.staffLevel++;
        shopMoneyEl.innerText = player.money;
        updateHUD();
    }
});

buyArmorBtn.addEventListener('click', () => {
    if (player.money >= 25) {
        player.money -= 25;
        player.hp += 3;
        shopMoneyEl.innerText = player.money;
        updateHUD();
    }
});

function updateHUD() {
    killsDisplay.innerText = player.kills;
    timeSurvivedEl.innerText = Math.floor(survivalTime);
    moneyDisplay.innerText = player.money;
    
    healthText.innerText = player.hp + " HP";
    const hpPercent = Math.min(100, (player.hp / 10) * 100);
    healthBarFill.style.width = hpPercent + "%";

    let weapons = [];
    if (player.gunLevel > 0) weapons.push(`Gun (Lv.${player.gunLevel})`);
    if (player.staffLevel > 0) weapons.push(`Staff (Lv.${player.staffLevel})`);
    currentWeaponsEl.innerText = weapons.length > 0 ? weapons.join(", ") : "None";
}

// --- Game Loop ---

function gameLoop(currentTime) {
    if (!isPlaying) return;
    if (isShopOpen) return;

    const dt = (currentTime - lastTime) / 1000; 
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

    timeScale = isMoving ? 1.0 : 0.1; 

    survivalTime += dt * timeScale;
    if (player.invincibility > 0) {
        player.invincibility -= dt * timeScale;
    }
    if (clockTimer > 0) {
        clockTimer -= dt * timeScale; // Using timeScale so it pauses longer when slowmo
    }

    // 2. Move Player
    if (isMoving) {
        const length = Math.sqrt(dx*dx + dy*dy);
        if (length > 0) {
            dx /= length;
            dy /= length;
        }

        const moveAmount = player.speed * dt;
        player.x += dx * moveAmount;
        player.y += dy * moveAmount;
        distanceMoved += moveAmount;

        player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
        player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));

        if (distanceMoved > 250) { 
            distanceMoved = 0;
            if (Math.random() > 0.5) {
                spawnItem();
            }
        }
    }

    // 3. Update Enemies
    if (Math.random() < 0.03 * timeScale) {
        spawnEnemy();
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const edx = player.x - enemy.x;
        const edy = player.y - enemy.y;
        const dist = Math.sqrt(edx*edx + edy*edy);
        
        if (dist > 0 && clockTimer <= 0) {
            enemy.x += (edx / dist) * enemy.speed * dt * timeScale;
            enemy.y += (edy / dist) * enemy.speed * dt * timeScale;
        }

        // Collision with player
        if (dist < player.radius + enemy.radius && player.invincibility <= 0) {
            player.hp -= 1;
            player.invincibility = 1.0; // 1 second i-frames
            updateHUD();
            
            if (player.hp <= 0) {
                endGame();
                return;
            }
        }
    }

    // 4. Update Projectiles & Enemy Kills
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.vx * dt * timeScale;
        p.y += p.vy * dt * timeScale;
        p.life -= dt * timeScale;

        if (p.life <= 0) {
            projectiles.splice(i, 1);
            continue;
        }

        for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            const dist = Math.hypot(p.x - e.x, p.y - e.y);
            if (dist < p.radius + e.radius) {
                enemies.splice(j, 1);
                
                player.kills++;
                player.money++;
                
                if (!p.pierce) {
                    projectiles.splice(i, 1);
                    break;
                }
            }
        }
    }

    // 5. Check Shop Trigger
    if (player.kills > 0 && player.kills % 25 === 0 && player.kills !== lastShopKillCount) {
        lastShopKillCount = player.kills;
        openShop();
    }

    // 6. Update Items & Collision
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        item.life -= dt * timeScale;
        
        if (item.life <= 0) {
            items.splice(i, 1);
            continue;
        }

        const dist = Math.hypot(player.x - item.x, player.y - item.y);
        if (dist < player.radius + item.radius) {
            if (item.type.name === 'Gun') {
                player.gunLevel++;
            } else if (item.type.name === 'Staff') {
                player.staffLevel++;
            } else if (item.type.name === 'Armor') {
                player.hp += 3;
            } else if (item.type.name === 'Clock') {
                clockTimer = 5.0; // Freeze enemies for 5 seconds
            }
            items.splice(i, 1);
        }
    }

    // 7. Auto-fire Weapons
    if (enemies.length > 0) {
        // Find nearest
        let nearest = enemies[0];
        let minDist = Math.hypot(player.x - nearest.x, player.y - nearest.y);
        for (let i = 1; i < enemies.length; i++) {
            const d = Math.hypot(player.x - enemies[i].x, player.y - enemies[i].y);
            if (d < minDist) { minDist = d; nearest = enemies[i]; }
        }

        const angleToNearest = Math.atan2(nearest.y - player.y, nearest.x - player.x);

        // Fire Gun
        if (player.gunLevel > 0) {
            const fireRate = 0.5 / (1 + 0.25 * (player.gunLevel - 1));
            if (survivalTime - player.lastGunShot > fireRate) {
                projectiles.push({
                    x: player.x, y: player.y,
                    vx: Math.cos(angleToNearest) * 800, vy: Math.sin(angleToNearest) * 800,
                    radius: 5, color: '#ffff00', life: 2, pierce: false
                });
                player.lastGunShot = survivalTime;
            }
        }

        // Fire Staff
        if (player.staffLevel > 0) {
            if (survivalTime - player.lastStaffShot > 1.5) {
                const numProjectiles = player.staffLevel;
                const spreadAngle = 0.4; // Radians
                const startAngle = angleToNearest - (spreadAngle * (numProjectiles - 1)) / 2;

                for (let i = 0; i < numProjectiles; i++) {
                    const angle = startAngle + i * spreadAngle;
                    projectiles.push({
                        x: player.x, y: player.y,
                        vx: Math.cos(angle) * 400, vy: Math.sin(angle) * 400,
                        radius: 15, color: '#ff00ff', life: 3, pierce: true
                    });
                }
                player.lastStaffShot = survivalTime;
            }
        }
    }

    updateHUD();
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
        life: 15 
    });
}

// --- Drawing ---

function draw() {
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.1)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    items.forEach(item => {
        ctx.font = "24px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowBlur = 10;
        ctx.shadowColor = item.type.color;
        ctx.fillText(item.type.icon, item.x, item.y);
        ctx.shadowBlur = 0; 
    });

    projectiles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    enemies.forEach(enemy => {
        ctx.font = "28px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(enemy.icon, enemy.x, enemy.y);
    });

    // Draw Player
    if (player.invincibility <= 0 || Math.floor(survivalTime * 10) % 2 === 0) {
        ctx.font = "32px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (timeScale > 0.5) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00f0ff';
        }
        ctx.fillText(avatarChoice, player.x, player.y);
        ctx.shadowBlur = 0;
    }
}
