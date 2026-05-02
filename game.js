const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const mainMenu = document.getElementById('mainMenu');
const shopMenu = document.getElementById('shopMenu');
const hud = document.getElementById('hud');

const killsDisplay = document.getElementById('killsDisplay');
const timeSurvivedEl = document.getElementById('timeSurvived');
const currentWeaponsEl = document.getElementById('currentWeapons');
const moneyDisplay = document.getElementById('moneyDisplay');
const healthBarFill = document.getElementById('healthBarFill');
const healthText = document.getElementById('healthText');

const shopMoneyEl = document.getElementById('shopMoney');
const resumeBtn = document.getElementById('resumeBtn');
const avatarSelectionContainer = document.getElementById('avatarSelection');

// Shop Tabs
const tabWeapons = document.getElementById('tabWeapons');
const tabSkins = document.getElementById('tabSkins');
const shopWeapons = document.getElementById('shopWeapons');
const shopSkins = document.getElementById('shopSkins');
const weaponsGrid = document.getElementById('weaponsGrid');
const skinsGrid = document.getElementById('skinsGrid');

// Game State
let isPlaying = false;
let isShopOpen = false;
let lastTime = 0;
let timeScale = 0.1; 
let survivalTime = 0; 
let distanceMoved = 0;
let avatarChoice = '👽';
let isAvatarImage = false;
let clockTimer = 0;

// Scaling State
let shopThreshold = 25;
let shopStep = 30;

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

// --- Data ---
const WEAPONS = [
    { id: 'gun', name: 'Gun', icon: '🔫', baseCost: 25 },
    { id: 'staff', name: 'Staff', icon: '🪄', baseCost: 25 },
    { id: 'shotgun', name: 'Shotgun', icon: '💥', baseCost: 25 },
    { id: 'sniper', name: 'Sniper', icon: '🔭', baseCost: 25 },
    { id: 'boomerang', name: 'Boomerang', icon: '🪃', baseCost: 25 },
    { id: 'laser', name: 'Laser', icon: '⚡', baseCost: 25 },
    { id: 'rocket', name: 'Rocket', icon: '🚀', baseCost: 25 },
    { id: 'poison', name: 'Poison', icon: '🧪', baseCost: 25 },
    { id: 'orbs', name: 'Orbs', icon: '🔮', baseCost: 25 },
    { id: 'lightning', name: 'Lightning', icon: '🌩️', baseCost: 25 }
];

const PREMIUM_SKINS = [
    { id: 'dragon', icon: '🐉', price: 500 },
    { id: 'crown', icon: '👑', price: 800 },
    { id: 'lindsey', icon: '<img src="lindsey.png">', isImage: true, price: 1000 },
    { id: 'eagle', icon: '🦅', price: 2000 },
    { id: 'fox', icon: '🦊', price: 2500 },
    { id: 'lion', icon: '🦁', price: 3000 },
    { id: 'rex', icon: '🦖', price: 4000 },
    { id: 'fairy', icon: '🧚', price: 5000 },
    { id: 'genie', icon: '🧞‍♂️', price: 7500 },
    { id: 'villain', icon: '🦹‍♀️', price: 10000 }
];

const ITEM_TYPES = [
    { name: 'Armor', icon: '🛡️', color: '#00ff00', type: 'health' },
    { name: 'Clock', icon: '⏱️', color: '#00ffff', type: 'time' },
    ...WEAPONS.map(w => ({ name: w.name, icon: w.icon, color: '#ffff00', type: 'weapon', id: w.id }))
];

let player = {};
let enemies = [];
let items = [];
let projectiles = [];
let poisons = [];

// Unlocked skins
let unlockedSkins = JSON.parse(localStorage.getItem('unlockedSkins') || '{}');

// Build UI
function initMenu() {
    // Inject Premium Skins
    PREMIUM_SKINS.forEach(skin => {
        const btn = document.createElement('button');
        btn.className = 'avatar-btn';
        btn.innerHTML = skin.icon;
        btn.dataset.id = skin.id;
        if (unlockedSkins[skin.id]) {
            btn.dataset.unlocked = "true";
        } else {
            btn.dataset.unlocked = "false";
            btn.classList.add('locked');
        }
        if (skin.isImage) btn.dataset.type = 'image';
        avatarSelectionContainer.appendChild(btn);
    });

    setupAvatarSelection();
}

let avatarIndex = 0;
let avatarBtns = [];
function setupAvatarSelection() {
    avatarBtns = Array.from(document.querySelectorAll('.avatar-btn'));
    avatarBtns[0].classList.add('selected');

    // Mouse click support
    avatarBtns.forEach((btn, i) => {
        btn.addEventListener('click', () => {
            if (btn.dataset.unlocked === 'true') {
                avatarIndex = i;
                updateAvatarSelection();
                selectAvatarAndStart();
            }
        });
    });
}

function updateAvatarSelection() {
    avatarBtns.forEach(btn => btn.classList.remove('selected'));
    avatarBtns[avatarIndex].classList.add('selected');
}

function selectAvatarAndStart() {
    const btn = avatarBtns[avatarIndex];
    if (btn.dataset.unlocked === 'true') {
        if (btn.dataset.type === 'image') {
            avatarChoice = btn.querySelector('img').src;
            isAvatarImage = true;
        } else {
            avatarChoice = btn.textContent.trim();
            isAvatarImage = false;
        }
        startGame();
    }
}

// Arrow Key Navigation for Main Menu
window.addEventListener('keydown', (e) => {
    if (!isPlaying && !mainMenu.classList.contains('hidden')) {
        const cols = 5;
        if (e.key === 'ArrowRight') {
            avatarIndex = (avatarIndex + 1) % avatarBtns.length;
            updateAvatarSelection();
        } else if (e.key === 'ArrowLeft') {
            avatarIndex = (avatarIndex - 1 + avatarBtns.length) % avatarBtns.length;
            updateAvatarSelection();
        } else if (e.key === 'ArrowDown') {
            avatarIndex = (avatarIndex + cols < avatarBtns.length) ? avatarIndex + cols : avatarIndex;
            updateAvatarSelection();
        } else if (e.key === 'ArrowUp') {
            avatarIndex = (avatarIndex - cols >= 0) ? avatarIndex - cols : avatarIndex;
            updateAvatarSelection();
        } else if (e.key === 'Enter') {
            selectAvatarAndStart();
        }
    }
});

// --- Core Functions ---

function startGame() {
    isPlaying = true;
    isShopOpen = false;
    survivalTime = 0;
    distanceMoved = 0;
    clockTimer = 0;
    
    shopThreshold = 25;
    shopStep = 30;

    let initialWeapons = {};
    WEAPONS.forEach(w => initialWeapons[w.id] = 0);
    
    player = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: 20,
        speed: 300,
        hp: 1,
        money: 0,
        kills: 0,
        weapons: initialWeapons,
        lastShot: {},
        invincibility: 0
    };
    
    enemies = [];
    items = [];
    projectiles = [];
    poisons = [];
    
    mainMenu.classList.add('hidden');
    shopMenu.classList.add('hidden');
    hud.classList.remove('hidden');
    
    updateHUD();
    
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function endGame() {
    isPlaying = false;
    hud.classList.add('hidden');
    mainMenu.classList.remove('hidden');
    setupAvatarSelection(); // Refresh locks just in case
}

// --- Shop Logic ---
tabWeapons.addEventListener('click', () => {
    tabWeapons.classList.add('active'); tabSkins.classList.remove('active');
    shopWeapons.classList.add('active'); shopSkins.classList.remove('active');
});
tabSkins.addEventListener('click', () => {
    tabSkins.classList.add('active'); tabWeapons.classList.remove('active');
    shopSkins.classList.add('active'); shopWeapons.classList.remove('active');
});
resumeBtn.addEventListener('click', () => {
    isShopOpen = false;
    shopMenu.classList.add('hidden');
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
});

function openShop() {
    isShopOpen = true;
    buildShopUI();
    shopMenu.classList.remove('hidden');
}

function buildShopUI() {
    shopMoneyEl.innerText = player.money;
    
    // Build Weapons Shop
    weaponsGrid.innerHTML = '';
    // Armor
    const armorDiv = document.createElement('div');
    armorDiv.className = 'shop-item';
    armorDiv.innerHTML = `
        <div class="shop-icon">🛡️</div>
        <h3>Armor</h3>
        <div class="price">$25</div>
        <button class="buy-btn">Buy</button>
    `;
    const armorBtn = armorDiv.querySelector('.buy-btn');
    armorBtn.disabled = player.money < 25;
    armorBtn.addEventListener('click', () => {
        if (player.money >= 25) {
            player.money -= 25;
            player.hp += 3;
            buildShopUI();
            updateHUD();
        }
    });
    weaponsGrid.appendChild(armorDiv);

    // Weapons
    WEAPONS.forEach(w => {
        const lvl = player.weapons[w.id];
        const cost = 25 + (lvl * 25);
        const div = document.createElement('div');
        div.className = 'shop-item';
        div.innerHTML = `
            <div class="shop-icon">${w.icon}</div>
            <h3>${w.name}</h3>
            <div class="level">Lv.${lvl} -> Lv.${lvl+1}</div>
            <div class="price">$${cost}</div>
            <button class="buy-btn">Upgrade</button>
        `;
        const btn = div.querySelector('.buy-btn');
        btn.disabled = player.money < cost;
        btn.addEventListener('click', () => {
            if (player.money >= cost) {
                player.money -= cost;
                player.weapons[w.id]++;
                buildShopUI();
                updateHUD();
            }
        });
        weaponsGrid.appendChild(div);
    });

    // Build Skins Shop
    skinsGrid.innerHTML = '';
    PREMIUM_SKINS.forEach(s => {
        const div = document.createElement('div');
        div.className = 'shop-item';
        div.innerHTML = `
            <div class="shop-icon" style="width:50px;height:50px;display:flex;justify-content:center;align-items:center;">
                ${s.isImage ? `<img src="${s.icon.match(/src="([^"]+)"/)[1]}" style="width:100%;height:100%;border-radius:5px;object-fit:cover;">` : s.icon}
            </div>
            <h3>${s.id.toUpperCase()}</h3>
            <div class="price">$${s.price}</div>
            <button class="buy-btn">${unlockedSkins[s.id] ? 'Owned' : 'Unlock'}</button>
        `;
        const btn = div.querySelector('.buy-btn');
        if (unlockedSkins[s.id]) {
            btn.disabled = true;
        } else {
            btn.disabled = player.money < s.price;
            btn.addEventListener('click', () => {
                if (player.money >= s.price) {
                    player.money -= s.price;
                    unlockedSkins[s.id] = true;
                    localStorage.setItem('unlockedSkins', JSON.stringify(unlockedSkins));
                    // Update main menu
                    const mainBtn = document.querySelector(`.avatar-btn[data-id="${s.id}"]`);
                    if (mainBtn) {
                        mainBtn.dataset.unlocked = "true";
                        mainMenu.classList.remove('locked');
                    }
                    buildShopUI();
                }
            });
        }
        skinsGrid.appendChild(div);
    });
}

function updateHUD() {
    killsDisplay.innerText = player.kills;
    timeSurvivedEl.innerText = Math.floor(survivalTime);
    moneyDisplay.innerText = player.money;
    
    healthText.innerText = player.hp + " HP";
    const hpPercent = Math.min(100, (player.hp / 10) * 100);
    healthBarFill.style.width = hpPercent + "%";

    let activeWeapons = [];
    WEAPONS.forEach(w => {
        if (player.weapons[w.id] > 0) activeWeapons.push(`${w.name} Lv.${player.weapons[w.id]}`);
    });
    currentWeaponsEl.innerText = activeWeapons.length > 0 ? activeWeapons.join(", ") : "None";
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
    let isMoving = false;
    let dx = 0;
    let dy = 0;

    if (keys['ArrowUp'] || keys['w'] || keys['W']) { dy -= 1; isMoving = true; }
    if (keys['ArrowDown'] || keys['s'] || keys['S']) { dy += 1; isMoving = true; }
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) { dx -= 1; isMoving = true; }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) { dx += 1; isMoving = true; }

    timeScale = isMoving ? 1.0 : 0.1; 

    survivalTime += dt * timeScale;
    if (player.invincibility > 0) player.invincibility -= dt * timeScale;
    if (clockTimer > 0) clockTimer -= dt * timeScale;

    // Move Player
    if (isMoving) {
        const length = Math.sqrt(dx*dx + dy*dy);
        if (length > 0) { dx /= length; dy /= length; }

        const moveAmount = player.speed * dt;
        player.x += dx * moveAmount;
        player.y += dy * moveAmount;
        distanceMoved += moveAmount;

        player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
        player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));

        if (distanceMoved > 250) { 
            distanceMoved = 0;
            if (Math.random() > 0.5) spawnItem();
        }
    }

    // Spawn Enemies (Scaling)
    const baseSpawnRate = 0.03 * timeScale;
    const scaledSpawnRate = baseSpawnRate * (1 + player.kills / 50);
    if (Math.random() < scaledSpawnRate) {
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

        // Poison Damage
        poisons.forEach(puddle => {
            const pDist = Math.hypot(puddle.x - enemy.x, puddle.y - enemy.y);
            if (pDist < puddle.radius + enemy.radius) {
                enemy.hp -= 2 * dt * timeScale; // Damage over time
            }
        });

        if (enemy.hp <= 0) {
            killEnemy(i);
            continue;
        }

        // Collision with player
        if (dist < player.radius + enemy.radius && player.invincibility <= 0) {
            player.hp -= 1;
            player.invincibility = 1.0; 
            updateHUD();
            if (player.hp <= 0) { endGame(); return; }
        }
    }

    // Update Poisons
    for (let i = poisons.length - 1; i >= 0; i--) {
        poisons[i].life -= dt * timeScale;
        if (poisons[i].life <= 0) poisons.splice(i, 1);
    }

    // Update Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.vx * dt * timeScale;
        p.y += p.vy * dt * timeScale;
        p.life -= dt * timeScale;

        // Orbiting Orbs special logic
        if (p.type === 'orb') {
            p.angle += p.speed * dt * timeScale;
            p.x = player.x + Math.cos(p.angle) * p.distance;
            p.y = player.y + Math.sin(p.angle) * p.distance;
        }

        // Boomerang special logic
        if (p.type === 'boomerang') {
            if (p.life < p.maxLife / 2) {
                // Return to player
                const dx = player.x - p.x;
                const dy = player.y - p.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 0) {
                    p.vx = (dx / dist) * p.speed;
                    p.vy = (dy / dist) * p.speed;
                }
                if (dist < player.radius) { p.life = 0; } // caught
            }
        }

        if (p.life <= 0) {
            if (p.type === 'rocket') {
                // AoE Explosion
                enemies.forEach((e, ei) => {
                    if (Math.hypot(e.x - p.x, e.y - p.y) < p.radius * 5) {
                        e.hp -= p.damage;
                        if (e.hp <= 0) killEnemy(ei);
                    }
                });
            }
            projectiles.splice(i, 1);
            continue;
        }

        for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            const dist = Math.hypot(p.x - e.x, p.y - e.y);
            if (dist < p.radius + e.radius) {
                e.hp -= p.damage || 1;
                if (e.hp <= 0) killEnemy(j);
                
                if (p.type === 'rocket') {
                    p.life = 0; // Trigger explosion next frame
                } else if (!p.pierce && p.type !== 'orb') {
                    projectiles.splice(i, 1);
                    break;
                }
            }
        }
    }

    // Items
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        item.life -= dt * timeScale;
        if (item.life <= 0) { items.splice(i, 1); continue; }

        if (Math.hypot(player.x - item.x, player.y - item.y) < player.radius + item.radius) {
            if (item.type.type === 'weapon') {
                if (player.weapons[item.type.id] === 0) {
                    player.weapons[item.type.id] = 1; // Unlocks it
                }
            } else if (item.type.name === 'Armor') {
                player.hp += 3;
            } else if (item.type.name === 'Clock') {
                clockTimer = 5.0; 
            }
            items.splice(i, 1);
            updateHUD();
        }
    }

    // Check Shop Trigger
    if (player.kills >= shopThreshold) {
        openShop();
        shopThreshold += shopStep;
        shopStep += 5; // Scale difficulty of getting to shop
    }

    // Weapons Auto-Fire
    if (enemies.length > 0) {
        let nearest = enemies[0];
        let minDist = Math.hypot(player.x - nearest.x, player.y - nearest.y);
        for (let i = 1; i < enemies.length; i++) {
            const d = Math.hypot(player.x - enemies[i].x, player.y - enemies[i].y);
            if (d < minDist) { minDist = d; nearest = enemies[i]; }
        }
        const angleToNearest = Math.atan2(nearest.y - player.y, nearest.x - player.x);

        // Gun
        let lvl = player.weapons.gun;
        if (lvl > 0 && survivalTime - (player.lastShot.gun || 0) > 0.5 / (1 + 0.25 * (lvl - 1))) {
            fireProjectile(player.x, player.y, angleToNearest, 800, 5, '#ffff00', 2, false);
            player.lastShot.gun = survivalTime;
        }

        // Staff
        lvl = player.weapons.staff;
        if (lvl > 0 && survivalTime - (player.lastShot.staff || 0) > 1.5) {
            const spread = 0.4;
            const startAngle = angleToNearest - (spread * (lvl - 1)) / 2;
            for (let i = 0; i < lvl; i++) {
                fireProjectile(player.x, player.y, startAngle + i * spread, 400, 15, '#ff00ff', 3, true);
            }
            player.lastShot.staff = survivalTime;
        }

        // Shotgun
        lvl = player.weapons.shotgun;
        if (lvl > 0 && survivalTime - (player.lastShot.shotgun || 0) > 1.0 / (1 + 0.1 * lvl)) {
            for (let i = 0; i < 5 + Math.floor(lvl/2); i++) {
                const spread = (Math.random() - 0.5) * 1.5;
                fireProjectile(player.x, player.y, angleToNearest + spread, 600, 4, '#ffaa00', 0.5, false, 2);
            }
            player.lastShot.shotgun = survivalTime;
        }

        // Sniper
        lvl = player.weapons.sniper;
        if (lvl > 0 && survivalTime - (player.lastShot.sniper || 0) > 2.0 / (1 + 0.2 * lvl)) {
            fireProjectile(player.x, player.y, angleToNearest, 1500, 3, '#ffffff', 2, true, 5 + lvl);
            player.lastShot.sniper = survivalTime;
        }

        // Boomerang
        lvl = player.weapons.boomerang;
        if (lvl > 0 && survivalTime - (player.lastShot.boomerang || 0) > 2.0) {
            for (let i = 0; i < lvl; i++) {
                projectiles.push({
                    type: 'boomerang', x: player.x, y: player.y,
                    vx: Math.cos(angleToNearest) * 500, vy: Math.sin(angleToNearest) * 500, speed: 500,
                    radius: 12, color: '#00aaff', life: 2, maxLife: 2, pierce: true, damage: 2
                });
            }
            player.lastShot.boomerang = survivalTime;
        }

        // Laser
        lvl = player.weapons.laser;
        if (lvl > 0 && survivalTime - (player.lastShot.laser || 0) > 1.5 / lvl) {
            nearest.hp -= 5 + lvl;
            if (nearest.hp <= 0) killEnemy(enemies.indexOf(nearest));
            // Visual only projectile (short life)
            projectiles.push({ type: 'laser', x: nearest.x, y: nearest.y, vx:0, vy:0, radius: 2, color: 'cyan', life: 0.1, damage: 0 });
            player.lastShot.laser = survivalTime;
        }

        // Rocket
        lvl = player.weapons.rocket;
        if (lvl > 0 && survivalTime - (player.lastShot.rocket || 0) > 2.5) {
            projectiles.push({
                type: 'rocket', x: player.x, y: player.y,
                vx: Math.cos(angleToNearest) * 300, vy: Math.sin(angleToNearest) * 300,
                radius: 8, color: '#ff4400', life: 3, pierce: false, damage: 3 + lvl
            });
            player.lastShot.rocket = survivalTime;
        }

        // Poison
        lvl = player.weapons.poison;
        if (lvl > 0 && survivalTime - (player.lastShot.poison || 0) > 2.0 / lvl) {
            poisons.push({ x: player.x, y: player.y, radius: 40 + lvl * 10, life: 5 });
            player.lastShot.poison = survivalTime;
        }

        // Lightning
        lvl = player.weapons.lightning;
        if (lvl > 0 && survivalTime - (player.lastShot.lightning || 0) > 3.0 / lvl) {
            const target = enemies[Math.floor(Math.random() * enemies.length)];
            target.hp -= 10;
            if (target.hp <= 0) killEnemy(enemies.indexOf(target));
            // Visual
            projectiles.push({ type: 'lightning', x: target.x, y: target.y, vx:0, vy:0, radius: 20, color: 'yellow', life: 0.2, damage: 0 });
            player.lastShot.lightning = survivalTime;
        }
    }

    // Orbs Continuous
    let lvl = player.weapons.orbs;
    if (lvl > 0) {
        // Clear old orbs
        projectiles = projectiles.filter(p => p.type !== 'orb');
        const numOrbs = lvl + 1;
        for (let i = 0; i < numOrbs; i++) {
            projectiles.push({
                type: 'orb', x: player.x, y: player.y, vx: 0, vy: 0,
                radius: 10, color: '#aa00ff', life: 100, pierce: true, damage: 0.5,
                angle: (Math.PI * 2 / numOrbs) * i + (survivalTime * 2), distance: 80, speed: 2
            });
        }
    }
}

function fireProjectile(x, y, angle, speed, radius, color, life, pierce, damage = 1) {
    projectiles.push({
        type: 'normal', x, y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        radius, color, life, pierce, damage
    });
}

function killEnemy(index) {
    if (index > -1 && index < enemies.length) {
        enemies.splice(index, 1);
        player.kills++;
        player.money++;
        updateHUD();
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

    let hp = 1;
    let speed = 100 + Math.random() * 50;
    let radius = 18;
    let icon = '🕵️';

    // Scaling Enemy Types
    if (player.kills > 50 && Math.random() < 0.2) {
        icon = '👹'; // Brute
        hp = 5;
        speed = 60;
        radius = 25;
    } else if (player.kills > 100 && Math.random() < 0.2) {
        icon = '🥷'; // Assassin
        hp = 2;
        speed = 200;
    }

    enemies.push({ x, y, radius, speed, hp, maxHp: hp, icon });
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
const imgCache = {};
function getCachedImage(src) {
    if (!imgCache[src]) {
        const img = new Image();
        img.src = src;
        imgCache[src] = img;
    }
    return imgCache[src];
}

function draw() {
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.1)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Poisons
    poisons.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
        ctx.fillStyle = `rgba(0, 255, 0, ${0.3 * (p.life/5)})`;
        ctx.fill();
    });

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
        if (p.type === 'laser') {
            ctx.beginPath();
            ctx.moveTo(player.x, player.y);
            ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 5;
            ctx.stroke();
            return;
        }
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    enemies.forEach(enemy => {
        ctx.font = `${enemy.radius * 1.5}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(enemy.icon, enemy.x, enemy.y);
        
        // Enemy Health Bar
        if (enemy.hp < enemy.maxHp) {
            ctx.fillStyle = 'red';
            ctx.fillRect(enemy.x - 15, enemy.y - enemy.radius - 10, 30, 4);
            ctx.fillStyle = 'lime';
            ctx.fillRect(enemy.x - 15, enemy.y - enemy.radius - 10, 30 * (enemy.hp / enemy.maxHp), 4);
        }
    });

    // Draw Player
    if (player.invincibility <= 0 || Math.floor(survivalTime * 10) % 2 === 0) {
        if (timeScale > 0.5) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00f0ff';
        }
        if (isAvatarImage) {
            const img = getCachedImage(avatarChoice);
            if (img.complete) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(player.x, player.y, player.radius, 0, Math.PI*2);
                ctx.clip();
                ctx.drawImage(img, player.x - player.radius, player.y - player.radius, player.radius*2, player.radius*2);
                ctx.restore();
            }
        } else {
            ctx.font = "32px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(avatarChoice, player.x, player.y);
        }
        ctx.shadowBlur = 0;
    }
}

initMenu();
