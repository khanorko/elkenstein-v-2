import * as THREE from 'three';
import { createEnemyTexture } from './assets.js';

export const LEVELS = [
    {
        name: "Riksdagshuset",
        subtitle: "Rensa korridorerna",
        sky: 0x1a1a2e,
        floor: 0x222222,
        map: [
            "################",
            "#..............#",
            "#..###..###....#",
            "#..#......#..D.#",
            "#..#......#..###",
            "#..###..###....#",
            "#..............#",
            "#....####......#",
            "#....#..#..##..#",
            "#....#..#..#...#",
            "#....####..#.E.#",
            "#..........#...#",
            "#..##..##..##D##",
            "#...........E..#",
            "#..P...........#",
            "################",
        ],
        enemyData: [
            { type: 'bss_retro', x: 14, z: 2 },
            { type: 'jarnror', x: 5, z: 5 },
            { type: 'sd', x: 12, z: 10 },
            { type: 'ian_bert', x: 8, z: 3, variant: 0 },
            { type: 'ian_bert', x: 10, z: 3, variant: 1 },
            { type: 'lars_werner', x: 2, z: 14 },
            { type: 'nmr_elite', x: 14, z: 13 },
            { type: 'm_retro', x: 1, z: 8 }
        ],
        propData: [
            { type: 'bin', x: 7, z: 14 },
            { type: 'bin', x: 1, z: 1 },
            { type: 'chair', x: 4, z: 4 },
            { type: 'chair', x: 10, z: 13 }
        ],
        pickupData: [
            { type: 'health', x: 6, z: 8 },
            { type: 'ammo', x: 10, z: 6 },
            { type: 'ammo', x: 3, z: 12 },
            { type: 'armor', x: 12, z: 5 },
            { type: 'coffee', x: 1, z: 2 },
            { type: 'folkvett', x: 8, z: 12 }
        ],
        barrelData: [
            { x: 7, z: 7 },
            { x: 13, z: 11 }
        ],
        propData: [
            { type: 'bin', x: 7, z: 14 },
            { type: 'bin', x: 1, z: 1 },
            { type: 'chair', x: 4, z: 4 },
            { type: 'chair', x: 10, z: 13 }
        ]
    },
    {
        name: "Propagandafabriken",
        subtitle: "Möt Ebba Busch",
        sky: 0x221a1a,
        floor: 0x111111,
        map: [
            "####################",
            "#..................#",
            "#..##..####..##....#",
            "#..#....##....#..D.#",
            "#..#....##....#..###",
            "#..##..####..##....#",
            "#..................#",
            "#...####..####.....#",
            "#...#........#.....#",
            "#...#........#.....#",
            "#...####..####.....#",
            "#..................#",
            "#..##.##..##.##..###",
            "#..............#.E.#",
            "#......P.......#...#",
            "#..............#...#",
            "#..####..####..#D###",
            "#..................#",
            "####################",
        ],
        enemyData: [
            { type: 'ebba', x: 5, z: 8 },
            { type: 'sd', x: 17, z: 3 },
            { type: 'pressekreterare', x: 10, z: 2 },
            { type: 'opinionsbildare', x: 14, z: 14 },
            { type: 'troll', x: 3, z: 17 }
        ],
        pickupData: [
            { type: 'machinegun', x: 15, z: 10 },
            { type: 'health', x: 8, z: 14 },
            { type: 'ammo', x: 3, z: 5 },
            { type: 'health', x: 12, z: 17 },
            { type: 'semla', x: 17, z: 11 },
            { type: 'coffee', x: 6, z: 6 }
        ],
        barrelData: [
            { x: 9, z: 7 },
            { x: 4, z: 15 },
            { x: 16, z: 16 }
        ]
    },
    {
        name: "Slutdebatten",
        subtitle: "Besegra Jimmie Åkesson",
        sky: 0x000033,
        floor: 0x444400,
        map: [
            "######################",
            "#....................#",
            "#..####......####....#",
            "#..#..#......#..#..D.#",
            "#..#..#......#..#..###",
            "#..####......####....#",
            "#....................#",
            "#....##########......#",
            "#....#........#......#",
            "#....#...BB...#......#",
            "#....#........#......#",
            "#....##D#######......#",
            "#....................#",
            "#..##..####..####..###",
            "#.............E......#",
            "#..P.................#",
            "######################",
        ],
        enemyData: [
            { type: 'jimmie', x: 10, z: 10 },
            { type: 'ulf', x: 14, z: 15 },
            { type: 'sd', x: 5, z: 2 },
            { type: 'sd', x: 16, z: 9 }
        ],
        pickupData: [
            { type: 'shotgun', x: 3, z: 12 },
            { type: 'health', x: 18, z: 6 },
            { type: 'ammo', x: 8, z: 2 },
            { type: 'health', x: 15, z: 12 },
            { type: 'ammo', x: 6, z: 15 },
            { type: 'armor', x: 12, z: 2 },
            { type: 'semla', x: 19, z: 14 }
        ],
        barrelData: [
            { x: 7, z: 9 },
            { x: 14, z: 7 },
            { x: 3, z: 6 },
            { x: 17, z: 13 }
        ]
    },
    {
        name: "Det Stora Biblioteket",
        subtitle: "Kunskap är makt",
        sky: 0x1a1a0a,
        floor: 0x553322,
        map: [
            "########################",
            "#......................#",
            "#..##..##..##..##..##.#",
            "#..##..##..##..##..##.#",
            "#......................#",
            "#..##..##..##..##..##.#",
            "#..##..##..##..##..##.#",
            "#......................#",
            "#..........D...........#",
            "#......................#",
            "#..####..####..####..###",
            "#..#...................#",
            "#..#.........BB........#",
            "#..#...................#",
            "#..####..####..####..###",
            "#......................#",
            "#..##..##..##..##..##.#",
            "#..##..##..##..##..##.#",
            "#.............E........#",
            "#..P...................#",
            "########################",
        ],
        enemyData: [
            { type: 'lars_werner', x: 12, z: 12 },
            { type: 'opinionsbildare', x: 5, z: 3 },
            { type: 'pressekreterare', x: 18, z: 5 },
            { type: 'sd', x: 8, z: 16 },
            { type: 'sd', x: 15, z: 16 },
            { type: 'troll', x: 20, z: 10 },
            { type: 'nmr_elite', x: 3, z: 10 }
        ],
        pickupData: [
            { type: 'machinegun', x: 10, z: 4 },
            { type: 'health', x: 20, z: 18 },
            { type: 'ammo', x: 5, z: 14 },
            { type: 'armor', x: 15, z: 8 },
            { type: 'semla', x: 3, z: 18 },
            { type: 'coffee', x: 18, z: 16 }
        ],
        barrelData: [
            { x: 10, z: 10 },
            { x: 6, z: 6 },
            { x: 18, z: 14 }
        ]
    },
    {
        name: "Rosenbads Serverhall",
        subtitle: "Digitalt kaos",
        sky: 0x001122,
        floor: 0x222233,
        map: [
            "######################",
            "#..#..#..#..#..#..#..#",
            "#..#..#..#..#..#..#..#",
            "#....................#",
            "##.##.##D##.##.##.####",
            "#....................#",
            "#..#..#..#..#..#..#..#",
            "#..#..#..#..#..#..#..#",
            "#....................#",
            "##.##.##.##D##.##.####",
            "#....................#",
            "#..#..#..#..#..#..#..#",
            "#..#..#..#..#..#..#..#",
            "#....................#",
            "#........E...........#",
            "#..P.................#",
            "######################",
        ],
        enemyData: [
            { type: 'troll', x: 5, z: 2 },
            { type: 'troll', x: 15, z: 6 },
            { type: 'pressekreterare', x: 10, z: 10 },
            { type: 'sd', x: 3, z: 12 },
            { type: 'sd', x: 18, z: 4 },
            { type: 'opinionsbildare', x: 12, z: 2 },
            { type: 'nmr_elite', x: 8, z: 8 },
            { type: 'jarnror', x: 17, z: 12 }
        ],
        pickupData: [
            { type: 'shotgun', x: 9, z: 5 },
            { type: 'health', x: 3, z: 14 },
            { type: 'health', x: 18, z: 8 },
            { type: 'ammo', x: 12, z: 13 },
            { type: 'armor', x: 6, z: 7 },
            { type: 'folkvett', x: 15, z: 14 },
            { type: 'coffee', x: 1, z: 5 }
        ],
        barrelData: [
            { x: 4, z: 4 },
            { x: 16, z: 8 },
            { x: 8, z: 12 },
            { x: 12, z: 6 }
        ]
    },
    {
        name: "Slottsträdgården",
        subtitle: "Den sista striden",
        sky: 0x112211,
        floor: 0x336633,
        map: [
            "##########################",
            "#........................#",
            "#..##....##....##....##..#",
            "#........................#",
            "#....####....####....##..#",
            "#....#..#....#..#........#",
            "#....####....####....##..#",
            "#........................#",
            "#..##....####....##......#",
            "#........#BB#............#",
            "#........####............#",
            "#........................#",
            "#..####....####....####..#",
            "#..#..#....#..#....#..#..#",
            "#..####....####....####..#",
            "#........................#",
            "#..##....##....##....##..#",
            "#........................#",
            "#..............E.........#",
            "#..P.....................#",
            "##########################",
        ],
        enemyData: [
            { type: 'jimmie', x: 12, z: 9 },
            { type: 'ebba', x: 8, z: 4 },
            { type: 'ulf', x: 18, z: 14 },
            { type: 'lars_werner', x: 4, z: 16 },
            { type: 'opinionsbildare', x: 20, z: 6 },
            { type: 'pressekreterare', x: 6, z: 10 },
            { type: 'sd', x: 14, z: 16 },
            { type: 'sd', x: 22, z: 2 },
            { type: 'nmr_elite', x: 3, z: 4 },
            { type: 'troll', x: 16, z: 6 }
        ],
        pickupData: [
            { type: 'shotgun', x: 10, z: 2 },
            { type: 'machinegun', x: 20, z: 16 },
            { type: 'health', x: 5, z: 8 },
            { type: 'health', x: 18, z: 10 },
            { type: 'health', x: 12, z: 16 },
            { type: 'ammo', x: 3, z: 14 },
            { type: 'ammo', x: 22, z: 8 },
            { type: 'armor', x: 8, z: 12 },
            { type: 'semla', x: 20, z: 4 },
            { type: 'coffee', x: 14, z: 8 },
            { type: 'folkvett', x: 2, z: 18 }
        ],
        barrelData: [
            { x: 6, z: 6 },
            { x: 16, z: 12 },
            { x: 10, z: 14 },
            { x: 22, z: 16 },
            { x: 4, z: 2 }
        ]
    }
];

export function buildLevel(levelIndex, scene) {
    const lv = LEVELS[levelIndex];
    const walls = [];
    const doors = [];
    const enemies = [];
    const exits = [];
    let playerStart = new THREE.Vector3(0, 1.7, 0);

    const wallGeo = new THREE.BoxGeometry(2, 4, 2);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x555566 });

    lv.map.forEach((row, z) => {
        row.split('').forEach((char, x) => {
            const pos = new THREE.Vector3(x * 2, 2, z * 2);
            
                        if (char === '#') {
                            const mesh = new THREE.Mesh(wallGeo, wallMat);
                            mesh.position.copy(pos);
                            mesh.castShadow = true;
                            mesh.receiveShadow = true;
                            scene.add(mesh);
                            walls.push(mesh);
                                    } else if (char === 'D') {
                                        const doorGeo = new THREE.BoxGeometry(2, 4, 0.5);
                                        const doorMat = new THREE.MeshStandardMaterial({ color: 0x884422 });
                                        const mesh = new THREE.Mesh(doorGeo, doorMat);
                                        mesh.position.set(x * 2, 2, z * 2);
                                        mesh.castShadow = true;
                                        mesh.receiveShadow = true;
                                        scene.add(mesh);
                                        doors.push({ mesh, open: false, timer: 0 });
                                                } else if (char === 'E') {
                                                    const exitGeo = new THREE.BoxGeometry(2, 4, 2);
                                                    const exitMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x004400 });
                                                    const mesh = new THREE.Mesh(exitGeo, exitMat);
                                                    mesh.position.copy(pos);
                                                    mesh.receiveShadow = true;
                                                    scene.add(mesh);
                                                    exits.push(mesh);
                                                }
                                     else if (char === 'P') {
                playerStart.set(x * 2, 1.7, z * 2);
            }
        });
    });

    lv.enemyData.forEach(ed => {
        const variant = ed.variant !== undefined ? ed.variant : Math.floor(Math.random() * 10);
        const { colorMap, normalMap } = createEnemyTexture(ed.type, 'idle', variant);
        
        const mat = new THREE.MeshStandardMaterial({ 
            map: colorMap, 
            normalMap: normalMap,
            normalScale: new THREE.Vector2(1.0, 1.0),
            transparent: true, 
            alphaTest: 0.5,
            side: THREE.DoubleSide
        });
        const geom = new THREE.PlaneGeometry(3, 3);
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(ed.x * 2, 1.5, ed.z * 2);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);

        const isBoss = ['jimmie', 'ebba', 'ulf'].includes(ed.type);
        enemies.push({
            mesh: mesh, type: ed.type, hp: isBoss ? 100 : 50, variant: variant,
            state: isBoss ? 'idle' : 'patrol',
            stateTimer: 0,
            patrolOriginX: ed.x * 2, patrolOriginZ: ed.z * 2,
            patrolTargetX: ed.x * 2, patrolTargetZ: ed.z * 2,
            patrolPause: Math.random() * 2,
            footstepTimer: 0,
            alertCooldown: 0
        });
    });

    // Pickups
    const pickups = [];
    if (lv.pickupData) {
        lv.pickupData.forEach(pd => {
            const pickupGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
            const pickupColors = { health: 0x00ff00, ammo: 0xffcc00, machinegun: 0x8888ff, shotgun: 0xff8800, armor: 0x4444ff, coffee: 0x663300, semla: 0xffdd88, folkvett: 0xccccff };
            let color = pickupColors[pd.type] || 0xffffff;
            const pickupMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 });
            const mesh = new THREE.Mesh(pickupGeo, pickupMat);
            mesh.position.set(pd.x * 2, 0.5, pd.z * 2);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            scene.add(mesh);
            pickups.push({ mesh, type: pd.type, active: true });
        });
    }

    // Explosive Barrels
    const barrels = [];
    if (lv.barrelData) {
        lv.barrelData.forEach(bd => {
            const barrelGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 8);
            const barrelMat = new THREE.MeshStandardMaterial({ color: 0xcc0000, emissive: 0x330000, emissiveIntensity: 0.3 });
            const mesh = new THREE.Mesh(barrelGeo, barrelMat);
            mesh.position.set(bd.x * 2, 0.6, bd.z * 2);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            scene.add(mesh);
            barrels.push({ mesh, active: true, hp: 20 });
        });
    }

    // Physical Props
    const props = [];
    if (lv.propData) {
        lv.propData.forEach(pd => {
            let mesh;
            if (pd.type === 'bin') {
                const geo = new THREE.CylinderGeometry(0.3, 0.25, 0.8, 8);
                const mat = new THREE.MeshStandardMaterial({ color: 0x444444 });
                mesh = new THREE.Mesh(geo, mat);
            } else if (pd.type === 'chair') {
                const group = new THREE.Group();
                const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.6), new THREE.MeshStandardMaterial({ color: 0x222222 }));
                seat.position.y = 0.4; group.add(seat);
                const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.1), new THREE.MeshStandardMaterial({ color: 0x222222 }));
                back.position.set(0, 0.7, -0.25); group.add(back);
                mesh = group;
            }
            mesh.position.set(pd.x * 2, 0.4, pd.z * 2);
            mesh.castShadow = true; mesh.receiveShadow = true;
            scene.add(mesh);
            props.push({ mesh, velocity: new THREE.Vector3(), rotVelocity: new THREE.Vector3(), type: pd.type });
        });
    }

    // Floor and Ceiling
    const floorGeo = new THREE.PlaneGeometry(100, 100);
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: lv.floor, 
        roughness: 0.2, // Shiny
        metalness: 0.4 
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    const ceilGeo = new THREE.PlaneGeometry(100, 100);
    const ceilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const ceil = new THREE.Mesh(ceilGeo, ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 4;
    scene.add(ceil);

    return { walls, doors, enemies, exits, playerStart, pickups, barrels, props };
}
