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
const secretDevBtn = document.getElementById('secretDevBtn');

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
let avatarChoice = 'alien';
let isAvatarImage = false;
let clockTimer = 0;

// Scaling State
let shopThresholds = [25, 55, 90];

// Input
const keys = {};
window.addEventListener('keydown', (e) => { 
    keys[e.key] = true; 
    
    // Shop manual open/close
    if (e.key === 'Enter' && isPlaying) {
        if (!isShopOpen) {
            openShop();
        } else {
            closeShop();
        }
    }
});
window.addEventListener('keyup', (e) => { keys[e.key] = false; });
window.addEventListener('resize', resizeCanvas);

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();

// --- Data ---
const WEAPONS = [
    { id: 'gun', name: 'Gun', icon: '🔫', baseCost: 50 },
    { id: 'staff', name: 'Staff', icon: '🪄', baseCost: 50 },
    { id: 'shotgun', name: 'Shotgun', icon: '💥', baseCost: 50 },
    { id: 'sniper', name: 'Sniper', icon: '🔭', baseCost: 50 },
    { id: 'boomerang', name: 'Boomerang', icon: '🪃', baseCost: 50 },
    { id: 'laser', name: 'Laser', icon: '⚡', baseCost: 50 },
    { id: 'rocket', name: 'Rocket', icon: '🚀', baseCost: 50 },
    { id: 'poison', name: 'Poison', icon: '🧪', baseCost: 50 },
    { id: 'orbs', name: 'Orbs', icon: '🔮', baseCost: 50 },
    { id: 'lightning', name: 'Lightning', icon: '🌩️', baseCost: 50 }
];

const PREMIUM_SKINS = [
    { id: 'dragon', icon: '🐉', price: 500 },
    { id: 'crown', icon: '👑', price: 800 },
    { id: 'eagle', icon: '🦅', price: 1500 },
    { id: 'fox', icon: '🦊', price: 2000 },
    { id: 'lion', icon: '🦁', price: 3000 },
    { id: 'rex', icon: '🦖', price: 4000 },
    { id: 'fairy', icon: '🧚', price: 5000 },
    { id: 'genie', icon: '🧞‍♂️', price: 6000 },
    { id: 'villain', icon: '🦹‍♀️', price: 7500 }
];

// Items include basic weapons for early survival.
const ITEM_TYPES = [
    { name: 'Armor', icon: '🛡️', color: '#00ff00', type: 'health' },
    { name: 'Clock', icon: '⏱️', color: '#00ffff', type: 'time' },
    { name: 'Money', icon: '💰', color: '#ffff00', type: 'money' },
    ...WEAPONS.map(w => ({ name: w.name, icon: w.icon, color: '#ffff00', type: 'weapon', id: w.id }))
];

const AVATAR_ABILITIES = {
    'alien': { name: 'Hover', desc: 'Starts with Laser Lv.1', effect: (p) => p.weapons.laser = 1, onLevelUp: (p) => p.weapons.laser++ },
    'robot': { name: 'Titanium', desc: 'Starts with +10 Armor', effect: (p) => p.hp += 10, onLevelUp: (p) => p.hp += 5 },
    'ghost': { name: 'Ethereal', desc: 'Double Invincibility time', effect: (p) => p.iFrameMult = 2.0, onLevelUp: (p) => p.iFrameMult += 0.5 },
    'cowboy': { name: 'Quickdraw', desc: 'Starts with Gun Lv.2', effect: (p) => p.weapons.gun = 2, onLevelUp: (p) => p.weapons.gun++ },
    'cat': { name: 'Agility', desc: 'Moves 30% faster', effect: (p) => p.speed *= 1.3, onLevelUp: (p) => p.speed += 20 },
    'wizard': { name: 'Magic', desc: 'Starts with Staff Lv.2', effect: (p) => p.weapons.staff = 2, onLevelUp: (p) => p.weapons.staff++ },
    'ninja': { name: 'Sneaky', desc: 'Spies move 20% slower', effect: (p) => p.sneaky = 0.8, onLevelUp: (p) => p.sneaky = Math.max(0.2, p.sneaky - 0.05) },
    'zombie': { name: 'Undead', desc: 'Heals 1 HP every 20 seconds', effect: (p) => p.regen = 20, onLevelUp: (p) => p.regen = Math.max(2, p.regen - 2) },
    'vampire': { name: 'Lifesteal', desc: '2% chance to heal on kill', effect: (p) => p.lifesteal = 0.02, onLevelUp: (p) => p.lifesteal += 0.01 },
    'unicorn': { name: 'Wealthy', desc: 'Starts with $100', effect: (p) => p.money += 100, onLevelUp: (p) => p.money += 50 },
    'dragon': { name: 'Dragon Breath', desc: 'Starts with Staff Lv.3', effect: (p) => p.weapons.staff = 3, onLevelUp: (p) => { p.weapons.staff++; p.hp += 2; } },
    'crown': { name: 'Royalty', desc: 'Earns $2 per kill', effect: (p) => p.moneyMult = 2, onLevelUp: (p) => p.moneyMult += 0.5 },
    'eagle': { name: 'Eagle Eye', desc: 'Starts with Sniper Lv.3', effect: (p) => p.weapons.sniper = 3, onLevelUp: (p) => p.weapons.sniper++ },
    'fox': { name: 'Sly', desc: 'Moves 50% faster', effect: (p) => p.speed *= 1.5, onLevelUp: (p) => { p.speed += 20; p.sneaky -= 0.02; } },
    'lion': { name: 'King', desc: 'Spies have 20% less health', effect: (p) => p.enemyHpMult = 0.8, onLevelUp: (p) => p.enemyHpMult = Math.max(0.2, p.enemyHpMult - 0.05) },
    'rex': { name: 'Prehistoric', desc: 'Starts with Rocket Lv.3', effect: (p) => p.weapons.rocket = 3, onLevelUp: (p) => { p.weapons.rocket++; p.hp += 5; } },
    'fairy': { name: 'Fairy Dust', desc: 'Starts with Orbs Lv.3', effect: (p) => p.weapons.orbs = 3, onLevelUp: (p) => p.weapons.orbs++ },
    'genie': { name: 'Wish', desc: 'Starts with 1 level in EVERY weapon', effect: (p) => { for(let w in p.weapons) p.weapons[w]=1; }, onLevelUp: (p) => { const w = Object.keys(p.weapons); p.weapons[w[Math.floor(Math.random() * w.length)]]++; } },
    'villain': { name: 'Villain', desc: 'Starts with Poison & Lightning Lv.3', effect: (p) => { p.weapons.poison=3; p.weapons.lightning=3; }, onLevelUp: (p) => { p.weapons.poison++; p.weapons.lightning++; } },
    'lindsey': { name: 'Ultimate Survival (Dev AI)', desc: 'Starts with +50 Armor and all Weapons Lv.3', effect: (p) => { p.hp += 50; for(let w in p.weapons) p.weapons[w]=3; }, onLevelUp: (p) => { p.hp += 10; p.speed += 20; p.lifesteal += 0.05; for(let w in p.weapons) p.weapons[w]++; } }
};

const BIOMES = [
    { name: "Forest", bg: '#1e3814', grid: 'rgba(0,255,0,0.1)', icons: ['🌲', '🌳', '🪨'] },
    { name: "Desert", bg: '#d2b48c', grid: 'rgba(200,100,0,0.2)', icons: ['🌵', '🪨'] },
    { name: "Snow", bg: '#e0f7fa', grid: 'rgba(0,0,255,0.1)', icons: ['⛄', '🌲', '🧊'] },
    { name: "Volcanic", bg: '#301010', grid: 'rgba(255,0,0,0.2)', icons: ['🌋', '🪨'] },
    { name: "Cyber", bg: '#100b1a', grid: 'rgba(255,0,255,0.2)', icons: ['🔮', '🕋'] }
];

let player = {};
let enemies = [];
let items = [];
let projectiles = [];
let poisons = [];
let obstacles = [];
let currentBiomeIndex = 0;

// Unlocked skins
let unlockedSkins = JSON.parse(localStorage.getItem('unlockedSkins') || '{}');

// Build UI
function initMenu() {
    // Inject Premium Skins (Lindsey is excluded and handled secretly)
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

    if (unlockedSkins['lindsey']) {
        injectLindseyAvatar();
    }

    updateTooltips();
    setupAvatarSelection();
}

function injectLindseyAvatar() {
    if (document.querySelector('.avatar-btn[data-id="lindsey"]')) return;
    const btn = document.createElement('button');
    btn.className = 'avatar-btn';
    btn.innerHTML = '<img src="lindsey.png" style="width:100%;height:100%;border-radius:5px;object-fit:cover;">';
    btn.dataset.id = 'lindsey';
    btn.dataset.unlocked = "true";
    btn.dataset.type = 'image';
    avatarSelectionContainer.appendChild(btn);
    updateTooltips();
    setupAvatarSelection();
}

function updateTooltips() {
    document.querySelectorAll('.avatar-btn').forEach(btn => {
        const id = btn.dataset.id;
        const ab = AVATAR_ABILITIES[id];
        if (ab) {
            btn.title = `Ability: ${ab.name} - ${ab.desc} (Levels up every 75 kills)`;
        }
    });
}

secretDevBtn.addEventListener('click', () => {
    if (unlockedSkins['lindsey']) {
        alert("Dev testing avatar already unlocked.");
        return;
    }
    const pwd = prompt("Enter Dev Password:");
    if (pwd === "admin") {
        alert("Dev Testing Avatar Unlocked!");
        unlockedSkins['lindsey'] = true;
        localStorage.setItem('unlockedSkins', JSON.stringify(unlockedSkins));
        injectLindseyAvatar();
    } else if (pwd !== null) {
        alert("Incorrect password.");
    }
});

let avatarIndex = 0;
let avatarBtns = [];
function setupAvatarSelection() {
    avatarBtns = Array.from(document.querySelectorAll('.avatar-btn'));
    avatarBtns.forEach(b => b.classList.remove('selected'));
    if (avatarBtns[0]) avatarBtns[0].classList.add('selected');

    // Mouse click support
    avatarBtns.forEach((btn, i) => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', () => {
            if (newBtn.dataset.unlocked === 'true') {
                avatarIndex = i;
                updateAvatarSelection();
                selectAvatarAndStart();
            }
        });
    });
    // re-fetch after cloning
    avatarBtns = Array.from(document.querySelectorAll('.avatar-btn'));
}

function updateAvatarSelection() {
    avatarBtns.forEach(btn => btn.classList.remove('selected'));
    if (avatarBtns[avatarIndex]) avatarBtns[avatarIndex].classList.add('selected');
}

function selectAvatarAndStart() {
    const btn = avatarBtns[avatarIndex];
    if (btn.dataset.unlocked === 'true') {
        avatarChoice = btn.dataset.id;
        isAvatarImage = btn.dataset.type === 'image';
        if (isAvatarImage) {
            avatarChoiceIcon = btn.querySelector('img').src;
        } else {
            avatarChoiceIcon = btn.textContent.trim();
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
let avatarChoiceIcon = '';

function generateObstacles(biome) {
    obstacles = [];
    const numObstacles = 15 + Math.floor(Math.random() * 10);
    for(let i=0; i<numObstacles; i++) {
        let ox, oy, valid;
        let tries = 0;
        do {
            ox = Math.random() * (canvas.width - 100) + 50;
            oy = Math.random() * (canvas.height - 100) + 50;
            // keep away from exact center where player spawns
            const distToPlayer = Math.hypot(ox - canvas.width/2, oy - canvas.height/2);
            valid = distToPlayer > 150;
            
            // keep away from other obstacles
            for(let j=0; j<obstacles.length; j++) {
                if (Math.hypot(ox - obstacles[j].x, oy - obstacles[j].y) < 60) valid = false;
            }
            tries++;
        } while(!valid && tries < 50);
        
        if(valid) {
            obstacles.push({
                x: ox, y: oy,
                radius: 25 + Math.random() * 15,
                icon: biome.icons[Math.floor(Math.random() * biome.icons.length)]
            });
        }
    }
}

function resolveCollision(entity, obj) {
    const dx = entity.x - obj.x;
    const dy = entity.y - obj.y;
    const dist = Math.hypot(dx, dy);
    const minD = entity.radius + obj.radius;
    if (dist < minD && dist > 0) {
        const overlap = minD - dist;
        entity.x += (dx / dist) * overlap;
        entity.y += (dy / dist) * overlap;
    }
}

function startGame() {
    isPlaying = true;
    isShopOpen = false;
    survivalTime = 0;
    distanceMoved = 0;
    clockTimer = 0;
    
    shopThresholds = [25, 55, 90]; 

    let initialWeapons = {};
    WEAPONS.forEach(w => initialWeapons[w.id] = 0);
    initialWeapons['gun'] = 1; // Every avatar starts with a basic pistol to defend themselves
    
    // Completely isolated fresh player state to prevent any 'spreading' of skills from death
    player = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: 20,
        speed: 300,
        hp: 10,
        money: 0,
        kills: 0,
        weapons: JSON.parse(JSON.stringify(initialWeapons)),
        lastShot: {},
        invincibility: 0,
        iFrameMult: 1.0,
        sneaky: 1.0,
        regen: 0,
        regenTimer: 0,
        lifesteal: 0,
        moneyMult: 1,
        enemyHpMult: 1.0,
        avatarLevel: 1,
        currentLevel: 1
    };

    // Apply Avatar Abilities to the fresh player object
    const ab = AVATAR_ABILITIES[avatarChoice];
    if (ab && ab.effect) ab.effect(player);
    
    // Clear all persistent entities
    enemies = [];
    items = [];
    projectiles = [];
    poisons = [];
    
    currentBiomeIndex = 0;
    generateObstacles(BIOMES[currentBiomeIndex]);
    
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
function closeShop() {
    isShopOpen = false;
    shopMenu.classList.add('hidden');
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

resumeBtn.addEventListener('click', closeShop);

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
    const armorCost = 50 + (player.hp * 5); // Armor cost scales up as you get more
    armorDiv.innerHTML = `
        <div class="shop-icon">🛡️</div>
        <h3>Armor</h3>
        <div class="price">$${armorCost}</div>
        <button class="buy-btn">Buy</button>
    `;
    const armorBtn = armorDiv.querySelector('.buy-btn');
    armorBtn.disabled = player.money < armorCost;
    armorBtn.addEventListener('click', () => {
        if (player.money >= armorCost) {
            player.money -= armorCost;
            player.hp += 3;
            buildShopUI();
            updateHUD();
        }
    });
    weaponsGrid.appendChild(armorDiv);

    // Weapons
    WEAPONS.forEach(w => {
        const lvl = player.weapons[w.id];
        const cost = w.baseCost + (lvl * 75); // Steep scaling to prevent quick dominating
        const div = document.createElement('div');
        div.className = 'shop-item';
        div.innerHTML = `
            <div class="shop-icon">${w.icon}</div>
            <h3>${w.name}</h3>
            <div class="level">Lv.${lvl} -> Lv.${lvl+1}</div>
            <div class="price">$${cost}</div>
            <button class="buy-btn">${lvl === 0 ? 'Unlock' : 'Upgrade'}</button>
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
                        mainBtn.classList.remove('locked');
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
    let abText = `Avatar Level: ${player.avatarLevel}`;
    currentWeaponsEl.innerText = `${abText} | ` + (activeWeapons.length > 0 ? activeWeapons.join(", ") : "No Weapons");
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

    // Regen ability
    if (player.regen > 0) {
        player.regenTimer += dt * timeScale;
        if (player.regenTimer >= player.regen) {
            player.hp += 1;
            player.regenTimer = 0;
            updateHUD();
        }
    }

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

        obstacles.forEach(obs => resolveCollision(player, obs));

        // Reduce item spawn rate to make survival harder
        if (distanceMoved > 800) { 
            distanceMoved = 0;
            if (Math.random() > 0.7) spawnItem();
        }
    }

    // Difficulty Scaling Variables
    const level = Math.floor(player.kills / 60) + 1; // Level up faster to increase difficulty quicker
    let weaponPower = 0;
    for (let w in player.weapons) weaponPower += player.weapons[w];

    // Slower base spawn rate for an easier start, but scales MUCH harder
    const baseSpawnRate = 0.005 * timeScale; 
    const scaledSpawnRate = baseSpawnRate * (1 + (level * 0.8) + (weaponPower * 0.15));
    
    if (Math.random() < scaledSpawnRate) {
        spawnEnemy(level, weaponPower);
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const edx = player.x - enemy.x;
        const edy = player.y - enemy.y;
        const dist = Math.sqrt(edx*edx + edy*edy);
        
        if (dist > 0 && clockTimer <= 0) {
            // Apply Sneaky ability (slows down enemies)
            const speedMod = enemy.speed * player.sneaky;
            enemy.x += (edx / dist) * speedMod * dt * timeScale;
            enemy.y += (edy / dist) * speedMod * dt * timeScale;
            obstacles.forEach(obs => resolveCollision(enemy, obs));
        }

        // Poison Damage
        poisons.forEach(puddle => {
            if (enemy.type === 'invader') return; // Immune to poison
            const pDist = Math.hypot(puddle.x - enemy.x, puddle.y - enemy.y);
            if (pDist < puddle.radius + enemy.radius) {
                enemy.hp -= 3 * dt * timeScale; 
            }
        });

        if (enemy.hp <= 0) {
            killEnemy(i);
            continue;
        }

        // Collision with player
        if (dist < player.radius + enemy.radius && player.invincibility <= 0) {
            player.hp -= 1;
            if (enemy.type === 'vampire') {
                enemy.hp = Math.min(enemy.maxHp, enemy.hp + 2); // Vampire heals on hit
            }
            player.invincibility = 1.0 * player.iFrameMult; 
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

        // Orbiting Orbs
        if (p.type === 'orb') {
            p.angle += p.speed * dt * timeScale;
            p.x = player.x + Math.cos(p.angle) * p.distance;
            p.y = player.y + Math.sin(p.angle) * p.distance;
        }

        // Boomerang
        if (p.wType === 'boomerang') {
            if (p.life < p.maxLife / 2) {
                const dx = player.x - p.x;
                const dy = player.y - p.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 0) {
                    p.vx = (dx / dist) * p.speed;
                    p.vy = (dy / dist) * p.speed;
                }
                if (dist < player.radius) { p.life = 0; }
            }
        }

        if (p.life <= 0) {
            if (p.wType === 'rocket' && p.type !== 'explosion') {
                for (let j = enemies.length - 1; j >= 0; j--) {
                    const e = enemies[j];
                    if (Math.hypot(e.x - p.x, e.y - p.y) < p.radius * 5) {
                        e.hp -= p.damage;
                        if (e.hp <= 0) killEnemy(j);
                    }
                }
                // spawn explosion visual
                projectiles.push({ type: 'explosion', wType: 'explosion', x: p.x, y: p.y, vx:0, vy:0, radius: p.radius * 5, life: 0.5, maxLife: 0.5, damage: 0 });
            }
            projectiles.splice(i, 1);
            continue;
        }

        if (p.type === 'explosion') continue; // Explosions don't do collision damage over time, just visuals

        for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            const dist = Math.hypot(p.x - e.x, p.y - e.y);
            if (dist < p.radius + e.radius) {
                e.hp -= p.damage || 1;
                if (e.hp <= 0) killEnemy(j);
                
                if (p.wType === 'rocket') {
                    p.life = 0; 
                } else if (!p.pierce && p.wType !== 'orb') {
                    projectiles.splice(i, 1);
                    break;
                }
            }
        }
    }

    // Items Logic
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        item.life -= dt * timeScale;
        if (item.life <= 0) { items.splice(i, 1); continue; }

        if (Math.hypot(player.x - item.x, player.y - item.y) < player.radius + item.radius) {
            if (item.type.type === 'weapon') {
                if (player.weapons[item.type.id] === 0) {
                    player.weapons[item.type.id] = 1; 
                }
            } else if (item.type.name === 'Armor') {
                player.hp += 3;
            } else if (item.type.name === 'Clock') {
                clockTimer = 5.0; 
            } else if (item.type.type === 'money') {
                player.money += 10 * player.moneyMult;
            }
            items.splice(i, 1);
            updateHUD();
        }
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
            fireProjectile(player.x, player.y, angleToNearest, 800, 5, '#ffff00', 2, false, 2, 'gun');
            player.lastShot.gun = survivalTime;
        }

        // Staff
        lvl = player.weapons.staff;
        if (lvl > 0 && survivalTime - (player.lastShot.staff || 0) > 1.5) {
            const spread = 0.4;
            const startAngle = angleToNearest - (spread * (lvl - 1)) / 2;
            for (let i = 0; i < lvl; i++) {
                fireProjectile(player.x, player.y, startAngle + i * spread, 400, 15, '#ff00ff', 3, true, 1, 'staff');
            }
            player.lastShot.staff = survivalTime;
        }

        // Shotgun
        lvl = player.weapons.shotgun;
        if (lvl > 0 && survivalTime - (player.lastShot.shotgun || 0) > 1.0 / (1 + 0.1 * lvl)) {
            for (let i = 0; i < 5 + Math.floor(lvl/2); i++) {
                const spread = (Math.random() - 0.5) * 1.5;
                fireProjectile(player.x, player.y, angleToNearest + spread, 600, 4, '#ffaa00', 0.5, false, 2, 'shotgun');
            }
            player.lastShot.shotgun = survivalTime;
        }

        // Sniper
        lvl = player.weapons.sniper;
        if (lvl > 0 && survivalTime - (player.lastShot.sniper || 0) > 2.0 / (1 + 0.2 * lvl)) {
            fireProjectile(player.x, player.y, angleToNearest, 1500, 3, '#ffffff', 2, true, 5 + lvl, 'sniper');
            player.lastShot.sniper = survivalTime;
        }

        // Boomerang
        lvl = player.weapons.boomerang;
        if (lvl > 0 && survivalTime - (player.lastShot.boomerang || 0) > 2.0) {
            for (let i = 0; i < lvl; i++) {
                projectiles.push({
                    type: 'normal', wType: 'boomerang', x: player.x, y: player.y,
                    vx: Math.cos(angleToNearest) * 500, vy: Math.sin(angleToNearest) * 500, speed: 500,
                    radius: 15, color: '#00aaff', life: 2, maxLife: 2, pierce: true, damage: 2
                });
            }
            player.lastShot.boomerang = survivalTime;
        }

        // Laser
        lvl = player.weapons.laser;
        if (lvl > 0 && survivalTime - (player.lastShot.laser || 0) > 1.5 / lvl) {
            nearest.hp -= 5 + lvl;
            if (nearest.hp <= 0) killEnemy(enemies.indexOf(nearest));
            projectiles.push({ type: 'laser', wType: 'laser', x: nearest.x, y: nearest.y, vx:0, vy:0, radius: 2, color: 'cyan', life: 0.2, damage: 0 });
            player.lastShot.laser = survivalTime;
        }

        // Rocket
        lvl = player.weapons.rocket;
        if (lvl > 0 && survivalTime - (player.lastShot.rocket || 0) > 2.5) {
            projectiles.push({
                type: 'normal', wType: 'rocket', x: player.x, y: player.y,
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
            if (enemies.length > 0) {
                const target = enemies[Math.floor(Math.random() * enemies.length)];
                target.hp -= 10;
                if (target.hp <= 0) killEnemy(enemies.indexOf(target));
                projectiles.push({ type: 'normal', wType: 'lightning', x: target.x, y: target.y, vx:0, vy:0, radius: 20, color: 'yellow', life: 0.3, damage: 0 });
                player.lastShot.lightning = survivalTime;
            }
        }
    }

    // Orbs Continuous
    let lvl = player.weapons.orbs;
    if (lvl > 0) {
        const numOrbs = lvl + 1;
        let existingOrbs = 0;
        
        // Update existing orbs instead of destroying and recreating them (prevents memory leak stutter)
        for (let i = 0; i < projectiles.length; i++) {
            if (projectiles[i].wType === 'orb') {
                const p = projectiles[i];
                p.angle = (Math.PI * 2 / numOrbs) * existingOrbs + (survivalTime * 2);
                p.x = player.x + Math.cos(p.angle) * p.distance;
                p.y = player.y + Math.sin(p.angle) * p.distance;
                p.life = 100; // Keep alive indefinitely while weapon is owned
                existingOrbs++;
            }
        }
        
        // Push new orbs if we leveled up
        while (existingOrbs < numOrbs) {
            projectiles.push({
                type: 'normal', wType: 'orb', x: player.x, y: player.y, vx: 0, vy: 0,
                radius: 12, color: '#aa00ff', life: 100, pierce: true, damage: 0.5,
                angle: (Math.PI * 2 / numOrbs) * existingOrbs + (survivalTime * 2), distance: 80, speed: 2
            });
            existingOrbs++;
        }
    }
}

function fireProjectile(x, y, angle, speed, radius, color, life, pierce, damage = 1, wType = 'normal') {
    projectiles.push({
        type: 'normal', wType, x, y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        radius, color, life, pierce, damage
    });
}

function killEnemy(index) {
    if (index > -1 && index < enemies.length) {
        const enemy = enemies[index];
        enemies.splice(index, 1);
        player.kills++;
        player.money += 1 * player.moneyMult;
        
        if (enemy.type === 'loot') {
            player.money += 20 * player.moneyMult; // Bonus money for Unicorn Goblin
        }
        
        // Lifesteal ability
        if (player.lifesteal > 0 && Math.random() < player.lifesteal) {
            player.hp += 1;
        }

        // Avatar Level Up (Harder)
        if (player.kills % 150 === 0) {
            player.avatarLevel++;
            const ab = AVATAR_ABILITIES[avatarChoice];
            if (ab && ab.onLevelUp) {
                ab.onLevelUp(player);
            }
        }

        // Level Up Trigger for Biomes (Every 60 kills to match new difficulty ramp)
        const newLevel = Math.floor(player.kills / 60) + 1;
        if (newLevel > player.currentLevel) {
            player.currentLevel = newLevel;
            currentBiomeIndex = (newLevel - 1) % BIOMES.length;
            generateObstacles(BIOMES[currentBiomeIndex]);
        }
        
        updateHUD();
    }
}

function spawnEnemy(level, weaponPower) {
    let x, y;
    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? -30 : canvas.width + 30;
        y = Math.random() * canvas.height;
    } else {
        x = Math.random() * canvas.width;
        y = Math.random() < 0.5 ? -30 : canvas.height + 30;
    }

    let hp = 1 + Math.floor(level * 0.5); // Base health scales up now
    let speed = (130 + Math.random() * 50) * (1 + (level * 0.15) + (weaponPower * 0.03));
    let radius = 18;
    let icon = '🕵️';
    let type = 'normal';

    // Scaling Enemy Types (Appear much more frequently and hit harder)
    if (level > 4 && Math.random() < 0.15) {
        icon = '🤖'; // Terminator
        hp = 15 * (1 + level * 0.8);
        speed *= 0.6;
        radius = 30;
        type = 'terminator';
    } else if (level > 3 && Math.random() < 0.2) {
        icon = '👽'; // Invader (Immune to Poison)
        hp = 8 * (1 + level * 0.5);
        speed *= 0.9;
        radius = 22;
        type = 'invader';
    } else if (level > 2 && Math.random() < 0.25) {
        icon = '🧛'; // Vampire (Heals on hit)
        hp = 5 * (1 + level * 0.4);
        speed *= 1.3;
        type = 'vampire';
    } else if (level > 1 && Math.random() < 0.3) {
        icon = '👹'; // Brute
        hp = 8 * (1 + level * 0.5);
        speed *= 0.7;
        radius = 25;
        type = 'brute';
    } else if (level > 1 && Math.random() < 0.3) {
        icon = '🥷'; // Assassin
        hp = 3 * (1 + level * 0.3);
        speed *= 1.8;
        type = 'assassin';
    } else if (Math.random() < 0.05) {
        icon = '🦄'; // Loot Goblin
        hp = 1;
        speed *= 2.0;
        type = 'loot';
    }

    // Apply Avatar Global Enemy Modifiers
    hp *= player.enemyHpMult;

    enemies.push({ x, y, radius, speed, hp, maxHp: hp, icon, type });
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
    const biome = BIOMES[currentBiomeIndex] || BIOMES[0];
    ctx.fillStyle = biome.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = biome.grid;
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Draw Obstacles
    obstacles.forEach(obs => {
        ctx.font = `${obs.radius * 2}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(obs.icon, obs.x, obs.y + obs.radius/4); // Slight vertical shift to look planted
    });

    // Poisons
    poisons.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
        ctx.fillStyle = `rgba(0, 255, 0, ${0.15 * (p.life/5)})`; // Increased transparency
        ctx.fill();
        
        // Bubbling animation
        ctx.fillStyle = `rgba(50, 255, 50, ${0.5 * (p.life/5)})`;
        for(let i=0; i<3; i++) {
            const bx = p.x + Math.sin(survivalTime * 3 + i) * p.radius * 0.5;
            const by = p.y + Math.cos(survivalTime * 2 + i) * p.radius * 0.5;
            ctx.beginPath(); ctx.arc(bx, by, p.radius * 0.1, 0, Math.PI*2); ctx.fill();
        }
    });

    items.forEach(item => {
        ctx.font = "24px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowBlur = 10;
        ctx.shadowColor = item.type.color;
        
        // Floating item animation
        const floatY = item.y + Math.sin(survivalTime * 4) * 5;
        ctx.fillText(item.type.icon, item.x, floatY);
        ctx.shadowBlur = 0; 
    });

    projectiles.forEach(p => {
        if (p.type === 'laser') {
            ctx.beginPath();
            ctx.moveTo(player.x, player.y);
            ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 5 + Math.sin(survivalTime * 20) * 3; // Pulsing laser
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color;
            ctx.stroke();
            ctx.shadowBlur = 0;
            return;
        }
        
        ctx.save();
        ctx.translate(p.x, p.y);
        
        if (p.wType === 'staff') {
            ctx.font = `${p.radius * 2}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText('🔥', 0, 0);
        } else if (p.wType === 'boomerang') {
            ctx.rotate(survivalTime * 15);
            ctx.font = `${p.radius * 2}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText('🪃', 0, 0);
        } else if (p.wType === 'rocket') {
            const angle = Math.atan2(p.vy, p.vx);
            ctx.rotate(angle + Math.PI/4); // Rotate rocket emoji properly
            ctx.font = `${p.radius * 2.5}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText('🚀', 0, 0);
        } else if (p.wType === 'orb') {
            ctx.rotate(survivalTime * -5);
            ctx.font = `${p.radius * 2}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText('🔮', 0, 0);
        } else if (p.wType === 'explosion') {
            ctx.font = `${p.radius * 2}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.globalAlpha = p.life / p.maxLife; // fade out
            ctx.fillText('💥', 0, 0);
        } else if (p.wType === 'lightning') {
            ctx.beginPath();
            ctx.moveTo(0, -500);
            for(let i=1; i<5; i++) {
                ctx.lineTo((Math.random() - 0.5)*50, -500 + i*100);
            }
            ctx.lineTo(0, 0);
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
            ctx.lineWidth = p.radius / 2;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 0, ${p.life * 2})`;
            ctx.fill();
        } else {
            // Standard generic bullet (Gun, Shotgun, Sniper)
            ctx.rotate(Math.atan2(p.vy, p.vx));
            ctx.beginPath();
            ctx.moveTo(-p.radius, 0);
            ctx.lineTo(p.radius, 0);
            ctx.strokeStyle = p.color;
            ctx.lineWidth = p.radius;
            ctx.lineCap = 'round';
            ctx.stroke();
            
            if (p.wType === 'sniper') {
                ctx.beginPath();
                ctx.moveTo(-p.radius * 15, 0);
                ctx.lineTo(-p.radius, 0);
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = p.radius * 0.8;
                ctx.stroke();
            }
        }
        ctx.restore();
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
            const img = getCachedImage(avatarChoiceIcon);
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
            ctx.fillText(avatarChoiceIcon, player.x, player.y);
        }
        ctx.shadowBlur = 0;
    }
}

initMenu();
