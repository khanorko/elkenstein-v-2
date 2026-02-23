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
    ammoType: 0, ngPlus: false
};

const CRTShader = {
    uniforms: { "tDiffuse": { value: null }, "time": { value: 0 }, "curvature": { value: new THREE.Vector2(3.5, 3.5) } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float time; varying vec2 vUv;
        void main() { vec2 uv = vUv;
            float scanline = sin(uv.y * 800.0 + time * 10.0) * 0.04;
            float r = texture2D(tDiffuse, uv + vec2(0.002, 0.0)).r;
            float g = texture2D(tDiffuse, uv).g;
            float b = texture2D(tDiffuse, uv - vec2(0.002, 0.0)).b;
            float vig = (0.8 + 0.2*16.0*uv.x*uv.y*(1.0-uv.x)*(1.0-uv.y));
            gl_FragColor = vec4(vec3(r,g,b) * vig - scanline, 1.0); }`
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

let walls = [], doors = [], enemies = [], exits = [], activeSlogans = [], particles = [], pickups = [], barrels = [], props = [], vendingMachines = [];

function loadLevel(index) {
    while(scene.children.length > 0) scene.remove(scene.children[0]);
    activeSlogans = []; particles = [];
    state.health = 100; state.ammo = Math.max(state.ammo, 30); state.dead = false; updateUI();

    const data = buildLevel(index, scene);
    walls = data.walls; doors = data.doors; enemies = data.enemies; exits = data.exits;
    pickups = data.pickups || []; barrels = data.barrels || []; props = data.props || []; 
    vendingMachines = data.vendingMachines || [];
    camera.position.copy(data.playerStart);
    // New Game Plus: double enemy HP
    if (state.ngPlus) enemies.forEach(function(e) { e.hp *= 2; });

    const ambient = new THREE.AmbientLight(0xffffff, 0.8); scene.add(ambient);
    const playerLight = new THREE.PointLight(0xffffff, 20, 20);
    playerLight.position.set(0, 0, 0); playerLight.castShadow = true;
    playerLight.shadow.mapSize.width = 256; playerLight.shadow.mapSize.height = 256;
    camera.add(playerLight);
    scene.add(gunLight); gunLight.castShadow = true; scene.add(camera);
    scene.fog = new THREE.FogExp2(LEVELS[index].sky, 0.03);
    scene.background = new THREE.Color(LEVELS[index].sky);

    const decoTypes = ['swedish', 'nydemokrati', 'ultima_thule', 'valstuga', 'demokrati', 'foliehatt', 'jarnror_prop'];
    walls.forEach(wall => {
        if (Math.random() > 0.7) {
            const type = decoTypes[Math.floor(Math.random() * decoTypes.length)];
            const { colorMap, normalMap } = createWallDecoration(type);
            wall.material = new THREE.MeshStandardMaterial({ map: colorMap, normalMap, normalScale: new THREE.Vector2(1.5, 1.5), roughness: 0.6, metalness: 0.1 });
        }
    });
    rebuildCollisionCache();
    // Set reverb based on level
    setReverb(index >= 3 ? 'large' : index >= 1 ? 'medium' : 'small');
    // Update mission list
    var missionEl = document.getElementById('mission-text');
    if (missionEl) missionEl.textContent = levelMissions[index] || '- Besegra alla fiender';
    showMessage(LEVELS[index].name, LEVELS[index].subtitle);
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

function getStatsHTML() {
    var acc = state.shotsFired > 0 ? Math.round((state.shotsHit / state.shotsFired) * 100) : 0;
    var m = Math.floor(state.gameTime / 60), s = Math.floor(state.gameTime % 60);
    return 'FIENDER BESEGRADE: ' + state.kills + '<br>TRÄFFSÄKERHET: ' + acc + '%<br>TID: ' + m + ':' + (s < 10 ? '0' + s : s) + '<br>DEMOKRATIPOÄNG: ' + state.score;
}

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
    controls.lock(); document.getElementById('overlay').style.display = 'none';
    initAudio(); state.playing = true; state.kills = 0; state.shotsFired = 0; state.shotsHit = 0;
    state.gameTime = 0; state.level = 0; state.weapon = 1; state.inventory = [1];
    buildGunModel(1); loadLevel(state.level); startMusic('exploration'); startAmbient();
});

var MAX_PARTICLES = 150;
function spawnParticles(pos, color, count, size) {
    count = count || 10; size = size || 0.05;
    // Cap total particles
    if (particles.length > MAX_PARTICLES) count = Math.max(1, Math.floor(count / 3));
    var geom = new THREE.BoxGeometry(size, size, size);
    for (var i = 0; i < count; i++) {
        var mat = new THREE.MeshBasicMaterial({ color: color }); var mesh = new THREE.Mesh(geom, mat);
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
        if (door) { door.open = !door.open; playSound('door'); }
    }
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
    gunLight.intensity = 15; gunLight.position.copy(camera.position);
    var fl = gunGroup.getObjectByName('flash');
    if (fl) { fl.material.opacity = 1; fl.rotation.z = Math.random() * Math.PI; }
    gunGroup.position.z = 0.15; gunGroup.rotation.x = 0.1; shootCooldown = wp.cooldown;
    var pellets = wp.pellets || 1; var hit = false;
    for (var p = 0; p < pellets; p++) {
        var extraSpread = state.ammoType === 1 ? 0.04 : 0; // Hålspets has more spread
        _shootSpread.set((Math.random()-0.5)*(wp.spread+extraSpread), (Math.random()-0.5)*(wp.spread+extraSpread));
        _shootRC.setFromCamera(_shootSpread, camera);
        var eh = _shootRC.intersectObjects(enemies.map(function(e) { return e.mesh; }));
        if (eh.length > 0 && eh[0].distance < 20) {
            var en = enemies.find(function(e) { return e.mesh === eh[0].object; });
            if (en) {
                var dmg = wp.damage; if (en.state === 'debate') dmg *= 2;
                // Ammo type modifiers
                if (state.ammoType === 1) dmg = Math.round(dmg * 1.5); // Hålspets
                if (state.ammoType === 2 && Math.random() > 0.6) { en.state = 'debate'; en.stateTimer = 1.5; } // Debatt
                // Pressekreterare: Shield blocks frontal damage
                if (en.type === 'pressekreterare') {
                    var toPlayer = new THREE.Vector3().subVectors(camera.position, en.mesh.position).normalize();
                    var enemyFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(en.mesh.quaternion);
                    if (toPlayer.dot(enemyFwd) > -0.3) { // Facing player = shielded
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
                    scene.remove(en.mesh); enemies.splice(enemies.indexOf(en), 1); state.kills++;
                    addCombo();
                }
            }
        } else {
            var wh = _shootRC.intersectObjects(walls.concat(doors.map(function(d) { return d.mesh; })));
            if (wh.length > 0 && wh[0].distance < 30) {
                spawnParticles(wh[0].point, 0xaaaaaa, 8, 0.03);
                if (Math.random() > 0.6) spawnPaperParticles(wh[0].point);
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
                scene.remove(e.mesh); enemies.splice(enemies.indexOf(e), 1); state.kills++;
                addCombo();
            } else { e.state = 'chase'; }
        }
    });
    // Damage player if close
    var pd = camera.position.distanceTo(barrel.mesh.position);
    if (pd < 5) {
        var pdmg = Math.round(30 * (1 - pd/5));
        if (state.armor > 0) { var abs = Math.min(state.armor, pdmg * 0.7); state.armor -= abs; pdmg -= abs; }
        state.health -= pdmg; playSound('playerHurt'); updateUI();
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
                scene.remove(e.mesh); enemies.splice(enemies.indexOf(e), 1); state.kills++;
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
        case 'Digit2': if (state.inventory.includes(2)) { state.weapon = 2; buildGunModel(2); updateUI(); } break;
        case 'Digit3': if (state.inventory.includes(3)) { state.weapon = 3; buildGunModel(3); updateUI(); } break;
        case 'Digit4': if (state.inventory.includes(4)) { state.weapon = 4; buildGunModel(4); updateUI(); } break;
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
    return false;
}

function pickPatrolTarget(e) {
    for (var i = 0; i < 10; i++) {
        var tx = e.patrolOriginX + (Math.random()-0.5)*12, tz = e.patrolOriginZ + (Math.random()-0.5)*12;
        if (!checkCollision(new THREE.Vector3(tx, e.mesh.position.y, tz), 0.5)) { e.patrolTargetX = tx; e.patrolTargetZ = tz; return; }
    }
    e.patrolTargetX = e.patrolOriginX; e.patrolTargetZ = e.patrolOriginZ;
}

function updateEnemy(e, dt, time) {
    e.mesh.lookAt(new THREE.Vector3(camera.position.x, e.mesh.position.y, camera.position.z));
    var dist = e.mesh.position.distanceTo(camera.position);
    if (e.alertCooldown > 0) e.alertCooldown -= dt;

    if (e.state === 'debate') { e.stateTimer -= dt; if (e.stateTimer <= 0) e.state = 'chase'; return; }

    // Boss-specific AI
    var isBoss = e.type === 'jimmie' || e.type === 'ebba' || e.type === 'ulf' || e.type === 'lars_werner';

    // Ulf: Dash attack (fast lunge toward player)
    if (e.type === 'ulf' && e.state === 'chase' && dist < 10 && dist > 3) {
        if (!e.dashCooldown) e.dashCooldown = 0;
        e.dashCooldown -= dt;
        if (e.dashCooldown <= 0) {
            var dashDir = new THREE.Vector3().subVectors(camera.position, e.mesh.position).normalize().multiplyScalar(12 * dt);
            dashDir.y = 0;
            var dashPos = e.mesh.position.clone().add(dashDir);
            if (!checkCollision(dashPos, 0.5)) e.mesh.position.copy(dashPos);
            e.dashCooldown = 2 + Math.random() * 2;
            if (Math.random() > 0.7) spawnSlogan(e.mesh.position, 'ulf');
        }
    }
    // Ulf: Duck (crouch, harder to hit)
    if (e.type === 'ulf' && e.state === 'chase') {
        if (!e.duckTimer) e.duckTimer = 0;
        e.duckTimer -= dt;
        if (e.duckTimer <= 0 && Math.random() > 0.99) {
            e.mesh.scale.y = 0.5; e.mesh.position.y = 0.75;
            e.duckTimer = 1.5;
            setTimeout(function() { if (e.mesh) { e.mesh.scale.y = 1; e.mesh.position.y = 1.5; } }, 800);
        }
    }

    // Ebba: Falukorv-spin (circular strafe + area damage)
    if (e.type === 'ebba' && e.state === 'chase' && dist < 5) {
        var spinAngle = time * 4;
        var spinRadius = 3;
        var spinX = camera.position.x + Math.cos(spinAngle) * spinRadius;
        var spinZ = camera.position.z + Math.sin(spinAngle) * spinRadius;
        var spinTarget = new THREE.Vector3(spinX, e.mesh.position.y, spinZ);
        var spinDir = new THREE.Vector3().subVectors(spinTarget, e.mesh.position).normalize().multiplyScalar(5 * dt);
        spinDir.y = 0;
        var spinPos = e.mesh.position.clone().add(spinDir);
        if (!checkCollision(spinPos, 0.5)) e.mesh.position.copy(spinPos);
        e.mesh.rotation.y += 8 * dt;
        if (dist < 2.5) {
            var rawDmg = 15 * dt;
            if (state.armor > 0) { var abs = Math.min(state.armor, rawDmg * 0.7); state.armor -= abs; rawDmg -= abs; }
            state.health -= rawDmg; updateUI();
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
            playSound('pickup'); updateUI();
        }
    }

    // Pressekreterare: Shield - only takes damage from behind (handled in doShoot)
    // Opinionsbildare: Summon reinforcements
    if (e.type === 'opinionsbildare' && e.state === 'chase' && dist < 10) {
        if (!e.summonCooldown) e.summonCooldown = 0;
        e.summonCooldown -= dt;
        if (e.summonCooldown <= 0 && enemies.length < 20) {
            e.summonCooldown = 8;
            var spawnPos = e.mesh.position.clone().add(new THREE.Vector3((Math.random()-0.5)*4, 0, (Math.random()-0.5)*4));
            if (!checkCollision(spawnPos, 0.5)) {
                var types = ['sd', 'jarnror', 'bss_retro'];
                var st = types[Math.floor(Math.random() * types.length)];
                var sv = Math.floor(Math.random() * 10);
                var { colorMap, normalMap } = createEnemyTexture(st, 'idle', sv);
                var smat = new THREE.MeshStandardMaterial({ map: colorMap, normalMap: normalMap, normalScale: new THREE.Vector2(1,1), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
                var sgeom = new THREE.PlaneGeometry(3, 3);
                var smesh = new THREE.Mesh(sgeom, smat);
                smesh.position.copy(spawnPos); smesh.castShadow = true; smesh.receiveShadow = true;
                scene.add(smesh);
                enemies.push({ mesh: smesh, type: st, hp: 30, variant: sv, state: 'chase', stateTimer: 0,
                    patrolOriginX: spawnPos.x, patrolOriginZ: spawnPos.z, patrolTargetX: spawnPos.x, patrolTargetZ: spawnPos.z,
                    patrolPause: 0, footstepTimer: 0, alertCooldown: 0 });
                playSound('enemyAlert'); showMessage('FÖRSTÄRKNING!', 'Opinionsbildaren kallade på hjälp!');
            }
        }
    }

    // Troll-operatör: Slows player when close
    if (e.type === 'troll' && e.state === 'chase' && dist < 8 && dist > 2) {
        if (!e.trollCooldown) e.trollCooldown = 0;
        e.trollCooldown -= dt;
        if (e.trollCooldown <= 0) {
            e.trollCooldown = 4;
            state.speedBoost = -3; // Negative = slow
            spawnSlogan(e.mesh.position, 'debate');
            showMessage('LOGISK VURPA!', 'Du saktas ner...');
        }
    }

    // Cowardice: flee when low HP (non-boss)
    if (!isBoss && e.hp < 15 && e.state === 'chase' && dist < 8) {
        var awayDir = new THREE.Vector3().subVectors(e.mesh.position, camera.position).normalize().multiplyScalar(4 * dt);
        awayDir.y = 0;
        var fleePos = e.mesh.position.clone().add(awayDir);
        if (!checkCollision(fleePos, 0.5)) e.mesh.position.copy(fleePos);
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
            var dir = new THREE.Vector3(dx,0,dz).normalize().multiplyScalar(1.5*dt);
            var np = e.mesh.position.clone().add(dir);
            if (!checkCollision(np, 0.5)) e.mesh.position.copy(np); else pickPatrolTarget(e);
            e.footstepTimer -= dt;
            if (e.footstepTimer <= 0 && dist < 15) {
                var fwd = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
                playPositionalSound('enemyFootstep', camera.position, fwd, e.mesh.position);
                e.footstepTimer = 0.6;
            }
        }
    }

    if (e.state === 'chase' && dist > 1.2) {
        // AI coordination: wait if allies are flanking from the other side
        var nearbyAllies = 0;
        for (var k = 0; k < enemies.length; k++) {
            if (enemies[k] !== e && enemies[k].state === 'chase' && enemies[k].mesh.position.distanceTo(e.mesh.position) < 6) nearbyAllies++;
        }
        // Slow down if waiting for coordination (but not if solo)
        var coordSpeed = nearbyAllies > 0 && Math.sin(time + e.patrolOriginX * 3) > 0.3 ? 2.0 : 3.5;

        var tp = new THREE.Vector3().subVectors(camera.position, e.mesh.position).normalize();
        var flank = new THREE.Vector3(-tp.z, 0, tp.x).multiplyScalar(Math.sin(time*2+e.patrolOriginX)*2);
        var cdir = new THREE.Vector3().subVectors(camera.position.clone().add(flank), e.mesh.position).normalize().multiplyScalar(coordSpeed*dt);
        cdir.y = 0;
        var cnp = e.mesh.position.clone().add(cdir);
        if (!checkCollision(cnp, 0.5)) e.mesh.position.copy(cnp);
        e.footstepTimer -= dt;
        if (e.footstepTimer <= 0 && dist < 15) {
            var fwd2 = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
            playPositionalSound('enemyFootstep', camera.position, fwd2, e.mesh.position);
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
        state.health -= rawDmg;
        if (Math.random() > 0.95) { playSound('damageHit'); showDamageDirection(e.mesh.position); }
        _dom.vig.style.boxShadow = state.health < 30 ? 'inset 0 0 100px rgba(255,0,0,0.5)' : 'inset 0 0 100px rgba(0,0,0,0.8)';
        updateUI();
        if (Math.random() > 0.98) spawnSlogan(e.mesh.position, e.type);
        if (state.health <= 0 && !state.dead) playerDied();
    }
}

var dmgIndicatorTimers = { top: 0, right: 0, bottom: 0, left: 0 };
function showDamageDirection(enemyPos) {
    var toEnemy = new THREE.Vector3().subVectors(enemyPos, camera.position);
    toEnemy.y = 0; toEnemy.normalize();
    var forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0; forward.normalize();
    var right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0; right.normalize();
    var dotFwd = forward.dot(toEnemy), dotRight = right.dot(toEnemy);
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
    state.dead = true; state.playing = false; playSound('gameOver'); stopMusic(); stopAmbient();
    _dom.vig.style.background = 'rgba(255,0,0,0.5)';
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

window.startNextLevel = function() {
    document.getElementById('levelScreen').style.display = 'none';
    state.playing = true; loadLevel(state.level); controls.lock();
    startMusic(state.level === LEVELS.length - 1 ? 'boss' : 'exploration'); startAmbient();
};

window.showMenu = function() {
    document.getElementById('winScreen').style.display = 'none';
    document.getElementById('overlay').style.display = 'flex';
    state.playing = false; state.ngPlus = false; stopMusic(); stopAmbient();
};

window.startNewGamePlus = function() {
    document.getElementById('winScreen').style.display = 'none';
    state.ngPlus = true; state.level = 0; state.playing = true;
    state.health = 100; state.ammo = 50; state.armor = 50;
    state.kills = 0; state.shotsFired = 0; state.shotsHit = 0; state.gameTime = 0; state.score = 0;
    loadLevel(0); controls.lock(); startMusic('combat'); startAmbient();
    showMessage('NEW GAME+', 'Fiender har 2x HP!');
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
    compass: document.getElementById('compass-strip'),
    mmCvs: document.getElementById('minimap-canvas'),
    vig: document.getElementById('vignette'),
    dmgTop: document.getElementById('dmg-top'),
    dmgRight: document.getElementById('dmg-right'),
    dmgBottom: document.getElementById('dmg-bottom'),
    dmgLeft: document.getElementById('dmg-left')
};
var _mmCtx = _dom.mmCvs.getContext('2d');
var _minimapFrame = 0;
var _wn = { 1: 'PISTOL', 2: 'KULSPRUTA', 3: 'HAGELGEVÄR', 4: 'FOLKVETT' };
var _ammoTypes = ['STD', 'HP', 'DBT'];

// --- UI UPDATES (merged: health, ammo, compass, minimap) ---
function updateUI() {
    // Health bar
    _dom.hb.style.width = Math.max(0, state.health) + '%';
    _dom.ht.textContent = Math.ceil(state.health) + '%';
    _dom.hb.style.background = state.health < 30 ? '#f00' : '#0f0';
    _dom.ammo.textContent = 'AMMO: ' + state.ammo + ' | ' + _wn[state.weapon] + ' [' + _ammoTypes[state.ammoType] + ']';
    if (_dom.armor) { _dom.armor.style.display = state.armor > 0 ? 'block' : 'none'; _dom.armor.textContent = 'ARMOR: ' + Math.ceil(state.armor); }
    if (_dom.score) _dom.score.textContent = 'POÄNG: ' + state.score;
    if (_dom.combo) _dom.combo.textContent = state.combo >= 2 ? 'COMBO x' + state.combo : '';

    // Compass
    var degree = THREE.MathUtils.radToDeg(camera.rotation.y) % 360;
    _dom.compass.style.transform = 'translateX(' + (-(degree / 90) * 150) + 'px)';

    // Minimap - only redraw every 6th frame
    _minimapFrame++;
    if (_minimapFrame % 6 === 0) {
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
        shootCooldown -= dt; meleeCooldown -= dt;
        if (state.comboTimer > 0) { state.comboTimer -= dt; if (state.comboTimer <= 0) state.combo = 0; }
        if (mouseDown && shootCooldown <= 0 && state.ammo > 0) doShoot();
        if (state.health < 25 && state.health > 0) { heartbeatTimer -= dt; if (heartbeatTimer <= 0) { playSound('heartbeat'); heartbeatTimer = 1.2 - (25 - state.health) * 0.03; } }

        if (state.speedBoost > 0) state.speedBoost -= dt;
        else if (state.speedBoost < 0) state.speedBoost = Math.min(0, state.speedBoost + dt);
        var speed = (state.speedBoost > 0 ? 15.0 : state.speedBoost < 0 ? 5.0 : 10.0) * dt;
        var moveDir = new THREE.Vector3();
        if (moveState.fwd) moveDir.z -= 1;
        if (moveState.back) moveDir.z += 1;
        if (moveState.left) moveDir.x -= 1;
        if (moveState.right) moveDir.x += 1;

        if (moveDir.length() > 0) {
            var wd = moveDir.clone().applyQuaternion(camera.quaternion); wd.y = 0; wd.normalize();
            var nx = camera.position.clone().add(new THREE.Vector3(wd.x * speed, 0, 0));
            if (!checkCollision(nx, 0.3)) camera.position.x = nx.x;
            var nz = camera.position.clone().add(new THREE.Vector3(0, 0, wd.z * speed));
            if (!checkCollision(nz, 0.3)) camera.position.z = nz.z;
            gunGroup.position.y = Math.sin(time * 12) * 0.015; gunGroup.position.x = Math.cos(time * 6) * 0.01;
            playerFootstepTimer -= dt;
            if (playerFootstepTimer <= 0) {
                var fsound = state.level === 2 ? 'footstepMetal' : state.level === 1 ? 'footstepStone' : 'playerFootstep';
                playSound(fsound); playerFootstepTimer = 0.4;
            }
        }

        exits.forEach(function(exit) {
            if (camera.position.distanceTo(exit.position) < 1.5) {
                state.level++; playSound('levelComplete');
                if (state.level < LEVELS.length) {
                    state.playing = false; stopMusic();
                    document.getElementById('levelTitle').textContent = 'NIVÅ ' + (state.level + 1);
                    document.getElementById('levelSub').textContent = LEVELS[state.level].name + ' - ' + LEVELS[state.level].subtitle;
                    document.getElementById('levelStats').innerHTML = getStatsHTML();
                    document.getElementById('levelScreen').style.display = 'flex'; document.exitPointerLock();
                } else {
                    state.playing = false; stopMusic(); playSound('victory');
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
                        playSound('weaponPickup'); showMessage('FOLKVETT-BROSCHYR!', 'Stunnar fiender med debatt'); break;
                }
                updateUI();
            }
        }
    }

    doors.forEach(function(d) { d.mesh.position.y = Math.lerp(d.mesh.position.y, d.open ? 6 : 2, 5 * dt); });
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
    gunGroup.position.z += (0 - gunGroup.position.z) * 15 * dt; gunGroup.rotation.x += (0 - gunGroup.rotation.x) * 15 * dt;
    // Prop Physics
    props.forEach(p => {
        if (p.velocity.length() > 0.01) {
            const nextPos = p.mesh.position.clone().add(p.velocity.clone().multiplyScalar(60 * dt));
            if (!checkCollision(nextPos, 0.4)) {
                p.mesh.position.copy(nextPos);
                p.mesh.rotation.x += p.rotVelocity.x * dt * 60;
                p.mesh.rotation.y += p.rotVelocity.y * dt * 60;
                p.mesh.rotation.z += p.rotVelocity.z * dt * 60;
            } else {
                p.velocity.multiplyScalar(-0.5); // Bounce
            }
            p.velocity.multiplyScalar(0.9); // Friction
            p.rotVelocity.multiplyScalar(0.9);
        }

        // Kick logic
        const dist = p.mesh.position.distanceTo(camera.position);
        if (dist < 1.2) {
            const kickDir = new THREE.Vector3().subVectors(p.mesh.position, camera.position).normalize();
            kickDir.y = 0;
            p.velocity.add(kickDir.multiplyScalar(0.1));
            p.rotVelocity.set(Math.random(), Math.random(), Math.random()).multiplyScalar(0.1);
        }
    });

    for (var _ei = 0; _ei < enemies.length; _ei++) {
        var _e = enemies[_ei];
        // Skip AI update for distant idle enemies
        if (_e.state === 'idle' && _e.mesh.position.distanceTo(camera.position) > 25) continue;
        updateEnemy(_e, dt, time);
    }
    updateDamageIndicator(dt);

    updateUI();
    composer.render();
}

window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    bloomPass.resolution.set(Math.floor(window.innerWidth / 2), Math.floor(window.innerHeight / 2));
});

animate();
