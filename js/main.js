import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { buildLevel, LEVELS } from './world.js';
import { createEnemyTexture, createWallDecoration } from './assets.js';
import { playSound, initAudio, startMusic, stopMusic, startAmbient, stopAmbient, playPositionalSound, setReverb } from './sounds.js';

Math.lerp = (a, b, t) => a + (b - a) * t;

var levelMissions = [
    '- Rensa Riksdagshuset\n- Hitta utgangen',
    '- Besegra Ebba Busch\n- Ta dig genom Propagandafabriken',
    '- Slutdebatt med Jimmie Akesson\n- Radda demokratin',
    '- Utforska Det Stora Biblioteket\n- Besegra Lars Werner',
    '- Infiltrera Rosenbads Serverhall\n- Forstora deras natverk',
    '- Slutstriden i Slottstradgarden\n- Besegra alla bossar'
];

const state = {
    health: 100, ammo: 50, dead: false, level: 0,
    weapon: 1, inventory: [1],
    kills: 0, shotsFired: 0, shotsHit: 0, gameTime: 0, playing: false,
    armor: 0, speedBoost: 0, combo: 0, comboTimer: 0, score: 0,
    ammoType: 0, ngPlus: false,
    lives: 3,
    // Mission tracking
    levelStartEnemyCount: 0,
    levelKills: 0,
    levelTime: 0,
    missionBossNoDamage: true,
    secretFound: false,
    // Phase 2: Key inventory
    keys: new Set(),
    // Phase 4: Replayability
    damageTaken: 0,
    maxCombo: 0,
    arcadeMode: false,
    arcadeWave: 0,
    arcadeScore: 0,
    modifiers: { bigHead: false, fastEnemies: false, pistolOnly: false }
};

const CRTShader = {
    uniforms: { "tDiffuse": { value: null }, "time": { value: 0 } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    // Simplified: removed RGB separation (chromatic aberration) — saves 2 texture fetches/pixel
    fragmentShader: `uniform sampler2D tDiffuse; uniform float time; varying vec2 vUv;
        void main() { vec2 uv = vUv;
            float scanline = sin(uv.y * 800.0 + time * 10.0) * 0.04;
            vec3 col = texture2D(tDiffuse, uv).rgb;
            float vig = (0.8 + 0.2*16.0*uv.x*uv.y*(1.0-uv.x)*(1.0-uv.y));
            gl_FragColor = vec4(col * vig - scanline, 1.0); }`
};

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;
document.body.appendChild(renderer.domElement);

const renderScene = new RenderPass(scene, camera);
var halfRes = new THREE.Vector2(Math.floor(window.innerWidth / 2), Math.floor(window.innerHeight / 2));
const bloomPass = new UnrealBloomPass(halfRes, 0.5, 0.4, 0.85);
const crtPass = new ShaderPass(CRTShader);
const composer = new EffectComposer(renderer);
composer.addPass(renderScene); composer.addPass(bloomPass); composer.addPass(crtPass);

// Quality selector: LOW=0, MED=1, HIGH=2
// Bloom is expensive — off by default on Safari
var _isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
var _qualityLevels = ['LOW', 'MED', 'HIGH'];
var _quality = _isSafari ? 0 : 2;
function applyQuality(q) {
    _quality = q;
    bloomPass.enabled = (q >= 2);  // Bloom only on HIGH
    var el = document.getElementById('quality-btn');
    if (el) el.textContent = 'GRAFIK: ' + _qualityLevels[q];
}
applyQuality(_quality);

let walls = [], doors = [], enemies = [], exits = [], activeSlogans = [], particles = [], pickups = [], barrels = [], props = [], vendingMachines = [];
let secretWalls = [], toxicZones = [], crushers = [], alarmPanels = [];

function loadLevel(index) {
    while(scene.children.length > 0) scene.remove(scene.children[0]);
    activeSlogans = []; particles = [];
    state.health = 100; state.ammo = Math.max(state.ammo, 30); state.dead = false; updateUI();

    const data = buildLevel(index, scene);
    walls = data.walls; doors = data.doors; enemies = data.enemies; exits = data.exits;
    pickups = data.pickups || []; barrels = data.barrels || []; props = data.props || [];
    vendingMachines = data.vendingMachines || [];
    secretWalls  = data.secretWalls  || [];
    toxicZones   = data.toxicZones   || [];
    crushers     = data.crushers     || [];
    alarmPanels  = data.alarmPanels  || [];
    camera.position.copy(data.playerStart);
    // Reset mission tracking for new level
    state.levelStartEnemyCount = enemies.length;
    state.levelKills = 0;
    state.levelTime = 0;
    // Reset key inventory on new level
    state.keys = new Set();
    updateKeyHUD();
    state.missionBossNoDamage = true;
    state.secretFound = false;
    // New Game Plus: double enemy HP
    if (state.ngPlus) enemies.forEach(function(e) { e.hp *= 2; });
    // Modifier: Big Head — scale enemy sprites 2x horizontally
    if (state.modifiers.bigHead) enemies.forEach(function(e) { e.mesh.scale.set(2, 1, 1); });
    // Modifier: Pistol Only — remove other weapons from inventory
    if (state.modifiers.pistolOnly) { state.inventory = [1]; state.weapon = 1; buildGunModel(1); }
    // Reset per-level scoring fields
    state.damageTaken = 0; state.maxCombo = 0;

    const ambient = new THREE.AmbientLight(0xffffff, 0.8); scene.add(ambient);
    const playerLight = new THREE.PointLight(0xffffff, 20, 20);
    playerLight.position.set(0, 0, 0); playerLight.castShadow = true;
    playerLight.shadow.mapSize.width = 256; playerLight.shadow.mapSize.height = 256;
    camera.add(playerLight);
    scene.add(gunLight); gunLight.castShadow = true; scene.add(camera);
    scene.fog = new THREE.FogExp2(LEVELS[index].sky, 0.03);
    scene.background = new THREE.Color(LEVELS[index].sky);

    rebuildCollisionCache();
    // Update mission list
    var missionEl = document.getElementById('mission-text');
    if (missionEl) missionEl.textContent = levelMissions[index] || '- Besegra alla fiender';
    showMessage(LEVELS[index].name, LEVELS[index].subtitle);

    // Tutorial hints på level 0
    if (index === 0) {
        setTimeout(function() { showMessage('TIPS', 'WASD = rör dig, mus = sikta, klick = skjut'); }, 2500);
        setTimeout(function() { showMessage('TIPS', 'E/SPACE = öppna dörrar, 1-4 = byt vapen'); }, 6000);
        setTimeout(function() { showMessage('TIPS', 'Hitta utgången (E) för att klara nivån'); }, 10000);
        setTimeout(function() { showMessage('NYCKELKORT', 'Gula dörrar kräver gult nyckelkort!'); }, 15000);
        setTimeout(function() { showMessage('HEMLIGHETER', 'Skjut på väggar — kanske öppnar de sig?'); }, 20000);
    }

    // Collect deferred texture tasks: wall decorations + enemy textures
    const decoTypes = ['swedish', 'nydemokrati', 'ultima_thule', 'valstuga', 'demokrati', 'foliehatt', 'jarnror_prop'];
    const deferredTasks = [];
    walls.forEach(function(wall) {
        if (Math.random() > 0.7) {
            const type = decoTypes[Math.floor(Math.random() * decoTypes.length)];
            deferredTasks.push({ kind: 'wall', wall: wall, decoType: type });
        }
    });
    enemies.forEach(function(e) {
        deferredTasks.push({ kind: 'enemy', enemy: e });
    });

    // Show loading bar
    var loadBar = document.getElementById('loading-bar');
    if (!loadBar) {
        var loadEl = document.createElement('div');
        loadEl.id = 'loading-overlay';
        loadEl.style.cssText = 'position:fixed;bottom:0;left:0;width:100%;padding:6px 0;background:rgba(0,0,0,0.7);color:#fc0;font-family:"Courier New",monospace;font-size:14px;text-align:center;z-index:999;pointer-events:none';
        loadBar = document.createElement('div');
        loadBar.id = 'loading-bar';
        loadEl.appendChild(loadBar);
        document.body.appendChild(loadEl);
    }
    var loadOverlay = document.getElementById('loading-overlay');
    if (loadOverlay) loadOverlay.style.display = 'block';

    var tasksDone = 0;
    var total = deferredTasks.length;

    function processBatch() {
        var batchSize = 2;
        for (var b = 0; b < batchSize && tasksDone < total; b++, tasksDone++) {
            var task = deferredTasks[tasksDone];
            if (task.kind === 'wall') {
                var wd = createWallDecoration(task.decoType);
                task.wall.material = new THREE.MeshStandardMaterial({ map: wd.colorMap, normalMap: wd.normalMap, normalScale: new THREE.Vector2(1.5, 1.5), roughness: 0.6, metalness: 0.1 });
            } else if (task.kind === 'enemy') {
                var et = createEnemyTexture(task.enemy.type, 'idle', task.enemy.variant);
                task.enemy.mesh.material.map = et.colorMap;
                task.enemy.mesh.material.normalMap = et.normalMap;
                task.enemy.mesh.material.normalScale = new THREE.Vector2(1.0, 1.0);
                task.enemy.mesh.material.color.setHex(0xffffff);
                task.enemy.mesh.material.needsUpdate = true;
            }
        }
        if (loadBar) loadBar.textContent = 'LADDAR ' + Math.round(tasksDone / total * 100) + '%';
        if (tasksDone < total) {
            requestAnimationFrame(processBatch);
        } else {
            if (loadOverlay) loadOverlay.style.display = 'none';
            // Defer reverb until after textures are loaded (ConvolverNode is heavy)
            setTimeout(function() {
                setReverb(index >= 3 ? 'large' : index >= 1 ? 'medium' : 'small');
            }, 100);
        }
    }
    if (total > 0) {
        requestAnimationFrame(processBatch);
    } else {
        if (loadOverlay) loadOverlay.style.display = 'none';
        setTimeout(function() {
            setReverb(index >= 3 ? 'large' : index >= 1 ? 'medium' : 'small');
        }, 100);
    }
}

function showMessage(title, sub) {
    const msg = document.getElementById('message');
    msg.innerHTML = '<div style="font-size:40px; color:#fc0">' + title + '</div><div>' + sub + '</div>';
    msg.style.opacity = 1; setTimeout(() => msg.style.opacity = 0, 3000);
}

// updateUI is defined further down (single merged version)

var deathQuotes = [
    "Inte ens en semla kunde rädda dig...",
    "Du debatterade som en amatör.",
    "Folket förtjänade bättre.",
    "Jimmie ler belåtet.",
    "Din insats var lika stark som riksdagens kaffemaskin.",
    "SD:s PR-avdelning tackar för besöket.",
    "Ulf skriver sin segerrapport.",
    "Demokratin föll snabbare än en valnatt.",
    "Du var modigare än de flesta. Det räckte inte.",
    "Ebba skickar blommor. Falskt medlidande."
];

// ─── Phase 4: Leaderboard ──────────────────────────────────────────────────
function getLeaderboard() {
    try { return JSON.parse(localStorage.getItem('elkenstein_lb') || '{"levels":{},"total":[]}'); }
    catch(e) { return { levels: {}, total: [] }; }
}
function saveLeaderboard(lb) {
    localStorage.setItem('elkenstein_lb', JSON.stringify(lb));
}
function submitLevelScore(levelIndex, score, grade, time) {
    var lb = getLeaderboard();
    var key = 'l' + levelIndex;
    if (!lb.levels[key] || score > lb.levels[key].score) {
        lb.levels[key] = { score, grade, time, date: new Date().toLocaleDateString('sv-SE') };
        saveLeaderboard(lb);
    }
}
function submitTotalScore(score, grade) {
    var lb = getLeaderboard();
    lb.total = lb.total || [];
    lb.total.push({ score, grade, date: new Date().toLocaleDateString('sv-SE') });
    lb.total.sort(function(a, b) { return b.score - a.score; });
    lb.total = lb.total.slice(0, 10);
    lb.gameCompleted = true;
    saveLeaderboard(lb);
    checkUnlocks(lb);
}
function getUnlocks() {
    try { return JSON.parse(localStorage.getItem('elkenstein_unlocks') || '{}'); }
    catch(e) { return {}; }
}
function saveUnlocks(u) { localStorage.setItem('elkenstein_unlocks', JSON.stringify(u)); }
function checkUnlocks(lb) {
    var u = getUnlocks();
    var grades = Object.values(lb.levels || {});
    var sCount = grades.filter(function(g) { return g.grade === 'S'; }).length;
    var changed = false;
    if (sCount >= 3 && !u.bigHead)      { u.bigHead = true; changed = true; showMessage('UPPLÅST!', 'Big Head-läge (välj i Extras)'); }
    if (lb.gameCompleted && !u.fastEnemies) { u.fastEnemies = true; changed = true; showMessage('UPPLÅST!', 'Snabba fiender-läge (välj i Extras)'); }
    if (lb.gameCompleted && !u.pistolOnly)  { u.pistolOnly = true; changed = true; showMessage('UPPLÅST!', 'Bara pistol-läge (välj i Extras)'); }
    if (changed) saveUnlocks(u);
}

// ─── Scoring overhaul ─────────────────────────────────────────────────────────
function calculateLevelBonus() {
    var acc = state.shotsFired > 0 ? state.shotsHit / state.shotsFired : 0;
    var lv = LEVELS[state.level] || {};
    var par = lv.parTime || 120;
    var accuracyBonus   = Math.round(acc * 600);
    var damagePenalty   = Math.round(state.damageTaken * 1.5);
    var timeBonus       = state.levelTime <= par ? Math.round((par - state.levelTime) * 8) : 0;
    var styleMult       = 1 + (state.maxCombo > 1 ? (state.maxCombo - 1) * 0.1 : 0);
    var bonus = Math.round((accuracyBonus + timeBonus - damagePenalty) * styleMult);
    return { accuracyBonus, damagePenalty, timeBonus, styleMult: styleMult.toFixed(1), bonus: Math.max(0, bonus) };
}

function getStatsHTML() {
    var acc = state.shotsFired > 0 ? Math.round((state.shotsHit / state.shotsFired) * 100) : 0;
    var lt = state.levelTime || 0;
    var lm = Math.floor(lt / 60), ls = Math.floor(lt % 60);
    var bonus = calculateLevelBonus();
    return 'FIENDER BESEGRADE: ' + state.levelKills + '/' + state.levelStartEnemyCount + '<br>TRÄFFSÄKERHET: ' + acc + '%<br>NIVÅ TID: ' + lm + ':' + (ls < 10 ? '0' + ls : ls) + '<br>SKADE TAGEN: ' + Math.round(state.damageTaken) + '<br>MAX COMBO: x' + state.maxCombo + '<br>TRÄFFSÄKERHETSBONUS: +' + bonus.accuracyBonus + '<br>TIDSBONUS: +' + bonus.timeBonus + '<br>SKADESTRAFF: -' + bonus.damagePenalty + '<br>STILMULTIPLIKATOR: x' + bonus.styleMult + '<br><b>DEMOKRATIPOÄNG: ' + (state.score + bonus.bonus) + '</b>';
}

function evaluateMissionObjectives(levelIndex) {
    var lv = LEVELS[levelIndex];
    var parTime = lv.parTime || 120;
    var bossTypes = lv.bossTypes || [];
    var objs = [];
    // Primary: always done if we got here
    objs.push({ label: 'Nå utgången', done: true, primary: true });
    // All enemies killed
    objs.push({ label: 'Eliminera alla fiender (' + state.levelStartEnemyCount + ')', done: state.levelKills >= state.levelStartEnemyCount });
    // Secret found
    objs.push({ label: 'Hitta det hemliga föremålet', done: state.secretFound });
    // Par time
    var m = Math.floor(parTime / 60), s = parTime % 60;
    var parStr = m > 0 ? m + 'm ' + s + 's' : s + 's';
    objs.push({ label: 'Klart under ' + parStr + ' (par)', done: state.levelTime <= parTime });
    // No boss damage (only if level has bosses)
    if (bossTypes.length > 0) {
        var bossNames = bossTypes.map(function(t) {
            return t === 'jimmie' ? 'Jimmie' : t === 'ebba' ? 'Ebba' : t === 'ulf' ? 'Ulf' : t === 'lars_werner' ? 'Lars Werner' : t;
        }).join('/');
        objs.push({ label: 'Inga träffar från ' + bossNames, done: state.missionBossNoDamage });
    }
    return objs;
}

function calculateGrade(objs) {
    var done = objs.filter(function(o) { return o.done; }).length;
    var total = objs.length;
    if (done === total) return { grade: 'S', color: '#ff0' };
    if (done >= total - 1) return { grade: 'A', color: '#0f0' };
    if (done >= total - 2) return { grade: 'B', color: '#0cf' };
    if (done >= total - 3) return { grade: 'C', color: '#f80' };
    return { grade: 'D', color: '#f44' };
}

function buildObjectivesHTML(objs) {
    return objs.map(function(o) {
        var icon = o.done ? '<span style="color:#0f0">✓</span>' : '<span style="color:#f44">✗</span>';
        var style = o.primary ? 'color:#fc0;font-weight:bold' : (o.done ? 'color:#ccc' : 'color:#666');
        return '<div style="' + style + '">' + icon + ' ' + o.label + '</div>';
    }).join('');
}

function getBriefingSecondaryHTML(levelIndex) {
    var lv = LEVELS[levelIndex];
    var bossTypes = lv.bossTypes || [];
    var lines = [];
    lines.push('► Eliminera alla fiender');
    lines.push('► Hitta det hemliga föremålet');
    var parTime = lv.parTime || 120;
    var m = Math.floor(parTime / 60), s = parTime % 60;
    lines.push('► Klart under ' + (m > 0 ? m + 'm ' + s + 's' : s + 's') + ' (par)');
    if (bossTypes.length > 0) {
        var bossNames = bossTypes.map(function(t) {
            return t === 'jimmie' ? 'Jimmie Åkesson' : t === 'ebba' ? 'Ebba Busch' : t === 'ulf' ? 'Ulf Kristersson' : t === 'lars_werner' ? 'Lars Werner' : t;
        }).join(', ');
        lines.push('► Inga skador från ' + bossNames);
    }
    return lines.join('<br>');
}

window.showMissionBriefing = function() {
    document.getElementById('levelScreen').style.display = 'none';
    var nextLevel = state.level;
    if (nextLevel >= LEVELS.length) { return; }
    var lv = LEVELS[nextLevel];
    document.getElementById('briefingLevel').textContent = 'UPPDRAG ' + (nextLevel + 1) + ': ' + lv.name.toUpperCase();
    document.getElementById('briefingPrimary').textContent = '► Nå utgången och ta dig vidare';
    document.getElementById('briefingSecondary').innerHTML = getBriefingSecondaryHTML(nextLevel);
    var parTime = lv.parTime || 120;
    var m = Math.floor(parTime / 60), s = parTime % 60;
    document.getElementById('briefingParTime').textContent = 'PARTID: ' + (m > 0 ? m + 'm ' + s + 's' : s + 's') + ' | FIENDER: ' + (lv.enemyData ? lv.enemyData.length : '?');
    document.getElementById('briefingScreen').style.display = 'flex';
};

window.startAfterBriefing = function() {
    document.getElementById('briefingScreen').style.display = 'none';
    state.playing = true; loadLevel(state.level); controls.lock();
    var musicMode = state.ngPlus ? 'combat' : (state.level === LEVELS.length - 1 ? 'boss' : 'exploration');
    startMusic(musicMode); startAmbient();
    if (state.ngPlus && state.level === 0) showMessage('NEW GAME+', 'Fiender har 2x HP!');
};

const gunLight = new THREE.PointLight(0xffaa00, 0, 15);
const gunGroup = new THREE.Group();

function buildGunModel(w) {
    while(gunGroup.children.length > 0) gunGroup.remove(gunGroup.children[0]);
    const md = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const mg = new THREE.MeshStandardMaterial({ color: 0x444444 });
    if (w === 1) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.8), md); b.position.set(0.25, -0.25, -0.5); gunGroup.add(b);
        const d = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.4), md); d.position.set(0.25, -0.3, -0.2); gunGroup.add(d);
    } else if (w === 2) {
        const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.2), md); b1.position.set(0.25, -0.25, -0.7); gunGroup.add(b1);
        const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.2), md); b2.position.set(0.32, -0.22, -0.7); gunGroup.add(b2);
        const d = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.5), mg); d.position.set(0.28, -0.3, -0.2); gunGroup.add(d);
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.12), md); m.position.set(0.28, -0.45, -0.15); gunGroup.add(m);
    } else if (w === 3) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.0), md); b.position.set(0.25, -0.25, -0.6); gunGroup.add(b);
        const d = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.6), new THREE.MeshStandardMaterial({ color: 0x553311 })); d.position.set(0.25, -0.3, -0.1); gunGroup.add(d);
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.2), mg); p.position.set(0.25, -0.32, -0.4); gunGroup.add(p);
    } else if (w === 4) {
        // Folkvett-broschyr
        const bk = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.02), new THREE.MeshStandardMaterial({ color: 0xffffcc })); bk.position.set(0.25, -0.2, -0.4); gunGroup.add(bk);
        const tx = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.025), new THREE.MeshStandardMaterial({ color: 0x0000cc })); tx.position.set(0.25, -0.15, -0.41); gunGroup.add(tx);
    }
    const fg = new THREE.PlaneGeometry(0.3, 0.3);
    const fm = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0, side: THREE.DoubleSide });
    const f = new THREE.Mesh(fg, fm); f.position.set(0.25, -0.25, -0.9); f.name = 'flash'; gunGroup.add(f);
}
buildGunModel(1); camera.add(gunGroup);

const controls = new PointerLockControls(camera, document.body);
const moveState = { fwd: false, back: false, left: false, right: false };

// Menu 3D background
var menuActive = true;
(function setupMenuScene() {
    var menuLight = new THREE.AmbientLight(0xffffff, 0.3); scene.add(menuLight);
    var menuSpot = new THREE.PointLight(0xff4400, 30, 30); menuSpot.position.set(0, 5, 0); scene.add(menuSpot);
    // Floating title cubes
    for (var mi = 0; mi < 20; mi++) {
        var mg = new THREE.BoxGeometry(0.5 + Math.random(), 0.5 + Math.random(), 0.5 + Math.random());
        var mm = new THREE.MeshStandardMaterial({ color: Math.random() > 0.5 ? 0xffcc00 : 0xcc0000 });
        var mc = new THREE.Mesh(mg, mm);
        mc.position.set((Math.random()-0.5)*20, Math.random()*8, (Math.random()-0.5)*20);
        mc.userData.menuObj = true; mc.userData.rotSpeed = (Math.random()-0.5)*2;
        scene.add(mc);
    }
    camera.position.set(0, 3, 10);
    camera.lookAt(0, 2, 0);
})();

document.getElementById('startBtn').addEventListener('click', () => {
    // Remove menu objects
    menuActive = false;
    var toRemove = [];
    scene.traverse(function(obj) { if (obj.userData && obj.userData.menuObj) toRemove.push(obj); });
    toRemove.forEach(function(obj) { scene.remove(obj); });
    document.getElementById('overlay').style.display = 'none';
    initAudio(); state.kills = 0; state.shotsFired = 0; state.shotsHit = 0;
    state.gameTime = 0; state.level = 0; state.weapon = 1; state.inventory = [1]; state.lives = 3;
    buildGunModel(1);
    // Show briefing for level 0 before starting
    window.showMissionBriefing();
});

var MAX_PARTICLES = 80;
// Shared geometry + material cache to avoid GC pressure
var _partGeomStd = new THREE.BoxGeometry(0.05, 0.05, 0.05);
var _partGeomLg  = new THREE.BoxGeometry(0.08, 0.08, 0.08);
var _partMatCache = {};
function _getPartMat(color) {
    if (!_partMatCache[color]) _partMatCache[color] = new THREE.MeshBasicMaterial({ color: color });
    return _partMatCache[color];
}
function spawnParticles(pos, color, count, size) {
    count = count || 10; size = size || 0.05;
    // Hard cap — skip spawning when pool is full
    if (particles.length >= MAX_PARTICLES) return;
    count = Math.min(count, MAX_PARTICLES - particles.length);
    var geom = (size <= 0.05) ? _partGeomStd : (size <= 0.08 ? _partGeomLg : new THREE.BoxGeometry(size, size, size));
    var mat = _getPartMat(color);
    for (var i = 0; i < count; i++) {
        var mesh = new THREE.Mesh(geom, mat);
        mesh.position.copy(pos);
        var vel = new THREE.Vector3((Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2);
        scene.add(mesh); particles.push({ mesh: mesh, velocity: vel, life: 1.0 + Math.random() });
    }
}

// Paper particles (flutter in air during gunfight)
function spawnPaperParticles(pos) {
    var paperGeo = new THREE.PlaneGeometry(0.15, 0.1);
    for (var i = 0; i < 5; i++) {
        var mat = new THREE.MeshBasicMaterial({ color: 0xeeeeee, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
        var mesh = new THREE.Mesh(paperGeo, mat);
        mesh.position.copy(pos).add(new THREE.Vector3((Math.random()-0.5)*2, Math.random()+1, (Math.random()-0.5)*2));
        var vel = new THREE.Vector3((Math.random()-0.5)*0.1, 0.02, (Math.random()-0.5)*0.1);
        scene.add(mesh);
        particles.push({ mesh: mesh, velocity: vel, life: 3 + Math.random()*2, paper: true, spinSpeed: (Math.random()-0.5)*5 });
    }
}

// Ragdoll-lite: enemy falls and shrinks on death
function spawnRagdoll(enemyMesh) {
    var clone = enemyMesh.clone();
    clone.material = enemyMesh.material.clone();
    scene.add(clone);
    particles.push({ mesh: clone, velocity: new THREE.Vector3(0, -0.02, 0), life: 2.0, ragdoll: true, rotSpeed: (Math.random()-0.5)*3 });
}

function interact() {
    _shootOrigin.set(0, 0); _shootRC.setFromCamera(_shootOrigin, camera);
    const rc = _shootRC;
    const hits = rc.intersectObjects(doors.map(function(d) { return d.mesh; }));
    if (hits.length > 0 && hits[0].distance < 3) {
        const door = doors.find(function(d) { return d.mesh === hits[0].object; });
        if (door) {
            if (door.locked) {
                if (state.keys.has(door.keyColor)) {
                    door.locked = false;
                    door.open = true;
                    playSound('door');
                    const colorName = door.keyColor === 'yellow' ? 'GUL' : 'BLÅ';
                    showMessage(colorName + ' DÖRR ÖPPNAD!', 'Nyckelkortet fungerade!');
                } else {
                    playSound('hitMarker');
                    const colorName = door.keyColor === 'yellow' ? 'gult' : 'blått';
                    showMessage('LÅST!', 'Behöver ' + colorName + ' nyckelkort');
                }
            } else {
                door.open = !door.open;
                playSound('door');
            }
        }
    }
    // Alarm panels: disable by interacting before they trigger
    alarmPanels.forEach(function(ap) {
        if (!ap.active || ap.triggered) return;
        var dist = camera.position.distanceTo(new THREE.Vector3(ap.x, camera.position.y, ap.z));
        if (dist < 2.0) {
            ap.active = false;
            ap.lightMesh.material.emissiveIntensity = 0;
            ap.lightMesh.material.color.setHex(0x333333);
            showMessage('LARM AVAKTIVERAT', 'Panelen stängdes av.');
            playSound('door');
        }
    });
    enemies.forEach(function(e) {
        if (e.type === 'jimmie' && camera.position.distanceTo(e.mesh.position) < 3) {
            e.state = 'debate'; e.stateTimer = 4.0;
            spawnSlogan(e.mesh.position, 'debate'); playSound('debateStun');
        }
    });
}

function spawnSlogan(pos, type) {
    var slogans = {
        'sd': ["MEN VAD SÄGER DU?!", "DET ÄR INTE VÅRT FEL!", "HEJA SVERIGE!", "VÄRDIKRAAAFT!"],
        'ebba': ["VAR ÄR FALUKORVEN?!", "KÄRNKRAFT NU!", "HJÄRTLÖST!"],
        'jimmie': ["VI TAR ANSVAR!", "SVERIGE FÖRST!", "MEN SNÄLLA..."],
        'skinhead': ["HADERIAN!", "HADERATT!", "UT!"],
        'ulf': ["DET ÄR INTE BRA!", "ORDNING OCH REDA!", "ANSVAR!"],
        'debate': ["??? MENINGSLÖS DEBATT ???", "...va sa han?...", "SLUTA PRATA POLTIK!", "Zzzzzzz...."]
    };
    var list = slogans[type] || ["CITAT!"];
    var text = list[Math.floor(Math.random() * list.length)];
    var cvs = document.createElement('canvas'); cvs.width = 512; cvs.height = 128;
    var ctx = cvs.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#fc0'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, 508, 124);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 40px Courier New'; ctx.textAlign = 'center'; ctx.fillText(text, 256, 80);
    var tex = new THREE.CanvasTexture(cvs);
    var mat = new THREE.SpriteMaterial({ map: tex });
    var sprite = new THREE.Sprite(mat);
    sprite.position.copy(pos).add(new THREE.Vector3(0, 1.5, 0)); sprite.scale.set(4, 1, 1);
    scene.add(sprite); activeSlogans.push({ sprite: sprite, life: 2.0 });
}

var shootCooldown = 0;
// Screen shake
var _shakeTimer = 0; var _shakeIntensity = 0;
function addScreenShake(intensity, duration) {
    _shakeIntensity = Math.max(_shakeIntensity, intensity);
    _shakeTimer = Math.max(_shakeTimer, duration);
}
// Kill feed
var _killFeed = []; // { text, timer }
function addKillFeed(text) {
    _killFeed.push({ text: text, timer: 3.0 });
    if (_killFeed.length > 5) _killFeed.shift();
    updateKillFeedUI();
}
function updateKillFeedUI() {
    var el = document.getElementById('kill-feed');
    if (!el) return;
    el.innerHTML = _killFeed.map(function(k) {
        return '<div style="opacity:' + Math.min(1, k.timer) + '">' + k.text + '</div>';
    }).join('');
}
// Reusable objects (avoid per-frame allocation)
var _shootRC = new THREE.Raycaster();
var _shootOrigin = new THREE.Vector2();
var _shootSpread = new THREE.Vector2();
var _shootDir = new THREE.Vector3();
var _shootTmpVec = new THREE.Vector3();
var _pVel = new THREE.Vector3();
function getWeaponStats() {
    switch(state.weapon) {
        case 2: return { damage: 8, cooldown: 0.08, sound: 'machinegun', ammoCost: 1, spread: 0.03 };
        case 3: return { damage: 6, cooldown: 0.6, sound: 'shotgun', ammoCost: 2, pellets: 6, spread: 0.08 };
        case 4: return { damage: 0, cooldown: 0.8, sound: 'debateStun', ammoCost: 0, spread: 0, stun: true };
        default: return { damage: 12, cooldown: 0.2, sound: 'shoot', ammoCost: 1, spread: 0 };
    }
}

function doShoot() {
    var wp = getWeaponStats();
    if (wp.ammoCost > 0 && state.ammo < wp.ammoCost) { playSound('emptyClick'); shootCooldown = 0.3; return; }
    // Folkvett stun logic
    if (wp.stun) {
        shootCooldown = wp.cooldown; playSound(wp.sound);
        gunGroup.rotation.x = -0.3; gunGroup.position.z = 0.2;
        _shootOrigin.set(0, 0);
        _shootRC.setFromCamera(_shootOrigin, camera);
        var sh = _shootRC.intersectObjects(enemies.map(function(e) { return e.mesh; }));
        if (sh.length > 0 && sh[0].distance < 8) {
            var se = enemies.find(function(e) { return e.mesh === sh[0].object; });
            if (se) { se.state = 'debate'; se.stateTimer = 3; spawnSlogan(se.mesh.position, 'debate'); }
        }
        return;
    }
    state.ammo -= wp.ammoCost; state.shotsFired++; updateUI(); playSound(wp.sound); playSound('shellCasing');
    // Screen shake: hagelgevär mest, kulspruta lite
    if (state.weapon === 3) addScreenShake(0.06, 0.18);
    else if (state.weapon === 2) addScreenShake(0.01, 0.05);
    gunLight.intensity = 15; gunLight.position.copy(camera.position);
    var fl = gunGroup.getObjectByName('flash');
    if (fl) { fl.material.opacity = 1; fl.rotation.z = Math.random() * Math.PI; }
    gunGroup.position.z = 0.15; gunGroup.rotation.x = 0.1; shootCooldown = wp.cooldown;
    // Build enemy mesh array + lookup once per shot (avoids map()/find() per pellet)
    var _emArr = []; var _emMap = new Map();
    for (var _emi = 0; _emi < enemies.length; _emi++) {
        _emArr[_emi] = enemies[_emi].mesh;
        _emMap.set(enemies[_emi].mesh, enemies[_emi]);
    }
    var pellets = wp.pellets || 1; var hit = false;
    for (var p = 0; p < pellets; p++) {
        var extraSpread = state.ammoType === 1 ? 0.04 : 0; // Hålspets has more spread
        _shootSpread.set((Math.random()-0.5)*(wp.spread+extraSpread), (Math.random()-0.5)*(wp.spread+extraSpread));
        _shootRC.setFromCamera(_shootSpread, camera);
        var eh = _shootRC.intersectObjects(_emArr);
        if (eh.length > 0 && eh[0].distance < 20) {
            var en = _emMap.get(eh[0].object);
            if (en) {
                var dmg = wp.damage; if (en.state === 'debate') dmg *= 2;
                // Ammo type modifiers
                if (state.ammoType === 1) dmg = Math.round(dmg * 1.5); // Hålspets
                if (state.ammoType === 2 && Math.random() > 0.6) { en.state = 'debate'; en.stateTimer = 1.5; } // Debatt
                // Pressekreterare: Shield blocks frontal damage
                if (en.type === 'pressekreterare') {
                    _shootDir.subVectors(camera.position, en.mesh.position).normalize();
                    _shootTmpVec.set(0, 0, -1).applyQuaternion(en.mesh.quaternion);
                    if (_shootDir.dot(_shootTmpVec) > -0.3) { // Facing player = shielded
                        spawnParticles(eh[0].point, 0x4444ff, 8); playSound('emptyClick');
                        continue; // Shield blocks
                    }
                }
                en.hp -= dmg; hit = true; spawnParticles(eh[0].point, 0xff0000, 15);
                playSound(Math.random() > 0.4 ? 'enemyGrunt' : 'enemyHurt');
                var v = en.variant || 0;
                en.mesh.material.map = createEnemyTexture(en.type, 'hurt', v);
                setTimeout(function() { if (en && en.mesh) en.mesh.material.map = createEnemyTexture(en.type, 'idle', v); }, 150);
                if (en.state === 'patrol' || en.state === 'idle') en.state = 'chase';
                if (en.hp <= 0) {
                    spawnParticles(en.mesh.position, 0xffff00, 30, 0.1); playSound('enemyDie');
                    spawnRagdoll(en.mesh);
                    scene.remove(en.mesh); enemies.splice(enemies.indexOf(en), 1); state.kills++; state.levelKills++;
                    addCombo();
                    addKillFeed(en.type.toUpperCase().replace('_', ' ') + ' eliminerad');
                }
            }
        } else {
            var secretMeshes = secretWalls.filter(function(sw) { return !sw.revealed; }).map(function(sw) { return sw.mesh; });
            var wh = _shootRC.intersectObjects(walls.concat(doors.map(function(d) { return d.mesh; })).concat(secretMeshes));
            if (wh.length > 0 && wh[0].distance < 30) {
                // Check if hit a secret wall
                var hitSW = secretWalls.find(function(sw) { return !sw.revealed && sw.mesh === wh[0].object; });
                if (hitSW) {
                    hitSW.hp--;
                    spawnParticles(wh[0].point, 0xaaaaff, 10, 0.04);
                    if (hitSW.hp <= 0) {
                        hitSW.revealed = true;
                        state.secretFound = true;
                        playSound('door');
                        showMessage('HEMLIG GÅNG!', 'Väggen öppnar sig...');
                    } else {
                        // Visual feedback: wall cracks
                        hitSW.mesh.material.emissive = new THREE.Color(0x112244);
                        hitSW.mesh.material.emissiveIntensity = 0.3;
                    }
                } else {
                    spawnParticles(wh[0].point, 0xaaaaaa, 8, 0.03);
                    if (Math.random() > 0.6) spawnPaperParticles(wh[0].point);
                }
            }
        }
    }
    if (hit) { state.shotsHit++; playSound('hitMarker'); }
    // Check barrel hits
    _shootOrigin.set(0, 0); _shootRC.setFromCamera(_shootOrigin, camera);
    var bh = _shootRC.intersectObjects(barrels.filter(function(b) { return b.active; }).map(function(b) { return b.mesh; }));
    if (bh.length > 0 && bh[0].distance < 25) {
        var barrel = barrels.find(function(b) { return b.mesh === bh[0].object; });
        if (barrel) { barrel.hp -= wp.damage; if (barrel.hp <= 0) explodeBarrel(barrel); }
    }
    
    // Check prop hits
    _shootRC.setFromCamera(_shootOrigin, camera);
    var ph = _shootRC.intersectObjects(props.map(function(p) { return p.mesh; }));
    if (ph.length > 0 && ph[0].distance < 25) {
        var prop = props.find(function(p) { return p.mesh === ph[0].object; });
        if (prop) {
            var dir = new THREE.Vector3().subVectors(prop.mesh.position, camera.position).normalize();
            prop.velocity.add(dir.multiplyScalar(0.5));
            prop.rotVelocity.set(Math.random(), Math.random(), Math.random()).multiplyScalar(0.5);
            spawnParticles(ph[0].point, 0xaaaaaa, 5, 0.02);
            playSound('binClatter');
        }
    }

    // Check vending machine hits
    _shootRC.setFromCamera(_shootOrigin, camera);
    var vh = _shootRC.intersectObjects(vendingMachines.filter(function(v) { return v.active; }).map(function(v) { return v.mesh; }), true);
    if (vh.length > 0 && vh[0].distance < 20) {
        var machine = vendingMachines.find(function(v) { return v.mesh === vh[0].object || v.mesh.children.includes(vh[0].object); });
        if (machine && machine.active) {
            machine.hp -= wp.damage;
            spawnParticles(vh[0].point, 0x00ffff, 10, 0.03); // Glass/Sparkles
            playSound('binClatter');
            if (machine.hp <= 0) {
                machine.active = false;
                if (machine.screen) machine.screen.material.emissiveIntensity = 0;
                machine.screen.material.color.setHex(0x222222);
                playSound('explosion');
                // Spawn loot
                const lootType = Math.random() > 0.5 ? 'health' : 'ammo';
                const pickupGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
                const color = lootType === 'health' ? 0x00ff00 : 0xffcc00;
                const mesh = new THREE.Mesh(pickupGeo, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 }));
                mesh.position.copy(machine.mesh.position).add(new THREE.Vector3(0, 0.5, 0.5));
                scene.add(mesh);
                pickups.push({ mesh, type: lootType, active: true });
            }
        }
    }
    
    setTimeout(() => { gunLight.intensity = 0; if (fl) fl.material.opacity = 0; }, 60);
}

function explodeBarrel(barrel) {
    if (!barrel.active) return;
    barrel.active = false; scene.remove(barrel.mesh);
    playSound('explosion'); spawnParticles(barrel.mesh.position, 0xff4400, 40, 0.15);
    spawnParticles(barrel.mesh.position, 0xffcc00, 25, 0.1);
    // Damage nearby enemies
    enemies.forEach(function(e) {
        var d = e.mesh.position.distanceTo(barrel.mesh.position);
        if (d < 6) {
            var dmg = Math.round(60 * (1 - d/6));
            e.hp -= dmg; playSound('enemyHurt');
            spawnParticles(e.mesh.position, 0xff0000, 10);
            if (e.hp <= 0) {
                spawnParticles(e.mesh.position, 0xffff00, 30, 0.1); playSound('enemyDie');
                scene.remove(e.mesh); enemies.splice(enemies.indexOf(e), 1); state.kills++; state.levelKills++;
                addCombo();
            } else { e.state = 'chase'; }
        }
    });
    // Damage player if close
    var pd = camera.position.distanceTo(barrel.mesh.position);
    if (pd < 5) {
        var pdmg = Math.round(30 * (1 - pd/5));
        if (state.armor > 0) { var abs = Math.min(state.armor, pdmg * 0.7); state.armor -= abs; pdmg -= abs; }
        state.health -= pdmg; state.damageTaken += pdmg; playSound('playerHurt'); updateUI();
        if (state.health <= 0 && !state.dead) playerDied();
    }
    // Chain reaction: nearby barrels
    barrels.forEach(function(ob) {
        if (ob.active && ob.mesh.position.distanceTo(barrel.mesh.position) < 4) {
            setTimeout(function() { explodeBarrel(ob); }, 150);
        }
    });
}

function addCombo() {
    state.combo++; state.comboTimer = 3;
    if (state.combo > state.maxCombo) state.maxCombo = state.combo;
    var bonus = state.combo * 50;
    state.score += 100 + bonus;
    if (state.combo >= 3) showMessage('COMBO x' + state.combo + '!', '+' + bonus + ' bonus');
}

var meleeCooldown = 0;
function doMelee() {
    if (!state.playing || state.dead || meleeCooldown > 0) return;
    meleeCooldown = 0.5; playSound('damageHit');
    gunGroup.rotation.x = -0.5; gunGroup.position.z = 0.3;
    enemies.forEach(function(e) {
        var d = e.mesh.position.distanceTo(camera.position);
        if (d < 2.5) {
            e.hp -= 25; playSound('enemyHurt'); spawnParticles(e.mesh.position, 0xff0000, 10);
            if (e.hp <= 0) {
                spawnParticles(e.mesh.position, 0xffff00, 30, 0.1); playSound('enemyDie');
                scene.remove(e.mesh); enemies.splice(enemies.indexOf(e), 1); state.kills++; state.levelKills++;
                addCombo();
            } else { e.state = 'chase'; }
        }
    });
}

var mouseDown = false;
window.addEventListener('mousedown', function() { mouseDown = true; });
window.addEventListener('mouseup', function() { mouseDown = false; });

document.addEventListener('keydown', function(e) {
    switch(e.code) {
        case 'KeyW': moveState.fwd = true; break;
        case 'KeyS': moveState.back = true; break;
        case 'KeyA': moveState.left = true; break;
        case 'KeyD': moveState.right = true; break;
        case 'KeyE': case 'Space': interact(); break;
        case 'KeyV': doMelee(); break;
        case 'KeyR':
            state.ammoType = (state.ammoType + 1) % 3;
            var ammoNames = ['STANDARD', 'HÅLSPETS', 'DEBATT'];
            showMessage(ammoNames[state.ammoType], 'Ammunition bytt');
            playSound('reload'); updateUI();
            break;
        case 'Digit1': if (state.inventory.includes(1)) { state.weapon = 1; buildGunModel(1); updateUI(); } break;
        case 'Digit2': if (!state.modifiers.pistolOnly && state.inventory.includes(2)) { state.weapon = 2; buildGunModel(2); updateUI(); } else if (state.modifiers.pistolOnly) showMessage('BARA PISTOL!', 'Modifieraren aktiv'); break;
        case 'Digit3': if (!state.modifiers.pistolOnly && state.inventory.includes(3)) { state.weapon = 3; buildGunModel(3); updateUI(); } else if (state.modifiers.pistolOnly) showMessage('BARA PISTOL!', 'Modifieraren aktiv'); break;
        case 'Digit4': if (!state.modifiers.pistolOnly && state.inventory.includes(4)) { state.weapon = 4; buildGunModel(4); updateUI(); } else if (state.modifiers.pistolOnly) showMessage('BARA PISTOL!', 'Modifieraren aktiv'); break;
        case 'KeyG': applyQuality((_quality + 1) % 3); showMessage('GRAFIK: ' + _qualityLevels[_quality], _quality === 0 ? 'Lägsta prestanda' : _quality === 1 ? 'Balanserat' : 'Maxkvalitet'); break;
    }
});
document.addEventListener('keyup', function(e) {
    switch(e.code) {
        case 'KeyW': moveState.fwd = false; break;
        case 'KeyS': moveState.back = false; break;
        case 'KeyA': moveState.left = false; break;
        case 'KeyD': moveState.right = false; break;
    }
});

// Pre-cached collision boxes - rebuilt on level load
var wallBoxes = [];
var _playerBox = new THREE.Box3();
var _boxSize = new THREE.Vector3();
var _tmpBox = new THREE.Box3();

function rebuildCollisionCache() {
    wallBoxes = walls.map(function(w) { return new THREE.Box3().setFromObject(w); });
}

function checkCollision(pos, radius) {
    radius = radius || 0.3;
    _boxSize.set(radius, 2, radius);
    _playerBox.setFromCenterAndSize(pos, _boxSize);
    for (var i = 0; i < wallBoxes.length; i++) {
        if (wallBoxes[i].intersectsBox(_playerBox)) return true;
    }
    // Check closed doors (few, so ok to compute live)
    for (var j = 0; j < doors.length; j++) {
        if (!doors[j].open) {
            _tmpBox.setFromObject(doors[j].mesh);
            if (_tmpBox.intersectsBox(_playerBox)) return true;
        }
    }
    // Check unrevealed secret walls
    for (var k = 0; k < secretWalls.length; k++) {
        if (!secretWalls[k].revealed) {
            _tmpBox.setFromObject(secretWalls[k].mesh);
            if (_tmpBox.intersectsBox(_playerBox)) return true;
        }
    }
    return false;
}

// Pre-allocated vectors for enemy AI (zero GC pressure)
var _eVec = new THREE.Vector3();
var _eVec2 = new THREE.Vector3();
var _eVec3 = new THREE.Vector3();
var _eLook = new THREE.Vector3();
var _ePos = new THREE.Vector3();

function pickPatrolTarget(e) {
    for (var i = 0; i < 10; i++) {
        var tx = e.patrolOriginX + (Math.random()-0.5)*12, tz = e.patrolOriginZ + (Math.random()-0.5)*12;
        _ePos.set(tx, e.mesh.position.y, tz);
        if (!checkCollision(_ePos, 0.5)) { e.patrolTargetX = tx; e.patrolTargetZ = tz; return; }
    }
    e.patrolTargetX = e.patrolOriginX; e.patrolTargetZ = e.patrolOriginZ;
}

function updateEnemy(e, dt, time) {
    _eLook.set(camera.position.x, e.mesh.position.y, camera.position.z);
    e.mesh.lookAt(_eLook);
    var dist = e.mesh.position.distanceTo(camera.position);
    if (e.alertCooldown > 0) e.alertCooldown -= dt;

    if (e.state === 'debate') { e.stateTimer -= dt; if (e.stateTimer <= 0) e.state = 'chase'; return; }

    var isBoss = e.type === 'jimmie' || e.type === 'ebba' || e.type === 'ulf' || e.type === 'lars_werner';

    // Ulf: Dash attack
    if (e.type === 'ulf' && e.state === 'chase' && dist < 10 && dist > 3) {
        if (!e.dashCooldown) e.dashCooldown = 0;
        e.dashCooldown -= dt;
        if (e.dashCooldown <= 0) {
            _eVec.subVectors(camera.position, e.mesh.position).normalize().multiplyScalar(12 * dt);
            _eVec.y = 0;
            _ePos.copy(e.mesh.position).add(_eVec);
            if (!checkCollision(_ePos, 0.5)) e.mesh.position.copy(_ePos);
            e.dashCooldown = 2 + Math.random() * 2;
            if (Math.random() > 0.7) spawnSlogan(e.mesh.position, 'ulf');
        }
    }
    // Ulf: Duck
    if (e.type === 'ulf' && e.state === 'chase') {
        if (!e.duckTimer) e.duckTimer = 0;
        e.duckTimer -= dt;
        if (e.duckTimer <= 0 && Math.random() > 0.99) {
            e.mesh.scale.y = 0.5; e.mesh.position.y = 0.75;
            e.duckTimer = 1.5;
            setTimeout(function() { if (e.mesh) { e.mesh.scale.y = 1; e.mesh.position.y = 1.5; } }, 800);
        }
    }

    // Ebba: Falukorv-spin
    if (e.type === 'ebba' && e.state === 'chase' && dist < 5) {
        var spinAngle = time * 4;
        _eVec.set(camera.position.x + Math.cos(spinAngle) * 3, e.mesh.position.y, camera.position.z + Math.sin(spinAngle) * 3);
        _eVec2.subVectors(_eVec, e.mesh.position).normalize().multiplyScalar(5 * dt);
        _eVec2.y = 0;
        _ePos.copy(e.mesh.position).add(_eVec2);
        if (!checkCollision(_ePos, 0.5)) e.mesh.position.copy(_ePos);
        e.mesh.rotation.y += 8 * dt;
        if (dist < 2.5) {
            var rawDmg = 15 * dt;
            if (state.armor > 0) { var abs = Math.min(state.armor, rawDmg * 0.7); state.armor -= abs; rawDmg -= abs; }
            state.health -= rawDmg; state.damageTaken += rawDmg;
            state.missionBossNoDamage = false;
            if (Math.random() > 0.95) spawnSlogan(e.mesh.position, 'ebba');
            if (state.health <= 0 && !state.dead) playerDied();
        }
        return;
    }

    // Lars Werner: Accidentally heals player
    if (e.type === 'lars_werner' && e.state === 'chase' && dist < 1.8) {
        if (Math.random() < 0.05 * dt * 60) {
            state.health = Math.min(100, state.health + 5);
            spawnSlogan(e.mesh.position, 'debate');
            showMessage('OOPS!', 'Lars Werner helade dig av misstag!');
            playSound('pickup');
        }
    }

    // Opinionsbildare: Summon reinforcements
    if (e.type === 'opinionsbildare' && e.state === 'chase' && dist < 10) {
        if (!e.summonCooldown) e.summonCooldown = 0;
        e.summonCooldown -= dt;
        if (e.summonCooldown <= 0 && enemies.length < 20) {
            e.summonCooldown = 8;
            _ePos.copy(e.mesh.position); _ePos.x += (Math.random()-0.5)*4; _ePos.z += (Math.random()-0.5)*4;
            if (!checkCollision(_ePos, 0.5)) {
                var types = ['sd', 'jarnror', 'bss_retro'];
                var st = types[Math.floor(Math.random() * types.length)];
                var sv = Math.floor(Math.random() * 10);
                var { colorMap, normalMap } = createEnemyTexture(st, 'idle', sv);
                var smat = new THREE.MeshStandardMaterial({ map: colorMap, normalMap: normalMap, normalScale: new THREE.Vector2(1,1), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
                var sgeom = new THREE.PlaneGeometry(3, 3);
                var smesh = new THREE.Mesh(sgeom, smat);
                smesh.position.copy(_ePos); smesh.castShadow = false; smesh.receiveShadow = false;
                scene.add(smesh);
                enemies.push({ mesh: smesh, type: st, hp: 30, variant: sv, state: 'chase', stateTimer: 0,
                    patrolOriginX: _ePos.x, patrolOriginZ: _ePos.z, patrolTargetX: _ePos.x, patrolTargetZ: _ePos.z,
                    patrolPause: 0, footstepTimer: 0, alertCooldown: 0 });
                playSound('enemyAlert'); showMessage('FÖRSTÄRKNING!', 'Opinionsbildaren kallade på hjälp!');
            }
        }
    }

    // Troll-operatör: Slows player
    if (e.type === 'troll' && e.state === 'chase' && dist < 8 && dist > 2) {
        if (!e.trollCooldown) e.trollCooldown = 0;
        e.trollCooldown -= dt;
        if (e.trollCooldown <= 0) {
            e.trollCooldown = 4;
            state.speedBoost = -3;
            spawnSlogan(e.mesh.position, 'debate');
            showMessage('LOGISK VURPA!', 'Du saktas ner...');
        }
    }

    // Cowardice: flee when low HP (non-boss)
    if (!isBoss && e.hp < 15 && e.state === 'chase' && dist < 8) {
        _eVec.subVectors(e.mesh.position, camera.position).normalize().multiplyScalar(4 * dt);
        _eVec.y = 0;
        _ePos.copy(e.mesh.position).add(_eVec);
        if (!checkCollision(_ePos, 0.5)) e.mesh.position.copy(_ePos);
        return;
    }
    if ((e.state === 'patrol' || e.state === 'idle') && dist < 12) {
        e.state = 'chase';
        if (e.alertCooldown <= 0) { playSound('enemyAlert'); e.alertCooldown = 5; spawnSlogan(e.mesh.position, e.type); }
    }

    if (e.state === 'patrol') {
        e.patrolPause -= dt; if (e.patrolPause > 0) return;
        var dx = e.patrolTargetX - e.mesh.position.x, dz = e.patrolTargetZ - e.mesh.position.z;
        if (Math.sqrt(dx*dx+dz*dz) < 0.5) { e.patrolPause = 1+Math.random()*2; pickPatrolTarget(e); }
        else {
            _eVec.set(dx, 0, dz).normalize().multiplyScalar(1.5 * dt);
            _ePos.copy(e.mesh.position).add(_eVec);
            if (!checkCollision(_ePos, 0.5)) e.mesh.position.copy(_ePos); else pickPatrolTarget(e);
            e.footstepTimer -= dt;
            if (e.footstepTimer <= 0 && dist < 15) {
                _eVec2.set(0, 0, -1).applyQuaternion(camera.quaternion);
                playPositionalSound('enemyFootstep', camera.position, _eVec2, e.mesh.position);
                e.footstepTimer = 0.6;
            }
        }
    }

    if (e.state === 'chase' && dist > 1.2) {
        // AI coordination: count nearby chasing allies
        var nearbyAllies = 0;
        for (var k = 0; k < enemies.length; k++) {
            if (enemies[k] !== e && enemies[k].state === 'chase' && enemies[k].mesh.position.distanceTo(e.mesh.position) < 6) nearbyAllies++;
        }
        var _speedMult = state.modifiers.fastEnemies ? 1.8 : 1;
        var coordSpeed = (nearbyAllies > 0 && Math.sin(time + e.patrolOriginX * 3) > 0.3 ? 2.0 : 3.5) * _speedMult;

        _eVec.subVectors(camera.position, e.mesh.position).normalize();
        var flankMul = Math.sin(time * 2 + e.patrolOriginX) * 2;
        _eVec2.set(-_eVec.z * flankMul, 0, _eVec.x * flankMul);
        // target = camera + flank offset
        _eVec3.copy(camera.position).add(_eVec2);
        _eVec.subVectors(_eVec3, e.mesh.position).normalize().multiplyScalar(coordSpeed * dt);
        _eVec.y = 0;
        _ePos.copy(e.mesh.position).add(_eVec);
        if (!checkCollision(_ePos, 0.5)) e.mesh.position.copy(_ePos);
        e.footstepTimer -= dt;
        if (e.footstepTimer <= 0 && dist < 15) {
            _eVec2.set(0, 0, -1).applyQuaternion(camera.quaternion);
            playPositionalSound('enemyFootstep', camera.position, _eVec2, e.mesh.position);
            e.footstepTimer = 0.35;
        }
        for (var j = 0; j < enemies.length; j++) {
            var o = enemies[j];
            if (o !== e && (o.state === 'idle' || o.state === 'patrol') && o.mesh.position.distanceTo(e.mesh.position) < 8) o.state = 'chase';
        }
    }

    if (dist < 1.5) {
        e.state = 'chase';
        var rawDmg = 10 * dt;
        if (state.armor > 0) { var absorbed = Math.min(state.armor, rawDmg * 0.7); state.armor -= absorbed; rawDmg -= absorbed; }
        state.health -= rawDmg; state.damageTaken += rawDmg;
        if (isBoss) state.missionBossNoDamage = false;
        if (Math.random() > 0.95) { playSound('damageHit'); showDamageDirection(e.mesh.position); }
        _dom.vig.style.boxShadow = state.health < 30 ? 'inset 0 0 100px rgba(255,0,0,0.5)' : 'inset 0 0 100px rgba(0,0,0,0.8)';
        if (Math.random() > 0.98) spawnSlogan(e.mesh.position, e.type);
        if (state.health <= 0 && !state.dead) playerDied();
    }
}

var dmgIndicatorTimers = { top: 0, right: 0, bottom: 0, left: 0 };
var _dmgVec1 = new THREE.Vector3();
var _dmgVec2 = new THREE.Vector3();
var _dmgVec3 = new THREE.Vector3();
function showDamageDirection(enemyPos) {
    _dmgVec1.subVectors(enemyPos, camera.position); _dmgVec1.y = 0; _dmgVec1.normalize();
    _dmgVec2.set(0, 0, -1).applyQuaternion(camera.quaternion); _dmgVec2.y = 0; _dmgVec2.normalize();
    _dmgVec3.set(1, 0, 0).applyQuaternion(camera.quaternion); _dmgVec3.y = 0; _dmgVec3.normalize();
    var dotFwd = _dmgVec2.dot(_dmgVec1), dotRight = _dmgVec3.dot(_dmgVec1);
    if (dotFwd > 0.5) dmgIndicatorTimers.top = 0.4;
    else if (dotFwd < -0.5) dmgIndicatorTimers.bottom = 0.4;
    if (dotRight > 0.5) dmgIndicatorTimers.right = 0.4;
    else if (dotRight < -0.5) dmgIndicatorTimers.left = 0.4;
}
var _dmgEls = { top: null, right: null, bottom: null, left: null };
function updateDamageIndicator(dt) {
    if (!_dmgEls.top) { _dmgEls.top = _dom.dmgTop; _dmgEls.right = _dom.dmgRight; _dmgEls.bottom = _dom.dmgBottom; _dmgEls.left = _dom.dmgLeft; }
    dmgIndicatorTimers.top = Math.max(0, dmgIndicatorTimers.top - dt);
    dmgIndicatorTimers.right = Math.max(0, dmgIndicatorTimers.right - dt);
    dmgIndicatorTimers.bottom = Math.max(0, dmgIndicatorTimers.bottom - dt);
    dmgIndicatorTimers.left = Math.max(0, dmgIndicatorTimers.left - dt);
    _dmgEls.top.style.opacity = dmgIndicatorTimers.top > 0 ? '1' : '0';
    _dmgEls.right.style.opacity = dmgIndicatorTimers.right > 0 ? '1' : '0';
    _dmgEls.bottom.style.opacity = dmgIndicatorTimers.bottom > 0 ? '1' : '0';
    _dmgEls.left.style.opacity = dmgIndicatorTimers.left > 0 ? '1' : '0';
}

function playerDied() {
    if (state.dead) return; // guard mot dubbel-trigger
    state.lives--;
    updateLivesHUD();
    if (state.lives > 0) {
        // Respawn: behåll vapen, ladda om nivån
        state.dead = true; // blockera re-trigger under delay
        playSound('playerHurt');
        _dom.vig.style.background = 'rgba(255,0,0,0.8)';
        showMessage('LIV FÖRLORAT!', state.lives + ' ' + (state.lives === 1 ? 'liv kvar' : 'liv kvar'));
        var savedInventory = state.inventory.slice();
        var savedWeapon = state.weapon;
        setTimeout(function() {
            _dom.vig.style.background = 'none';
            _dom.vig.style.boxShadow = 'inset 0 0 100px rgba(0,0,0,0.8)';
            if (state.arcadeMode) {
                // Arcade respawn: regenerate arena, restart current wave
                generateArcadeArena();
                spawnArcadeWave(state.arcadeWave);
            } else {
                loadLevel(state.level);
                state.inventory = savedInventory;
                state.weapon = savedWeapon;
            }
            state.dead = false;
            state.playing = true;
            buildGunModel(state.modifiers.pistolOnly ? 1 : state.weapon);
            controls.lock();
            startMusic(state.arcadeMode ? 'combat' : 'exploration');
            if (!state.arcadeMode) startAmbient();
        }, 1800);
        return;
    }
    // Game over — inga liv kvar
    state.dead = true; state.playing = false; playSound('gameOver'); stopMusic(); stopAmbient();
    _dom.vig.style.background = 'rgba(255,0,0,0.5)';
    // Arcade game over: save high score + show wave reached
    if (state.arcadeMode) {
        state.arcadeMode = false;
        var arcadeLb = getLeaderboard(); arcadeLb.arcade = arcadeLb.arcade || [];
        arcadeLb.arcade.push({ wave: state.arcadeWave, score: state.arcadeScore, date: new Date().toLocaleDateString('sv-SE') });
        arcadeLb.arcade.sort(function(a, b) { return b.score - a.score; });
        arcadeLb.arcade = arcadeLb.arcade.slice(0, 10);
        saveLeaderboard(arcadeLb);
        document.getElementById('deathStats').innerHTML = 'ARKADLÄGE SLUT<br>VÅG NÅD: ' + state.arcadeWave + '<br>POÄNG: ' + state.arcadeScore;
        var subEl = document.querySelector('#deathScreen .screen-subtitle');
        if (subEl) subEl.textContent = 'Demokratin föll... i arkaden.';
        document.getElementById('deathScreen').style.display = 'flex'; document.exitPointerLock();
        return;
    }
    document.getElementById('deathStats').innerHTML = getStatsHTML();
    var subEl = document.querySelector('#deathScreen .screen-subtitle');
    if (subEl) subEl.textContent = deathQuotes[Math.floor(Math.random() * deathQuotes.length)];
    document.getElementById('deathScreen').style.display = 'flex';
    document.exitPointerLock();
}

window.restartLevel = function() {
    document.getElementById('deathScreen').style.display = 'none';
    _dom.vig.style.background = 'none';
    _dom.vig.style.boxShadow = 'inset 0 0 100px rgba(0,0,0,0.8)';
    state.dead = false; state.playing = true; loadLevel(state.level); controls.lock(); startMusic('exploration'); startAmbient();
};

// startNextLevel now routes through briefing screen (kept for any legacy calls)
window.startNextLevel = function() {
    window.showMissionBriefing();
};

window.showMenu = function() {
    document.getElementById('winScreen').style.display = 'none';
    document.getElementById('overlay').style.display = 'flex';
    state.playing = false; state.ngPlus = false; stopMusic(); stopAmbient();
};

window.startNewGamePlus = function() {
    document.getElementById('winScreen').style.display = 'none';
    state.ngPlus = true; state.level = 0;
    state.health = 100; state.ammo = 50; state.armor = 50; state.lives = 3;
    state.kills = 0; state.shotsFired = 0; state.shotsHit = 0; state.gameTime = 0; state.score = 0;
    window.showMissionBriefing();
};

var playerFootstepTimer = 0;
var heartbeatTimer = 0;var clock = new THREE.Clock();

// Cached DOM elements
var _dom = {
    hb: document.getElementById('health-bar'),
    ht: document.getElementById('health-text'),
    ammo: document.getElementById('ammo'),
    armor: document.getElementById('armor-display'),
    score: document.getElementById('score-text'),
    combo: document.getElementById('combo-text'),
    timer: document.getElementById('timer-display'),
    compass: document.getElementById('compass-strip'),
    mmCvs: document.getElementById('minimap-canvas'),
    vig: document.getElementById('vignette'),
    dmgTop: document.getElementById('dmg-top'),
    dmgRight: document.getElementById('dmg-right'),
    dmgBottom: document.getElementById('dmg-bottom'),
    dmgLeft: document.getElementById('dmg-left'),
    lives: document.getElementById('lives-display'),
    keys: document.getElementById('keys-display')
};
var _mmCtx = _dom.mmCvs.getContext('2d');

function updateLivesHUD() {
    if (!_dom.lives) return;
    var hearts = '';
    for (var _li = 0; _li < 3; _li++) hearts += _li < state.lives ? '♥' : '♡';
    _dom.lives.textContent = 'LIV: ' + hearts;
    _dom.lives.style.color = state.lives === 1 ? '#f44' : '#f0f';
}

function updateKeyHUD() {
    if (!_dom.keys) return;
    var parts = [];
    if (state.keys.has('yellow')) parts.push('<span style="color:#ffdd00">&#9632; GULT</span>');
    if (state.keys.has('blue'))   parts.push('<span style="color:#44aaff">&#9632; BLÅTT</span>');
    if (parts.length > 0) {
        _dom.keys.innerHTML = 'KORT: ' + parts.join(' ');
        _dom.keys.style.display = 'block';
    } else {
        _dom.keys.style.display = 'none';
    }
}
var _minimapFrame = 0;
var _compassFrame = 0;
var _wn = { 1: 'PISTOL', 2: 'KULSPRUTA', 3: 'HAGELGEVÄR', 4: 'FOLKVETT' };
var _ammoTypes = ['STD', 'HP', 'DBT'];

// --- UI UPDATES (merged: health, ammo, compass, minimap) ---
function updateUI() {
    // Health bar
    _dom.hb.style.width = Math.max(0, state.health) + '%';
    _dom.ht.textContent = Math.ceil(state.health) + '%';
    _dom.hb.style.background = state.health < 30 ? '#f00' : '#0f0';
    _dom.ammo.textContent = 'AMMO: ' + state.ammo + ' | ' + _wn[state.weapon] + ' [' + _ammoTypes[state.ammoType] + ']';
    _dom.ammo.style.color = state.ammo <= 10 ? (Math.floor(Date.now() / 300) % 2 ? '#f44' : '#fa0') : '#fc0';
    if (_dom.armor) { _dom.armor.style.display = state.armor > 0 ? 'block' : 'none'; _dom.armor.textContent = 'ARMOR: ' + Math.ceil(state.armor); }
    if (_dom.score) _dom.score.textContent = 'POÄNG: ' + state.score;
    if (_dom.combo) _dom.combo.textContent = state.combo >= 2 ? 'COMBO x' + state.combo : '';
    updateLivesHUD();
    // Level timer
    if (_dom.timer) {
        var _lt = Math.floor(state.levelTime);
        var _lm = Math.floor(_lt / 60), _ls = _lt % 60;
        var _parT = (LEVELS[state.level] && LEVELS[state.level].parTime) || 120;
        _dom.timer.textContent = 'TID: ' + _lm + ':' + (_ls < 10 ? '0' : '') + _ls;
        _dom.timer.style.color = state.levelTime > _parT ? '#f66' : '#aaf';
    }

    // Compass — throttled to every 3rd frame
    _compassFrame++;
    if (_compassFrame % 3 === 0) {
        var degree = THREE.MathUtils.radToDeg(camera.rotation.y) % 360;
        _dom.compass.style.transform = 'translateX(' + (-(degree / 90) * 150) + 'px)';
    }

    // Minimap - only redraw every 12th frame (was 6th)
    _minimapFrame++;
    if (_minimapFrame % 12 === 0) {
        _mmCtx.clearRect(0, 0, 150, 150);
        _mmCtx.fillStyle = '#111';
        _mmCtx.beginPath(); _mmCtx.arc(75, 75, 75, 0, Math.PI * 2); _mmCtx.fill();
        _mmCtx.save(); _mmCtx.translate(75, 75); _mmCtx.rotate(-camera.rotation.y);
        _mmCtx.fillStyle = '#444';
        for (var wi = 0; wi < walls.length; wi++) {
            var w = walls[wi];
            var dx = (w.position.x - camera.position.x) * 4, dz = (w.position.z - camera.position.z) * 4;
            if (dx > -80 && dx < 80 && dz > -80 && dz < 80) _mmCtx.fillRect(dx - 2, dz - 2, 4, 4);
        }
        for (var ei = 0; ei < enemies.length; ei++) {
            var e = enemies[ei];
            var edx = (e.mesh.position.x - camera.position.x) * 4, edz = (e.mesh.position.z - camera.position.z) * 4;
            if (edx > -80 && edx < 80 && edz > -80 && edz < 80) {
                _mmCtx.fillStyle = e.type === 'jimmie' || e.type === 'ebba' || e.type === 'ulf' ? '#f0f' : '#f00';
                _mmCtx.fillRect(edx - 1.5, edz - 1.5, 3, 3);
            }
        }
        _mmCtx.restore();
        _mmCtx.fillStyle = '#0ff'; _mmCtx.beginPath(); _mmCtx.arc(75, 75, 3, 0, Math.PI * 2); _mmCtx.fill();
    }
}

function animate() {
    requestAnimationFrame(animate);
    var dt = clock.getDelta(); var time = clock.getElapsedTime();
    crtPass.uniforms.time.value = time;

    // Menu 3D animation
    if (menuActive) {
        camera.position.x = Math.sin(time * 0.3) * 8;
        camera.position.z = Math.cos(time * 0.3) * 8;
        camera.lookAt(0, 2, 0);
        scene.traverse(function(obj) {
            if (obj.userData && obj.userData.menuObj) {
                obj.rotation.y += obj.userData.rotSpeed * dt;
                obj.position.y += Math.sin(time * 2 + obj.position.x) * 0.005;
            }
        });
    }

    if (controls.isLocked && state.playing && !state.dead) {
        state.gameTime += dt;
        state.levelTime += dt;
        shootCooldown -= dt; meleeCooldown -= dt;
        if (state.comboTimer > 0) { state.comboTimer -= dt; if (state.comboTimer <= 0) state.combo = 0; }
        if (mouseDown && shootCooldown <= 0 && state.ammo > 0) doShoot();
        if (state.health < 25 && state.health > 0) { heartbeatTimer -= dt; if (heartbeatTimer <= 0) { playSound('heartbeat'); heartbeatTimer = 1.2 - (25 - state.health) * 0.03; } }

        if (state.speedBoost > 0) state.speedBoost -= dt;
        else if (state.speedBoost < 0) state.speedBoost = Math.min(0, state.speedBoost + dt);
        var speed = (state.speedBoost > 0 ? 15.0 : state.speedBoost < 0 ? 5.0 : 10.0) * dt;
        _eVec.set(0, 0, 0);
        if (moveState.fwd) _eVec.z -= 1;
        if (moveState.back) _eVec.z += 1;
        if (moveState.left) _eVec.x -= 1;
        if (moveState.right) _eVec.x += 1;

        if (_eVec.length() > 0) {
            _eVec2.copy(_eVec).applyQuaternion(camera.quaternion); _eVec2.y = 0; _eVec2.normalize();
            _ePos.copy(camera.position); _ePos.x += _eVec2.x * speed;
            if (!checkCollision(_ePos, 0.3)) camera.position.x = _ePos.x;
            _ePos.copy(camera.position); _ePos.z += _eVec2.z * speed;
            if (!checkCollision(_ePos, 0.3)) camera.position.z = _ePos.z;
            gunGroup.position.y = Math.sin(time * 12) * 0.015; gunGroup.position.x = Math.cos(time * 6) * 0.01;
            playerFootstepTimer -= dt;
            if (playerFootstepTimer <= 0) {
                var fsound = state.level === 2 ? 'footstepMetal' : state.level === 1 ? 'footstepStone' : 'playerFootstep';
                playSound(fsound); playerFootstepTimer = 0.4;
            }
        }

        exits.forEach(function(exit) {
            if (camera.position.distanceTo(exit.position) < 1.5) {
                var completedLevel = state.level;
                state.level++; playSound('levelComplete');
                if (state.level < LEVELS.length) {
                    state.playing = false; stopMusic();
                    var objs = evaluateMissionObjectives(completedLevel);
                    var gradeInfo = calculateGrade(objs);
                    // Bonus score for objectives
                    var bonusObjs = objs.filter(function(o) { return o.done && !o.primary; });
                    state.score += bonusObjs.length * 500;
                    // Apply scoring bonuses
                    var bonusBreakdown = calculateLevelBonus();
                    state.score += bonusBreakdown.bonus;
                    submitLevelScore(completedLevel, state.score, gradeInfo.grade, state.levelTime);
                    document.getElementById('levelTitle').textContent = 'NIVÅ ' + (completedLevel + 1) + ' KLAR';
                    document.getElementById('levelSub').textContent = LEVELS[completedLevel].name;
                    document.getElementById('levelStats').innerHTML = getStatsHTML();
                    document.getElementById('levelObjectives').innerHTML = buildObjectivesHTML(objs);
                    var gradeEl = document.getElementById('levelGrade');
                    gradeEl.textContent = gradeInfo.grade;
                    gradeEl.style.color = gradeInfo.color;
                    document.getElementById('levelScreen').style.display = 'flex'; document.exitPointerLock();
                } else {
                    state.playing = false; stopMusic(); playSound('victory');
                    var winObjs = evaluateMissionObjectives(completedLevel);
                    var winGrade = calculateGrade(winObjs);
                    var winBonus = calculateLevelBonus();
                    state.score += winBonus.bonus;
                    submitLevelScore(completedLevel, state.score, winGrade.grade, state.levelTime);
                    submitTotalScore(state.score, winGrade.grade);
                    document.getElementById('winStats').innerHTML = getStatsHTML();
                    document.getElementById('winScreen').style.display = 'flex'; document.exitPointerLock();
                }
            }
        });

        for (var pi = pickups.length - 1; pi >= 0; pi--) {
            var pk = pickups[pi]; if (!pk.active) continue;
            pk.mesh.position.y = 0.5 + Math.sin(time * 3 + pi) * 0.15; pk.mesh.rotation.y = time * 2;
            if (camera.position.distanceTo(pk.mesh.position) < 1.5) {
                pk.active = false; scene.remove(pk.mesh);
                switch(pk.type) {
                    case 'health': state.health = Math.min(100, state.health + 25); playSound('pickup'); break;
                    case 'ammo': state.ammo = Math.min(100, state.ammo + 20); playSound('pickup'); break;
                    case 'armor': state.armor = Math.min(100, state.armor + 50); playSound('pickup'); showMessage('SKYDDSVÄST!', '+50 Armor'); break;
                    case 'coffee': state.speedBoost = 10; playSound('pickup'); showMessage('SNABBKAFFE!', 'Speed boost 10s'); break;
                    case 'semla': state.health = Math.min(150, state.health + 50); playSound('pickup'); showMessage('SEMLA!', 'Överhälsa!'); break;
                    case 'machinegun':
                        if (!state.inventory.includes(2)) state.inventory.push(2);
                        state.weapon = 2; state.ammo = Math.min(100, state.ammo + 30);
                        buildGunModel(2); playSound('weaponPickup'); showMessage('KULSPRUTA!', 'Automateld aktiverad'); break;
                    case 'shotgun':
                        if (!state.inventory.includes(3)) state.inventory.push(3);
                        state.weapon = 3; state.ammo = Math.min(100, state.ammo + 10);
                        buildGunModel(3); playSound('weaponPickup'); showMessage('HAGELGEVÄR!', 'Spridningseld'); break;
                    case 'folkvett':
                        if (!state.inventory.includes(4)) state.inventory.push(4);
                        state.weapon = 4; buildGunModel(4);
                        state.secretFound = true;
                        playSound('weaponPickup'); showMessage('FOLKVETT-BROSCHYR!', 'Hemligt föremål hittat! +500p'); break;
                    case 'extralife':
                        if (state.lives < 3) {
                            state.lives = Math.min(3, state.lives + 1);
                            playSound('pickup'); showMessage('EXTRA LIV!', '♥ ' + state.lives + ' liv totalt'); updateLivesHUD();
                        } else {
                            // Max lives — ge poäng istället
                            state.score += 500;
                            playSound('pickup'); showMessage('EXTRA LIV!', 'Redan max — +500 poäng');
                        }
                        break;
                    case 'keycard_yellow':
                        state.keys.add('yellow');
                        playSound('weaponPickup');
                        showMessage('GULT NYCKELKORT!', 'Öppnar gula låsta dörrar');
                        updateKeyHUD();
                        break;
                    case 'keycard_blue':
                        state.keys.add('blue');
                        playSound('weaponPickup');
                        showMessage('BLÅTT NYCKELKORT!', 'Öppnar blåa låsta dörrar');
                        updateKeyHUD();
                        break;
                }
                updateUI();
            }
        }
    }

    doors.forEach(function(d) { d.mesh.position.y = Math.lerp(d.mesh.position.y, d.open ? 6 : 2, 5 * dt); });

    // ── Secret walls: slide open when revealed ────────────────────────────────
    secretWalls.forEach(function(sw) {
        if (sw.revealed) {
            sw.mesh.position.y = Math.lerp(sw.mesh.position.y, 6, 3 * dt);
        }
    });

    // ── Toxic zones: damage player on contact ─────────────────────────────────
    if (state.playing && !state.dead) {
        for (var ti = 0; ti < toxicZones.length; ti++) {
            var tz = toxicZones[ti];
            var tdx = camera.position.x - tz.x;
            var tdz = camera.position.z - tz.z;
            if (Math.abs(tdx) < 0.9 && Math.abs(tdz) < 0.9) {
                tz._dmgTimer -= dt;
                if (tz._dmgTimer <= 0) {
                    state.health -= 5; state.damageTaken += 5;
                    tz._dmgTimer = 0.5;
                    updateUI();
                    if (!tz._shown) {
                        tz._shown = true;
                        showMessage('GIFTIGT!', 'Spring ur det giftiga området!');
                    }
                    if (state.health <= 0 && !state.dead) { playerDied(); }
                }
                // Pulsing green overlay hint
                tz.mesh.material.emissiveIntensity = 0.4 + Math.sin(time * 8) * 0.3;
            } else {
                tz._shown = false;
                tz.mesh.material.emissiveIntensity = 0.7;
            }
        }
    }

    // ── Crushers: animate and damage player ───────────────────────────────────
    for (var ci = 0; ci < crushers.length; ci++) {
        var cr = crushers[ci];
        var cyc = ((time + cr.phase) % cr.period) / cr.period; // 0..1 cycle
        // Triangle wave: 0→1→0, minimum at 0.4-0.6 (crushing position)
        var frac = cyc < 0.5 ? cyc * 2 : (1 - cyc) * 2;
        cr.mesh.position.y = 0.4 + frac * 3.5; // 0.4 = crushing, 3.9 = at ceiling

        if (state.playing && !state.dead) {
            cr._dmgCooldown = Math.max(0, cr._dmgCooldown - dt);
            var cdx = camera.position.x - cr.x;
            var cdz = camera.position.z - cr.z;
            if (Math.abs(cdx) < 0.85 && Math.abs(cdz) < 0.85 && frac < 0.2) {
                if (cr._dmgCooldown <= 0) {
                    state.health -= 25; state.damageTaken += 25;
                    cr._dmgCooldown = 0.8;
                    playSound('damage');
                    showMessage('KROSSAS!', 'Spring undan pressar!');
                    updateUI();
                    if (state.health <= 0 && !state.dead) { playerDied(); }
                }
            }
        }
    }

    // ── Alarm panels: auto-trigger on proximity + blink ───────────────────────
    for (var ai = 0; ai < alarmPanels.length; ai++) {
        var ap = alarmPanels[ai];
        if (!ap.active) continue;

        // Blink the light
        ap._blinkTimer = (ap._blinkTimer || 0) + dt;
        ap.lightMesh.material.emissiveIntensity = Math.abs(Math.sin(ap._blinkTimer * 4)) * 0.8 + 0.2;

        if (state.playing && !state.dead && !ap.triggered) {
            var adx = camera.position.x - ap.x;
            var adz = camera.position.z - ap.z;
            if (Math.sqrt(adx*adx + adz*adz) < 2.5) {
                ap.triggered = true;
                ap.active = false;
                ap.lightMesh.material.emissiveIntensity = 1.5;
                ap.lightMesh.material.color.setHex(0xff4400);
                playSound('alarm');
                showMessage('LARM!', 'Alla fiender alertas!');
                // Alert all enemies
                enemies.forEach(function(e) {
                    if (e.state === 'patrol' || e.state === 'idle') e.state = 'chase';
                });
                // Spawn additional enemies near alarm panel
                ap.spawnEnemies.forEach(function(etype, idx) {
                    var isBoss = ['jimmie', 'ebba', 'ulf', 'lars_werner'].includes(etype);
                    var hp = isBoss ? 100 : [30,40,50,60,70,80][state.level] || 50;
                    var mat2 = new THREE.MeshStandardMaterial({ color: 0x888888, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
                    var geom2 = new THREE.PlaneGeometry(3, 3);
                    var mesh2 = new THREE.Mesh(geom2, mat2);
                    var ox = (idx % 2 === 0 ? 2 : -2);
                    mesh2.position.set(ap.x + ox, 1.5, ap.z + (idx > 1 ? 2 : -2));
                    scene.add(mesh2);
                    enemies.push({
                        mesh: mesh2, type: etype, hp, variant: Math.floor(Math.random()*10),
                        state: 'chase',
                        stateTimer: 0,
                        patrolOriginX: mesh2.position.x, patrolOriginZ: mesh2.position.z,
                        patrolTargetX: mesh2.position.x, patrolTargetZ: mesh2.position.z,
                        patrolPause: 0, footstepTimer: 0, alertCooldown: 0
                    });
                    // Deferred texture load
                    setTimeout(function() {
                        if (mesh2 && mesh2.material) {
                            mesh2.material.map = createEnemyTexture(etype, 'idle', 0);
                            mesh2.material.needsUpdate = true;
                        }
                    }, 100 + idx * 50);
                });
                state.levelStartEnemyCount = enemies.length;
            }
        }
    }

    for (var si = activeSlogans.length - 1; si >= 0; si--) {
        activeSlogans[si].life -= dt; activeSlogans[si].sprite.position.y += 0.5 * dt;
        if (activeSlogans[si].life <= 0) { scene.remove(activeSlogans[si].sprite); activeSlogans.splice(si, 1); }
    }
    for (var qi = particles.length - 1; qi >= 0; qi--) {
        var part = particles[qi];
        part.life -= dt;
        _pVel.copy(part.velocity).multiplyScalar(60 * dt);
        part.mesh.position.add(_pVel);
        if (part.paper) {
            part.velocity.y -= 0.001 * dt;
            part.velocity.x += Math.sin(part.life * 5) * 0.001;
            part.mesh.rotation.x += part.spinSpeed * dt;
            part.mesh.rotation.z += part.spinSpeed * 0.7 * dt;
            part.mesh.material.opacity = Math.min(0.8, part.life * 0.4);
        } else if (part.ragdoll) {
            part.mesh.rotation.z += part.rotSpeed * dt;
            part.mesh.scale.multiplyScalar(1 - 0.5 * dt);
            if (part.mesh.position.y > 0.2) part.velocity.y -= 0.05 * dt;
        } else {
            part.velocity.y -= 0.01 * dt;
        }
        if (part.life <= 0) { scene.remove(part.mesh); particles.splice(qi, 1); }
    }
    // Screen shake
    if (_shakeTimer > 0) {
        _shakeTimer -= dt;
        var _si = _shakeIntensity * Math.min(1, _shakeTimer * 10);
        camera.position.x += (Math.random() - 0.5) * _si;
        camera.position.y += (Math.random() - 0.5) * _si * 0.5;
        if (_shakeTimer <= 0) _shakeIntensity = 0;
    }
    // Kill feed timers
    if (_killFeed.length > 0) {
        var _kfChanged = false;
        for (var _ki = _killFeed.length - 1; _ki >= 0; _ki--) {
            _killFeed[_ki].timer -= dt;
            if (_killFeed[_ki].timer <= 0) { _killFeed.splice(_ki, 1); _kfChanged = true; }
        }
        if (_kfChanged) updateKillFeedUI();
    }
    gunGroup.position.z += (0 - gunGroup.position.z) * 15 * dt; gunGroup.rotation.x += (0 - gunGroup.rotation.x) * 15 * dt;
    // Prop Physics
    for (var _pi = 0; _pi < props.length; _pi++) {
        var p = props[_pi];
        if (p.velocity.length() > 0.01) {
            _pVel.copy(p.velocity).multiplyScalar(60 * dt);
            _ePos.copy(p.mesh.position).add(_pVel);
            if (!checkCollision(_ePos, 0.4)) {
                p.mesh.position.copy(_ePos);
                p.mesh.rotation.x += p.rotVelocity.x * dt * 60;
                p.mesh.rotation.y += p.rotVelocity.y * dt * 60;
                p.mesh.rotation.z += p.rotVelocity.z * dt * 60;
            } else {
                p.velocity.multiplyScalar(-0.5);
            }
            p.velocity.multiplyScalar(0.9);
            p.rotVelocity.multiplyScalar(0.9);
        }
        var pdist = p.mesh.position.distanceTo(camera.position);
        if (pdist < 1.2) {
            _eVec.subVectors(p.mesh.position, camera.position).normalize();
            _eVec.y = 0;
            p.velocity.add(_eVec.multiplyScalar(0.1));
            p.rotVelocity.set(Math.random(), Math.random(), Math.random()).multiplyScalar(0.1);
        }
    }

    // AI budget: sort by distance, run full AI only on nearest MAX_ACTIVE_AI enemies
    var MAX_ACTIVE_AI = 6;
    var _eiSorted = enemies.slice().sort(function(a, b) {
        return a.mesh.position.distanceTo(camera.position) - b.mesh.position.distanceTo(camera.position);
    });
    for (var _ei = 0; _ei < _eiSorted.length; _ei++) {
        var _e = _eiSorted[_ei];
        if (_ei < MAX_ACTIVE_AI) {
            // Full AI update (includes lookAt billboard)
            updateEnemy(_e, dt, time);
        } else {
            // Cheap: just keep sprite facing camera, skip all AI logic
            _eLook.set(camera.position.x, _e.mesh.position.y, camera.position.z);
            _e.mesh.lookAt(_eLook);
        }
    }
    updateDamageIndicator(dt);
    updateArcadeMode();

    updateUI();
    composer.render();
}

window._cycleQuality = function() { applyQuality((_quality + 1) % 3); };

window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    bloomPass.resolution.set(Math.floor(window.innerWidth / 2), Math.floor(window.innerHeight / 2));
});

// ─── Gallery ───────────────────────────────────────────────────────────────────
var ENEMY_CATALOG = [
    { id: 'sd',            name: 'SD-Aktivist',         hp: 30, dmg: 8,  flavor: 'Delar ut propaganda och besvikelser i lika delar.' },
    { id: 'jarnror',       name: 'Järnrör',             hp: 20, dmg: 12, flavor: 'Känd för sitt direkta politiska argument.' },
    { id: 'bss_retro',     name: 'BSS Retro',           hp: 25, dmg: 10, flavor: 'Nostalgisk efter 90-talets nedskärningar.' },
    { id: 'troll',         name: 'Troll-Operatör',      hp: 35, dmg: 5,  flavor: 'Saktar ner dig med logiska vurpor.' },
    { id: 'opinionsbildare', name: 'Opinionsbildare',   hp: 45, dmg: 10, flavor: 'Kallar på förstärkningar när det krisar.' },
    { id: 'jimmie',        name: 'Jimmie Åkesson',      hp: 150, dmg: 20, flavor: 'BOSS. Missbrukar debatträtten. Kan stunsas.' },
    { id: 'ebba',          name: 'Ebba Busch',          hp: 120, dmg: 15, flavor: 'BOSS. Falukorv-spin-attack. Cirkelrör sig.' },
    { id: 'ulf',           name: 'Ulf Kristersson',     hp: 100, dmg: 10, flavor: 'BOSS. Dash-attack + duckar när det krisar.' },
    { id: 'lars_werner',   name: 'Lars Werner',         hp: 80,  dmg: 0,  flavor: 'BOSS. Helar dig av misstag. Välmenande men ineffektiv.' }
];

window.showGallery = function() {
    document.getElementById('overlay').style.display = 'none';
    var gScreen = document.getElementById('galleryScreen');
    if (!gScreen) {
        gScreen = document.createElement('div');
        gScreen.id = 'galleryScreen';
        gScreen.className = 'game-screen';
        gScreen.style.cssText = 'background:rgba(0,0,0,0.97);overflow-y:auto;align-items:flex-start;padding:30px 20px';
        document.body.appendChild(gScreen);
    }
    var html = '<div style="font-family:\'Courier New\',monospace;color:#fc0;font-size:22px;font-weight:bold;margin-bottom:20px;text-align:center;text-shadow:0 0 10px #fc0">FIENDENS GALLERI</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;width:100%;max-width:900px;margin:0 auto">';
    ENEMY_CATALOG.forEach(function(en) {
        var isBoss = en.hp > 80;
        var borderColor = isBoss ? '#f44' : '#0c8';
        var canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        var { colorMap } = createEnemyTexture(en.id, 'idle', 0);
        html += '<div style="border:1px solid ' + borderColor + ';padding:14px;background:rgba(255,255,255,0.04);font-family:\'Courier New\',monospace">';
        html += '<div style="color:' + (isBoss ? '#f44' : '#0f0') + ';font-weight:bold;font-size:14px;margin-bottom:6px">' + (isBoss ? '☠ BOSS: ' : '') + en.name + '</div>';
        html += '<div style="color:#aaa;font-size:11px;margin-bottom:8px">' + en.flavor + '</div>';
        html += '<div style="color:#ccc;font-size:12px">HP: <span style="color:#f44">' + en.hp + '</span> &nbsp; SKADA: <span style="color:#fa0">' + (en.dmg > 0 ? en.dmg + '/s' : 'ingen') + '</span></div>';
        html += '</div>';
    });
    html += '</div>';
    html += '<div style="margin-top:28px;text-align:center"><button onclick="window.closeGallery()">STÄNG</button></div>';
    gScreen.innerHTML = html;
    gScreen.style.display = 'flex';
    gScreen.style.flexDirection = 'column';
};

window.closeGallery = function() {
    var gScreen = document.getElementById('galleryScreen');
    if (gScreen) gScreen.style.display = 'none';
    document.getElementById('overlay').style.display = 'flex';
};

// ─── Extras / Modifier selector ────────────────────────────────────────────────
window.showExtras = function() {
    document.getElementById('overlay').style.display = 'none';
    var eScreen = document.getElementById('extrasScreen');
    if (!eScreen) {
        eScreen = document.createElement('div');
        eScreen.id = 'extrasScreen';
        eScreen.className = 'game-screen';
        document.body.appendChild(eScreen);
    }
    var u = getUnlocks();
    var lb = getLeaderboard();
    function renderExtras() {
        var mods = state.modifiers;
        var html = '<div style="font-family:\'Courier New\',monospace;color:#fc0;font-size:22px;font-weight:bold;margin-bottom:20px;text-shadow:0 0 10px #fc0">EXTRAS &amp; MODIFIERARE</div>';
        // Leaderboard summary
        html += '<div style="font-family:\'Courier New\',monospace;font-size:13px;color:#aaa;margin-bottom:18px;max-width:500px;text-align:left">';
        html += '<div style="color:#fff;font-size:15px;font-weight:bold;margin-bottom:8px">TOPPLISTA (TOTAL)</div>';
        if (lb.total && lb.total.length > 0) {
            lb.total.forEach(function(e, i) {
                html += '<div style="color:' + (i === 0 ? '#fc0' : '#888') + '">#' + (i+1) + ' ' + e.score + ' poäng (' + e.grade + ') — ' + e.date + '</div>';
            });
        } else { html += '<div style="color:#555">Inga posters ännu. Klara spelet!</div>'; }
        html += '</div>';
        // Arcade leaderboard
        html += '<div style="font-family:\'Courier New\',monospace;font-size:13px;color:#aaa;margin-bottom:18px;max-width:500px;text-align:left">';
        html += '<div style="color:#0f0;font-size:15px;font-weight:bold;margin-bottom:8px">TOPPLISTA ARKAD</div>';
        if (lb.arcade && lb.arcade.length > 0) {
            lb.arcade.forEach(function(e, i) {
                html += '<div style="color:' + (i === 0 ? '#0f0' : '#666') + '">#' + (i+1) + ' Våg ' + e.wave + ' — ' + e.score + ' poäng — ' + e.date + '</div>';
            });
        } else { html += '<div style="color:#555">Inga arkadpoäng ännu.</div>'; }
        html += '</div>';
        // Per-level bests
        html += '<div style="font-family:\'Courier New\',monospace;font-size:12px;color:#aaa;margin-bottom:18px;max-width:500px;text-align:left">';
        html += '<div style="color:#fff;font-size:13px;font-weight:bold;margin-bottom:6px">BÄSTA PER NIVÅ</div>';
        for (var i = 0; i < 6; i++) {
            var k = 'l' + i; var lvBest = lb.levels && lb.levels[k];
            var lname = (LEVELS[i] || {}).name || ('Nivå ' + (i+1));
            html += '<div>' + lname + ': ' + (lvBest ? ('<span style="color:#fc0">' + lvBest.score + ' (' + lvBest.grade + ')</span>') : '<span style="color:#555">—</span>') + '</div>';
        }
        html += '</div>';
        // Modifiers
        html += '<div style="font-family:\'Courier New\',monospace;font-size:14px;color:#aaa;max-width:500px;text-align:left">';
        html += '<div style="color:#fff;font-size:15px;font-weight:bold;margin-bottom:10px">MODIFIERARE</div>';
        function modBtn(key, label, unlocked) {
            var active = mods[key];
            var btnStyle = unlocked
                ? 'cursor:pointer;padding:8px 16px;font-family:\'Courier New\',monospace;font-size:13px;font-weight:bold;border:2px solid ' + (active ? '#fc0' : '#555') + ';background:' + (active ? '#332200' : '#111') + ';color:' + (active ? '#fc0' : '#888') + ';margin-bottom:8px;display:block;width:100%'
                : 'padding:8px 16px;font-family:\'Courier New\',monospace;font-size:13px;border:1px solid #333;background:#111;color:#333;margin-bottom:8px;display:block;width:100%;cursor:default';
            var onclick = unlocked ? 'onclick="window.toggleModifier(\'' + key + '\')"' : '';
            return '<button ' + onclick + ' style="' + btnStyle + '">' + (unlocked ? (active ? '✓ ' : '○ ') : '🔒 ') + label + (unlocked ? '' : ' (lås upp genom att klara spelet)') + '</button>';
        }
        html += modBtn('bigHead', 'BIG HEAD-LÄGE (3x S-betyg)', !!u.bigHead);
        html += modBtn('fastEnemies', 'SNABBA FIENDER (klara spelet)', !!u.fastEnemies);
        html += modBtn('pistolOnly', 'BARA PISTOL (klara spelet)', !!u.pistolOnly);
        html += '</div>';
        html += '<div style="margin-top:24px"><button onclick="window.closeExtras()">STÄNG</button></div>';
        eScreen.innerHTML = html;
        eScreen.style.display = 'flex';
        eScreen.style.flexDirection = 'column';
    }
    window.toggleModifier = function(key) {
        state.modifiers[key] = !state.modifiers[key];
        renderExtras();
    };
    renderExtras();
};

window.closeExtras = function() {
    var eScreen = document.getElementById('extrasScreen');
    if (eScreen) eScreen.style.display = 'none';
    document.getElementById('overlay').style.display = 'flex';
};

// ─── Arcade mode ───────────────────────────────────────────────────────────────
var arcadeEnemies = [];
var arcadeWaveTimer = 0;
var ARCADE_ENEMY_TYPES = ['sd', 'jarnror', 'bss_retro', 'troll', 'opinionsbildare'];
var ARCADE_BOSS_TYPES  = ['jimmie', 'ebba', 'ulf', 'lars_werner'];

function generateArcadeArena() {
    // Clear scene first
    while(scene.children.length > 0) scene.remove(scene.children[0]);
    activeSlogans = []; particles = []; arcadeEnemies = [];
    enemies = []; exits = []; pickups = []; barrels = []; props = [];
    vendingMachines = []; secretWalls = []; toxicZones = []; crushers = []; alarmPanels = [];

    var W = 20, H = 20;
    var wallMat = new THREE.MeshStandardMaterial({ color: 0x334433 });
    var floorMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    var cellSize = 2;

    // Floor
    var floorGeo = new THREE.PlaneGeometry(W * cellSize, H * cellSize);
    floorGeo.rotateX(-Math.PI / 2);
    var floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(W, 0, H);
    scene.add(floor);

    // Outer walls
    walls = [];
    var wallGeo = new THREE.BoxGeometry(cellSize, cellSize * 2, cellSize);
    function addWall(x, z) {
        var m = new THREE.Mesh(wallGeo, wallMat);
        m.position.set(x * cellSize + 1, 1, z * cellSize + 1);
        scene.add(m); walls.push(m);
    }
    for (var x = 0; x < W; x++) { addWall(x, 0); addWall(x, H-1); }
    for (var z = 1; z < H-1; z++) { addWall(0, z); addWall(W-1, z); }

    // Procedural pillars (random interior walls for cover)
    for (var pi = 0; pi < 12; pi++) {
        var px = 2 + Math.floor(Math.random() * (W - 4));
        var pz = 2 + Math.floor(Math.random() * (H - 4));
        if (Math.abs(px - W/2) < 2 && Math.abs(pz - H/2) < 2) continue; // keep center clear
        addWall(px, pz);
        if (Math.random() > 0.4) addWall(px + 1, pz);
        if (Math.random() > 0.4) addWall(px, pz + 1);
    }

    rebuildCollisionCache();

    // Lights
    var ambient = new THREE.AmbientLight(0xffffff, 0.6); scene.add(ambient);
    var playerLight = new THREE.PointLight(0xffffff, 20, 20);
    playerLight.castShadow = true;
    playerLight.shadow.mapSize.width = 256; playerLight.shadow.mapSize.height = 256;
    camera.add(playerLight);
    scene.add(gunLight); scene.add(camera);
    // Eerie arena lights
    for (var li = 0; li < 4; li++) {
        var aLight = new THREE.PointLight(0x00ff44, 8, 15);
        aLight.position.set(5 + li * 7, 2, 10 + (li % 2) * 4);
        scene.add(aLight);
    }
    scene.fog = new THREE.FogExp2(0x001100, 0.04);
    scene.background = new THREE.Color(0x001100);

    camera.position.set(W, 1.6, H);

    // HUD update for arcade
    var missionEl = document.getElementById('mission-text');
    if (missionEl) missionEl.textContent = '- Överlev så länge du kan\n- Klara våg ' + (state.arcadeWave + 1);
    showMessage('ARKADLÄGE!', 'Klara våg ' + (state.arcadeWave + 1));
}

function spawnArcadeWave(wave) {
    state.arcadeWave = wave;
    var count = 3 + wave * 2;
    var isBossWave = (wave > 0 && wave % 5 === 0);
    var types = isBossWave
        ? [ARCADE_BOSS_TYPES[Math.floor(Math.random() * ARCADE_BOSS_TYPES.length)]]
        : ARCADE_ENEMY_TYPES;
    count = isBossWave ? 1 : Math.min(count, 12);
    showMessage('VÅG ' + (wave + 1), isBossWave ? 'BOSS-VÅG!' : count + ' fiender');
    if (isBossWave) playSound('bossAlert'); else playSound('enemyAlert');

    for (var i = 0; i < count; i++) {
        (function(idx) {
            setTimeout(function() {
                var etype = isBossWave ? types[0] : types[Math.floor(Math.random() * types.length)];
                var angle = (idx / count) * Math.PI * 2;
                var spawnX = 20 + Math.cos(angle) * 12;
                var spawnZ = 20 + Math.sin(angle) * 12;
                var hp = isBossWave ? 200 + wave * 20 : 30 + wave * 5;
                var { colorMap, normalMap } = createEnemyTexture(etype, 'idle', idx % 8);
                var mat = new THREE.MeshStandardMaterial({ map: colorMap, normalMap: normalMap, normalScale: new THREE.Vector2(1,1), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
                var geom = new THREE.PlaneGeometry(3, 3);
                var mesh = new THREE.Mesh(geom, mat);
                mesh.position.set(spawnX, 1.5, spawnZ);
                mesh.castShadow = false; mesh.receiveShadow = false;
                scene.add(mesh);
                var en = {
                    mesh: mesh, type: etype, hp: hp, maxHp: hp, state: 'chase',
                    speed: 3 + wave * 0.3,
                    patrolOriginX: spawnX, patrolOriginZ: spawnZ,
                    patrolTargetX: spawnX, patrolTargetZ: spawnZ,
                    patrolPause: 0, footstepTimer: 0, alertCooldown: 0
                };
                enemies.push(en); arcadeEnemies.push(en);
                if (state.modifiers.bigHead) mesh.scale.set(2, 1, 1);
            }, idx * 300);
        })(i);
    }

    var missionEl = document.getElementById('mission-text');
    if (missionEl) missionEl.textContent = '- Överlev så länge du kan\n- VÅG ' + (wave + 1);
}

window.startArcade = function() {
    document.getElementById('overlay').style.display = 'none';
    var eScreen = document.getElementById('extrasScreen');
    if (eScreen) eScreen.style.display = 'none';
    initAudio();
    state.kills = 0; state.shotsFired = 0; state.shotsHit = 0;
    state.gameTime = 0; state.level = 0; state.weapon = 1; state.inventory = [1];
    state.lives = 3; state.health = 100; state.ammo = 50; state.arcadeMode = true;
    state.arcadeWave = 0; state.arcadeScore = 0; state.dead = false; state.playing = true;
    if (state.modifiers.pistolOnly) { state.inventory = [1]; }
    buildGunModel(1);
    generateArcadeArena();
    spawnArcadeWave(0);
    controls.lock();
    startMusic('combat');
};

// Check arcade wave completion in game loop
function updateArcadeMode() {
    if (!state.arcadeMode || !state.playing) return;
    var remaining = enemies.filter(function(e) { return e.hp > 0; }).length;
    if (remaining === 0 && arcadeEnemies.length > 0) {
        // Wave cleared
        arcadeEnemies = [];
        state.arcadeScore += 500 + state.arcadeWave * 200;
        state.score = state.arcadeScore;
        // Drop health + ammo pack
        var packPos = new THREE.Vector3(20, 0.5, 20);
        var hpGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        var hpMat = new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0xff2222, emissiveIntensity: 0.5 });
        var hpMesh = new THREE.Mesh(hpGeo, hpMat);
        hpMesh.position.copy(packPos);
        scene.add(hpMesh);
        pickups.push({ type: 'health', mesh: hpMesh, active: true });
        var amGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        var amMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xaaaa00, emissiveIntensity: 0.5 });
        var amMesh = new THREE.Mesh(amGeo, amMat);
        amMesh.position.set(21, 0.5, 20);
        scene.add(amMesh);
        pickups.push({ type: 'ammo', mesh: amMesh, active: true });

        setTimeout(function() {
            if (state.arcadeMode && state.playing) {
                spawnArcadeWave(state.arcadeWave + 1);
            }
        }, 2500);
    }
}

// Startup: let browser paint loading screen before first (shader-compiling) render
(function() {
    var _sl = document.getElementById('startup-loading');
    var _sm = document.getElementById('startup-msg');
    requestAnimationFrame(function() {
        // Browser has painted "INITIERAR GRAFIK..." — now start render loop
        // First animate() call compiles shaders (brief freeze here, not blank screen)
        animate();
        requestAnimationFrame(function() {
            // First frame done — remove loading overlay
            if (_sl) _sl.style.display = 'none';
        });
    });
})();
