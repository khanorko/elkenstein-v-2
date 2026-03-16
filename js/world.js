import * as THREE from 'three';

export const LEVELS = [
    // ─────────────────────────────────────────────────────────────────────────
    // LEVEL 1 — Riksdagshuset (Tutorial: 18x18, clean offices)
    // Flow: Start south-west → find yellow keycard in north wing →
    //       shoot secret wall for bonus health → unlock yellow door → exit south-east
    // ─────────────────────────────────────────────────────────────────────────
    {
        name: "Riksdagshuset",
        subtitle: "Rensa korridorerna",
        parTime: 120,
        bossTypes: [],
        sky: 0x1a1a2e,
        floor: 0x222222,
        map: [
            "##################",
            "#P...............#",
            "#.##.#########...#",
            "#.#..#.......#...#",
            "#.#..#.......#...#",   // keycard_yellow placed at (6,4)
            "#.#..#########.D.#",   // D = door to east wing
            "#.#..............#",
            "#.####.D.####....#",   // main choke point with door
            "#.#..............#",
            "#.#..S###........#",   // S = secret wall at (5,9); room at (6-8,9-10)
            "#.#..#..#........#",   // hidden room behind S
            "#.####..#......D.#",   // door to exit corridor
            "#........#.......#",
            "#........#.....y.#",   // y = yellow locked door before exit
            "#........#.......#",
            "#........#....E..#",   // exit
            "#................#",
            "##################",
        ],
        enemyData: [
            { type: 'bss_retro', x: 13, z: 3 },
            { type: 'jarnror',   x: 8,  z: 6 },
            { type: 'sd',        x: 14, z: 12 },
            { type: 'm_retro',   x: 3,  z: 12 }
        ],
        propData: [
            { type: 'poster',   x: 10, z: 2 },
            { type: 'terminal', x: 15, z: 5 },
            { type: 'bin',      x: 7,  z: 14 },
            { type: 'chair',    x: 4,  z: 11 }
        ],
        vendingMachineData: [
            { x: 16, z: 15 },
            { x: 2,  z: 7  }
        ],
        pickupData: [
            { type: 'keycard_yellow', x: 6,  z: 4  },   // in north inner room
            { type: 'health',         x: 7,  z: 10 },   // in secret room
            { type: 'ammo',           x: 12, z: 7  },   // past choke point
            { type: 'armor',          x: 15, z: 13 },   // near exit
            { type: 'coffee',         x: 2,  z: 3  },
            { type: 'ammo',           x: 10, z: 5  },
            { type: 'folkvett',       x: 7,  z: 10 }    // secret room bonus weapon
        ],
        barrelData: [
            { x: 9,  z: 7  },
            { x: 13, z: 11 }
        ],
        alarmPanelData: [
            { x: 14, z: 8, facing: 'west', spawnEnemies: [] }
        ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // LEVEL 2 — Propagandafabriken (22x22, darker factory)
    // Flow: Start south → east wing for yellow key → west wing for blue key →
    //       unlock blue door to inner sanctum → boss fight → exit
    // ─────────────────────────────────────────────────────────────────────────
    {
        name: "Propagandafabriken",
        subtitle: "Möt Ebba Busch",
        parTime: 100,
        bossTypes: ['ebba'],
        sky: 0x221a1a,
        floor: 0x111111,
        map: [
            "######################",
            "#....................#",
            "#.####..##..##..####.#",
            "#.#...........#..#...#",
            "#.#...........#..#...#",   // keycard_yellow at (5,4)
            "#.####.D.##.D.####...#",   // two doors on north corridor
            "#....................#",
            "#..##.D.####.D.##....#",   // choke: two doors
            "#..#.............#...#",
            "#..#.............#...#",
            "#..#.....b.......#...#",   // b = blue locked door in inner sanctum
            "#..#.............#...#",
            "#..##.###..###.###...#",
            "#....................#",
            "#.S.###..####.########",   // S = secret at (2,14)
            "#....................#",
            "#.##.##.##.##.##.#####",
            "#....................#",
            "#..#####.##.#####....#",
            "#..#.............#...#",
            "#.P#.............#.E.#",   // player start, exit
            "######################",
        ],
        enemyData: [
            { type: 'sd',                x: 18, z: 4  },
            { type: 'sd',                x: 5,  z: 17 },
            { type: 'pressekreterare',   x: 11, z: 2  },
            { type: 'opinionsbildare',   x: 14, z: 10 },
            { type: 'troll',             x: 3,  z: 17 },
            { type: 'bss_retro',         x: 8,  z: 6  },
            { type: 'ebba',              x: 11, z: 11 }
        ],
        propData: [
            { type: 'poster',   x: 6,  z: 2  },
            { type: 'poster',   x: 15, z: 2  },
            { type: 'terminal', x: 19, z: 8  },
            { type: 'chair',    x: 10, z: 19 }
        ],
        pickupData: [
            { type: 'keycard_yellow', x: 5,  z: 4  },   // east wing
            { type: 'keycard_blue',   x: 17, z: 4  },   // west wing
            { type: 'shotgun',        x: 14, z: 15 },   // secret room bonus
            { type: 'health',         x: 8,  z: 14 },
            { type: 'ammo',           x: 3,  z: 5  },
            { type: 'health',         x: 13, z: 19 },
            { type: 'coffee',         x: 6,  z: 6  },
            { type: 'extralife',      x: 19, z: 19 },
            { type: 'armor',          x: 11, z: 9  }    // near boss
        ],
        barrelData: [
            { x: 9,  z: 7  },
            { x: 4,  z: 17 },
            { x: 16, z: 16 },
            { x: 12, z: 13 }
        ],
        alarmPanelData: [
            { x: 7,  z: 12, facing: 'east', spawnEnemies: ['sd', 'troll'] },
            { x: 15, z: 12, facing: 'west', spawnEnemies: ['bss_retro']   }
        ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // LEVEL 3 — Slutdebatten (24x20, debate arena + crushers in corridors)
    // Flow: Start south → navigate choke corridors (crushers!) → find yellow key →
    //       unlock inner debate arena → defeat bosses → exit
    // ─────────────────────────────────────────────────────────────────────────
    {
        name: "Slutdebatten",
        subtitle: "Besegra Jimmie Åkesson",
        parTime: 90,
        bossTypes: ['jimmie', 'ulf'],
        sky: 0x000033,
        floor: 0x444400,
        map: [
            "########################",
            "#......................#",
            "#.######...######......#",
            "#.#....#...#....#......#",
            "#.#....#...#....#......#",   // keycard_yellow at (4,4)
            "#.######...######......#",
            "#......................#",
            "#....##.D.D.##.........#",   // choke: two doors, crushers between them
            "#....#.........#.......#",
            "#....#....BB...#.......#",   // boss arena inner (accessible only via yellow door)
            "#....#.........#.......#",
            "#....##y########.......#",   // y = yellow locked door to boss area
            "#......................#",
            "#.###..####..####..###.#",
            "#.#....#....S#....#....#",   // S = secret wall at (13,14)
            "#.#.P..#.......#.......#",   // player start
            "#.#....######..######..#",
            "#.#....................#",
            "#.###.D.###.###.D.###..#",   // exit corridor
            "#..........E...........#",   // exit
            "########################",
        ],
        enemyData: [
            { type: 'jimmie',  x: 10, z: 9  },
            { type: 'ulf',     x: 12, z: 9  },
            { type: 'sd',      x: 5,  z: 2  },
            { type: 'sd',      x: 17, z: 3  },
            { type: 'troll',   x: 2,  z: 16 },
            { type: 'troll',   x: 20, z: 6  }
        ],
        propData: [
            { type: 'terminal', x: 14, z: 2  },
            { type: 'poster',   x: 7,  z: 2  },
            { type: 'poster',   x: 20, z: 2  },
            { type: 'chair',    x: 10, z: 10 },
            { type: 'chair',    x: 12, z: 10 }
        ],
        vendingMachineData: [
            { x: 2,  z: 2  },
            { x: 21, z: 19 }
        ],
        pickupData: [
            { type: 'keycard_yellow', x: 4,  z: 4  },   // in locked north room
            { type: 'machinegun',     x: 3,  z: 12 },   // before choke
            { type: 'health',         x: 18, z: 6  },
            { type: 'ammo',           x: 8,  z: 2  },
            { type: 'armor',          x: 12, z: 2  },
            { type: 'health',         x: 14, z: 15 },   // in secret room
            { type: 'ammo',           x: 15, z: 15 },   // in secret room
            { type: 'coffee',         x: 20, z: 17 }
        ],
        barrelData: [
            { x: 7,  z: 9  },
            { x: 14, z: 7  },
            { x: 3,  z: 6  },
            { x: 17, z: 13 }
        ],
        crusherData: [
            { x: 7,  z: 7, period: 2.5, phase: 0.0  },   // left crusher in choke
            { x: 9,  z: 7, period: 2.5, phase: 1.25 },   // right crusher, offset phase
            { x: 11, z: 7, period: 3.0, phase: 0.5  }
        ],
        alarmPanelData: [
            { x: 18, z: 12, facing: 'west', spawnEnemies: ['sd', 'pressekreterare'] }
        ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // LEVEL 4 — Det Stora Biblioteket (32x30, expanded library with toxic spill)
    // Flow: Start south → navigate bookshelf maze → two keys needed (yellow + blue) →
    //       toxic spill area (lower section) → boss arena in center → exit
    // ─────────────────────────────────────────────────────────────────────────
    {
        name: "Det Stora Biblioteket",
        subtitle: "Kunskap är makt",
        parTime: 130,
        bossTypes: ['lars_werner'],
        sky: 0x1a1a0a,
        floor: 0x553322,
        map: [
            "################################",
            "#..............................#",
            "#.##.##.##.##.##.##.##.##.##...#",
            "#.##.##.##.##.##.##.##.##.##...#",
            "#..............................#",
            "#.##.##.##.##.##.##.##.##.##...#",
            "#.##.##.##.##.##.##.##.##.##...#",
            "#..............................#",
            "#...........D..................#",   // door to inner wing
            "#..............................#",
            "#.####.####.####.####.####.#####",   // bookshelf rows with gaps
            "#.#............................#",
            "#.#....####.BB..####...........#",   // boss arena center
            "#.#............................#",
            "#.####.####.####.####.####.#####",
            "#..............................#",
            "#.##.##.##.##.##.##.##.##.##...#",
            "#.##.##.##.##.##.##.##.##.##...#",
            "#..............................#",
            "#..y...........................#",   // y = yellow locked door to south section
            "#..............................#",
            "#.##.##.D.##.##.D.##.##.D.##...#",   // south section with doors
            "#..............................#",
            "#...b..........................#",   // b = blue locked door to archives
            "#..............................#",
            "#.##.##.##.##.##.##.##.##.##...#",
            "#..............................#",
            "#.##.S#.##.##.##.##.##.##.##...#",   // S = secret wall in bookshelf
            "#......P...............E.......#",   // player start + exit
            "################################",
        ],
        enemyData: [
            { type: 'lars_werner',      x: 16, z: 12 },
            { type: 'opinionsbildare',  x: 5,  z: 3  },
            { type: 'pressekreterare',  x: 24, z: 5  },
            { type: 'sd',               x: 8,  z: 22 },
            { type: 'sd',               x: 20, z: 22 },
            { type: 'troll',            x: 27, z: 10 },
            { type: 'nmr_elite',        x: 3,  z: 16 },
            { type: 'opinionsbildare',  x: 28, z: 25 }
        ],
        propData: [
            { type: 'terminal', x: 28, z: 2  },
            { type: 'poster',   x: 15, z: 2  },
            { type: 'poster',   x: 6,  z: 2  },
            { type: 'poster',   x: 25, z: 16 },
            { type: 'chair',    x: 15, z: 13 },
            { type: 'chair',    x: 17, z: 13 }
        ],
        pickupData: [
            { type: 'keycard_yellow', x: 10, z: 4  },   // north wing
            { type: 'keycard_blue',   x: 25, z: 4  },   // north-east wing
            { type: 'machinegun',     x: 10, z: 22 },   // south section reward
            { type: 'health',         x: 27, z: 26 },
            { type: 'ammo',           x: 5,  z: 20 },
            { type: 'armor',          x: 20, z: 8  },
            { type: 'semla',          x: 3,  z: 28 },
            { type: 'health',         x: 5,  z: 27 },   // near secret wall
            { type: 'ammo',           x: 6,  z: 27 },   // in secret alcove
            { type: 'coffee',         x: 24, z: 20 },
            { type: 'health',         x: 14, z: 12 },   // near boss
            { type: 'armor',          x: 18, z: 12 }    // near boss
        ],
        barrelData: [
            { x: 10, z: 10 },
            { x: 6,  z: 6  },
            { x: 22, z: 14 },
            { x: 28, z: 18 },
            { x: 4,  z: 24 }
        ],
        toxicData: [
            { x: 12, z: 24 }, { x: 13, z: 24 }, { x: 14, z: 24 },
            { x: 12, z: 25 }, { x: 13, z: 25 }, { x: 14, z: 25 },
            { x: 15, z: 24 }, { x: 15, z: 25 }, { x: 16, z: 24 }
        ],
        alarmPanelData: [
            { x: 29, z: 8,  facing: 'west', spawnEnemies: ['sd', 'troll']          },
            { x: 29, z: 20, facing: 'west', spawnEnemies: ['nmr_elite', 'troll']   }
        ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // LEVEL 5 — Rosenbads Serverhall (30x28, server corridors + crushers + alarms)
    // Flow: Start south-west → navigate server rack maze →
    //       avoid/disable alarm panels → two crusher corridors →
    //       yellow key in east wing → unlock exit in north
    // ─────────────────────────────────────────────────────────────────────────
    {
        name: "Rosenbads Serverhall",
        subtitle: "Digitalt kaos",
        parTime: 130,
        bossTypes: [],
        sky: 0x001122,
        floor: 0x222233,
        map: [
            "##############################",
            "#............................#",
            "#.##.##.##.##.##.##.##.##.##.#",
            "#.##.##.##.##.##.##.##.##.##.#",
            "#............................#",
            "##.##.##.##.##.D.##.##.##.####",   // choke with door
            "#............................#",
            "#.##.##.##.##.##.##.##.##.##.#",
            "#.##.##.##.##.##.##.##.##.##.#",
            "#............................#",
            "#.##.##.##D##.##.##D##.##.##.#",
            "#............................#",
            "#.##.##.##.##.##.##.##S##.##.#",   // S = secret at (22,12)
            "#.##.##.##.##.##.##.##.##.##.#",
            "#............................#",
            "#............................#",
            "#.##.D.##.##.D.##.##.D.##.##.#",   // south sector doors
            "#............................#",
            "#.##.##.##.##.##.##.##.##.##.#",
            "#.##.##.##.##.##.##.##.##.##.#",
            "#............................#",
            "#.##.##.##.##.##.##.##.##.##.#",
            "#............................#",
            "#.##.##.##.##.##.##.##.##.##.#",
            "#....y.................E.....#",   // y = yellow locked door, E = exit
            "#.##.##.##.##.##.##.##.##.##.#",
            "#.P..........................#",   // player start
            "##############################",
        ],
        enemyData: [
            { type: 'troll',            x: 5,  z: 2  },
            { type: 'troll',            x: 20, z: 6  },
            { type: 'pressekreterare',  x: 14, z: 10 },
            { type: 'sd',               x: 3,  z: 18 },
            { type: 'sd',               x: 24, z: 4  },
            { type: 'opinionsbildare',  x: 16, z: 2  },
            { type: 'nmr_elite',        x: 8,  z: 8  },
            { type: 'jarnror',          x: 22, z: 18 }
        ],
        propData: [
            { type: 'terminal', x: 27, z: 2  },
            { type: 'terminal', x: 2,  z: 2  },
            { type: 'terminal', x: 14, z: 22 },
            { type: 'poster',   x: 12, z: 5  }
        ],
        pickupData: [
            { type: 'keycard_yellow', x: 26, z: 10 },   // east deep wing
            { type: 'shotgun',        x: 9,  z: 5  },
            { type: 'health',         x: 3,  z: 14 },
            { type: 'health',         x: 24, z: 8  },
            { type: 'ammo',           x: 16, z: 13 },
            { type: 'ammo',           x: 8,  z: 20 },
            { type: 'armor',          x: 6,  z: 7  },
            { type: 'folkvett',       x: 23, z: 13 },   // near secret wall
            { type: 'coffee',         x: 1,  z: 5  },
            { type: 'health',         x: 14, z: 24 }    // near exit
        ],
        barrelData: [
            { x: 4,  z: 4  },
            { x: 20, z: 8  },
            { x: 8,  z: 12 },
            { x: 16, z: 6  },
            { x: 26, z: 16 }
        ],
        crusherData: [
            { x: 5,  z: 5,  period: 2.0, phase: 0.0  },
            { x: 9,  z: 5,  period: 2.0, phase: 1.0  },
            { x: 13, z: 5,  period: 2.5, phase: 0.5  },
            { x: 17, z: 9,  period: 2.0, phase: 0.0  },
            { x: 21, z: 9,  period: 2.0, phase: 1.0  },
            { x: 25, z: 9,  period: 2.5, phase: 0.5  }
        ],
        alarmPanelData: [
            { x: 28, z: 5,  facing: 'west', spawnEnemies: ['sd', 'sd']            },
            { x: 28, z: 14, facing: 'west', spawnEnemies: ['nmr_elite', 'troll']  },
            { x: 1,  z: 10, facing: 'east', spawnEnemies: ['sd', 'pressekreterare'] }
        ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // LEVEL 6 — Slottsträdgården (36x30, epic final — all mechanics combined)
    // Flow: Start south → navigate garden maze → find all three keys (yellow/blue/red) →
    //       unlock boss arena in center → defeat all bosses → exit north
    // ─────────────────────────────────────────────────────────────────────────
    {
        name: "Slottsträdgården",
        subtitle: "Den sista striden",
        parTime: 180,
        bossTypes: ['jimmie', 'ebba', 'ulf'],
        sky: 0x112211,
        floor: 0x336633,
        map: [
            "##############################",
            "#............................#",
            "#.##.##.##.##.##.##.##.##...##",
            "#.##.##.##.##.##.##.##.##...##",
            "#............................#",
            "#.####.####.####.####.####..##",
            "#.#..#.#..#.#..#.#..#.#..#.###",
            "#.####.####.####.####.####..##",
            "#............................#",
            "#.###.D.###.D.###.D.###.D.####",   // choke with 4 doors
            "#............................#",
            "#....BBB.....................#",   // boss arena
            "#....BBB.....................#",
            "#............................#",
            "#.###.y.###.b.###.###.###.####",   // y=yellow, b=blue locked doors
            "#............................#",
            "#.####.####.####.####.####..##",
            "#.#..........................#",
            "#.#.....S#...................#",   // S = secret wall at (7,18)
            "#.#..........................#",
            "#.####.####.####.####.####..##",
            "#............................#",
            "#.##.##.D.##.##.D.##.##.D.##..",
            "#............................#",
            "#.##.##.##.##.##.##.##.##...##",
            "#............................#",
            "#.####D####.####D####.####..##",   // doors to exit wing
            "#.P......................E...#",   // player start + exit
            "#............................#",
            "##############################",
        ],
        enemyData: [
            { type: 'jimmie',           x: 15, z: 11 },
            { type: 'ebba',             x: 12, z: 11 },
            { type: 'ulf',              x: 18, z: 12 },
            { type: 'lars_werner',      x: 4,  z: 20 },
            { type: 'opinionsbildare',  x: 26, z: 6  },
            { type: 'pressekreterare',  x: 6,  z: 10 },
            { type: 'sd',               x: 20, z: 20 },
            { type: 'sd',               x: 30, z: 2  },
            { type: 'nmr_elite',        x: 3,  z: 4  },
            { type: 'troll',            x: 22, z: 6  },
            { type: 'jarnror',          x: 28, z: 16 },
            { type: 'opinionsbildare',  x: 10, z: 24 }
        ],
        propData: [
            { type: 'poster',   x: 12, z: 2  },
            { type: 'poster',   x: 22, z: 2  },
            { type: 'poster',   x: 32, z: 8  },
            { type: 'terminal', x: 2,  z: 8  },
            { type: 'terminal', x: 33, z: 20 },
            { type: 'chair',    x: 14, z: 12 },
            { type: 'chair',    x: 18, z: 11 },
            { type: 'bin',      x: 6,  z: 24 },
            { type: 'bin',      x: 28, z: 24 }
        ],
        pickupData: [
            { type: 'keycard_yellow', x: 6,  z: 6  },   // west garden
            { type: 'keycard_blue',   x: 28, z: 6  },   // east garden
            { type: 'shotgun',        x: 10, z: 2  },
            { type: 'machinegun',     x: 26, z: 20 },
            { type: 'health',         x: 5,  z: 8  },
            { type: 'health',         x: 24, z: 10 },
            { type: 'health',         x: 16, z: 20 },
            { type: 'ammo',           x: 3,  z: 18 },
            { type: 'ammo',           x: 30, z: 8  },
            { type: 'armor',          x: 8,  z: 16 },
            { type: 'armor',          x: 13, z: 11 },   // near boss arena
            { type: 'semla',          x: 26, z: 4  },
            { type: 'coffee',         x: 18, z: 8  },
            { type: 'health',         x: 11, z: 19 },   // in secret room
            { type: 'extralife',      x: 12, z: 19 }    // secret room bonus
        ],
        barrelData: [
            { x: 6,  z: 6  },
            { x: 22, z: 12 },
            { x: 10, z: 14 },
            { x: 28, z: 16 },
            { x: 4,  z: 2  },
            { x: 32, z: 24 }
        ],
        toxicData: [
            { x: 14, z: 22 }, { x: 15, z: 22 }, { x: 16, z: 22 }, { x: 17, z: 22 },
            { x: 14, z: 23 }, { x: 15, z: 23 }, { x: 16, z: 23 },
            { x: 18, z: 22 }, { x: 19, z: 22 }
        ],
        crusherData: [
            { x: 8,  z: 9,  period: 2.5, phase: 0.0  },
            { x: 12, z: 9,  period: 2.5, phase: 0.83 },
            { x: 16, z: 9,  period: 2.5, phase: 1.66 },
            { x: 22, z: 9,  period: 2.0, phase: 0.5  },
            { x: 26, z: 9,  period: 2.0, phase: 0.0  }
        ],
        alarmPanelData: [
            { x: 34, z: 5,  facing: 'west', spawnEnemies: ['sd', 'sd', 'troll']       },
            { x: 1,  z: 15, facing: 'east', spawnEnemies: ['nmr_elite', 'troll']      },
            { x: 34, z: 22, facing: 'west', spawnEnemies: ['pressekreterare', 'troll'] }
        ],
    }
];

export function buildLevel(levelIndex, scene) {
    const lv = LEVELS[levelIndex];
    const walls = [];
    const doors = [];
    const enemies = [];
    const exits = [];
    const secretWalls = [];
    const toxicZones = [];
    const crushers = [];
    const alarmPanels = [];
    let playerStart = new THREE.Vector3(0, 1.7, 0);

    const wallGeo = new THREE.BoxGeometry(2, 4, 2);

    // Visual progression: color shifts across levels
    const wallColors = [0x555566, 0x443344, 0x222244, 0x443322, 0x223344, 0x224422];
    const wallColor = wallColors[levelIndex] || 0x555566;
    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor });

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

            } else if (char === 'S') {
                // Secret wall: identical visuals to normal wall, but shoots open
                const mesh = new THREE.Mesh(wallGeo, wallMat.clone());
                mesh.position.copy(pos);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                scene.add(mesh);
                // NOT in walls[] — handled via separate collision in main.js
                secretWalls.push({ mesh, hp: 3, revealed: false });

            } else if (char === 'D') {
                const doorGeo = new THREE.BoxGeometry(2, 4, 0.5);
                const doorMat = new THREE.MeshStandardMaterial({ color: 0x884422 });
                const mesh = new THREE.Mesh(doorGeo, doorMat);
                mesh.position.set(x * 2, 2, z * 2);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                scene.add(mesh);
                doors.push({ mesh, open: false, timer: 0 });

            } else if (char === 'y') {
                // Yellow locked door
                const doorGeo = new THREE.BoxGeometry(2, 4, 0.5);
                const doorMat = new THREE.MeshStandardMaterial({
                    color: 0xcc9900,
                    emissive: 0x332200,
                    emissiveIntensity: 0.4
                });
                const mesh = new THREE.Mesh(doorGeo, doorMat);
                mesh.position.set(x * 2, 2, z * 2);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                scene.add(mesh);
                // Yellow stripes decoration
                const stripeGeo = new THREE.BoxGeometry(0.15, 3.5, 0.6);
                const stripeMat = new THREE.MeshStandardMaterial({
                    color: 0xffdd00,
                    emissive: 0x554400,
                    emissiveIntensity: 0.6
                });
                [-0.65, 0, 0.65].forEach(ox => {
                    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
                    stripe.position.set(x * 2 + ox, 2, z * 2 + 0.28);
                    scene.add(stripe);
                });
                doors.push({ mesh, open: false, timer: 0, locked: true, keyColor: 'yellow' });

            } else if (char === 'b') {
                // Blue locked door
                const doorGeo = new THREE.BoxGeometry(2, 4, 0.5);
                const doorMat = new THREE.MeshStandardMaterial({
                    color: 0x2255bb,
                    emissive: 0x001133,
                    emissiveIntensity: 0.4
                });
                const mesh = new THREE.Mesh(doorGeo, doorMat);
                mesh.position.set(x * 2, 2, z * 2);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                scene.add(mesh);
                // Blue emblem decoration
                const emblemGeo = new THREE.BoxGeometry(1.0, 1.0, 0.3);
                const emblemMat = new THREE.MeshStandardMaterial({
                    color: 0x44aaff,
                    emissive: 0x112244,
                    emissiveIntensity: 0.6
                });
                const emblem = new THREE.Mesh(emblemGeo, emblemMat);
                emblem.position.set(x * 2, 2.5, z * 2 + 0.3);
                scene.add(emblem);
                doors.push({ mesh, open: false, timer: 0, locked: true, keyColor: 'blue' });

            } else if (char === 'E') {
                const exitGeo = new THREE.BoxGeometry(2, 4, 2);
                const exitMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x004400 });
                const mesh = new THREE.Mesh(exitGeo, exitMat);
                mesh.position.copy(pos);
                mesh.receiveShadow = true;
                scene.add(mesh);
                exits.push(mesh);

            } else if (char === 'P') {
                playerStart.set(x * 2, 1.7, z * 2);
            }
        });
    });

    // ── Enemies ──────────────────────────────────────────────────────────────
    lv.enemyData.forEach(ed => {
        const variant = ed.variant !== undefined ? ed.variant : Math.floor(Math.random() * 10);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x888888,
            transparent: true,
            alphaTest: 0.5,
            side: THREE.DoubleSide
        });
        const geom = new THREE.PlaneGeometry(3, 3);
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(ed.x * 2, 1.5, ed.z * 2);
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        scene.add(mesh);

        const isBoss = ['jimmie', 'ebba', 'ulf', 'lars_werner'].includes(ed.type);
        const _normalHp = [30, 40, 50, 60, 70, 80][levelIndex] || 50;
        const _bossHp   = [80, 100, 120, 140, 160, 200][levelIndex] || 100;
        enemies.push({
            mesh, type: ed.type, hp: isBoss ? _bossHp : _normalHp, variant,
            state: isBoss ? 'idle' : 'patrol',
            stateTimer: 0,
            patrolOriginX: ed.x * 2, patrolOriginZ: ed.z * 2,
            patrolTargetX: ed.x * 2, patrolTargetZ: ed.z * 2,
            patrolPause: Math.random() * 2,
            footstepTimer: 0,
            alertCooldown: 0
        });
    });

    // ── Pickups ───────────────────────────────────────────────────────────────
    const pickups = [];
    if (lv.pickupData) {
        lv.pickupData.forEach(pd => {
            const pickupGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
            const pickupColors = {
                health: 0x00ff00, ammo: 0xffcc00, machinegun: 0x8888ff,
                shotgun: 0xff8800, armor: 0x4444ff, coffee: 0x663300,
                semla: 0xffdd88, folkvett: 0xccccff, extralife: 0xff00ff,
                keycard_yellow: 0xffdd00, keycard_blue: 0x44aaff
            };
            const color = pickupColors[pd.type] || 0xffffff;

            // Keycards get a distinct shape: flat card geometry
            let mesh;
            if (pd.type === 'keycard_yellow' || pd.type === 'keycard_blue') {
                const cardGeo = new THREE.BoxGeometry(0.4, 0.65, 0.08);
                const cardMat = new THREE.MeshStandardMaterial({
                    color,
                    emissive: color,
                    emissiveIntensity: 0.8,
                    metalness: 0.6
                });
                mesh = new THREE.Mesh(cardGeo, cardMat);
                // Notch on keycard
                const notchGeo = new THREE.BoxGeometry(0.12, 0.12, 0.1);
                const notch = new THREE.Mesh(notchGeo, cardMat);
                notch.position.set(0.14, 0.3, 0);
                mesh.add(notch);
            } else {
                const pickupMat = new THREE.MeshStandardMaterial({
                    color, emissive: color, emissiveIntensity: 0.3
                });
                mesh = new THREE.Mesh(pickupGeo, pickupMat);
            }

            mesh.position.set(pd.x * 2, 0.5, pd.z * 2);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            scene.add(mesh);
            pickups.push({ mesh, type: pd.type, active: true });
        });
    }

    // ── Explosive Barrels ─────────────────────────────────────────────────────
    const barrels = [];
    if (lv.barrelData) {
        lv.barrelData.forEach(bd => {
            const barrelGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 8);
            const barrelMat = new THREE.MeshStandardMaterial({
                color: 0xcc0000, emissive: 0x330000, emissiveIntensity: 0.3
            });
            const mesh = new THREE.Mesh(barrelGeo, barrelMat);
            mesh.position.set(bd.x * 2, 0.6, bd.z * 2);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            scene.add(mesh);
            barrels.push({ mesh, active: true, hp: 20 });
        });
    }

    // ── Physical Props ────────────────────────────────────────────────────────
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
                const seat = new THREE.Mesh(
                    new THREE.BoxGeometry(0.6, 0.1, 0.6),
                    new THREE.MeshStandardMaterial({ color: 0x222222 })
                );
                seat.position.y = 0.4;
                group.add(seat);
                const back = new THREE.Mesh(
                    new THREE.BoxGeometry(0.6, 0.6, 0.1),
                    new THREE.MeshStandardMaterial({ color: 0x222222 })
                );
                back.position.set(0, 0.7, -0.25);
                group.add(back);
                mesh = group;

            } else if (pd.type === 'poster') {
                // Propaganda poster on wall (flat plane)
                const group = new THREE.Group();
                const bgGeo = new THREE.PlaneGeometry(1.4, 1.8);
                const bgMat = new THREE.MeshStandardMaterial({
                    color: 0xcc2200,
                    emissive: 0x330000,
                    emissiveIntensity: 0.2
                });
                const bg = new THREE.Mesh(bgGeo, bgMat);
                bg.position.z = 0.01;
                group.add(bg);
                // Text strip
                const textGeo = new THREE.PlaneGeometry(1.2, 0.3);
                const textMat = new THREE.MeshStandardMaterial({ color: 0xffdd00 });
                const textMesh = new THREE.Mesh(textGeo, textMat);
                textMesh.position.set(0, -0.5, 0.02);
                group.add(textMesh);
                // Fist/symbol
                const fistGeo = new THREE.BoxGeometry(0.5, 0.7, 0.05);
                const fistMat = new THREE.MeshStandardMaterial({ color: 0xffcc88 });
                const fist = new THREE.Mesh(fistGeo, fistMat);
                fist.position.set(0, 0.2, 0.02);
                group.add(fist);
                mesh = group;
                mesh.position.set(pd.x * 2, 2.0, pd.z * 2);
                // Posters float on walls — no offset needed; placed as floor objects
                scene.add(mesh);
                props.push({ mesh, velocity: new THREE.Vector3(), rotVelocity: new THREE.Vector3(), type: pd.type });
                return; // skip default push below

            } else if (pd.type === 'terminal') {
                // Computer terminal with lore
                const group = new THREE.Group();
                const baseGeo = new THREE.BoxGeometry(0.8, 1.0, 0.6);
                const baseMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5 });
                const base = new THREE.Mesh(baseGeo, baseMat);
                base.position.y = 0.5;
                group.add(base);
                const screenGeo = new THREE.PlaneGeometry(0.6, 0.45);
                const screenMat = new THREE.MeshStandardMaterial({
                    color: 0x00ff88,
                    emissive: 0x00ff88,
                    emissiveIntensity: 0.7
                });
                const screen = new THREE.Mesh(screenGeo, screenMat);
                screen.position.set(0, 1.1, 0.31);
                group.add(screen);
                const keyboardGeo = new THREE.BoxGeometry(0.7, 0.05, 0.3);
                const keyboardMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
                const keyboard = new THREE.Mesh(keyboardGeo, keyboardMat);
                keyboard.position.set(0, 0.7, 0.2);
                group.add(keyboard);
                mesh = group;
                mesh.position.set(pd.x * 2, 0, pd.z * 2);
                scene.add(mesh);
                props.push({ mesh, velocity: new THREE.Vector3(), rotVelocity: new THREE.Vector3(), type: pd.type });
                return;

            } else {
                // Fallback: simple box
                mesh = new THREE.Mesh(
                    new THREE.BoxGeometry(0.5, 0.5, 0.5),
                    new THREE.MeshStandardMaterial({ color: 0x888888 })
                );
            }

            if (mesh) {
                mesh.position.set(pd.x * 2, 0.4, pd.z * 2);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                scene.add(mesh);
                props.push({ mesh, velocity: new THREE.Vector3(), rotVelocity: new THREE.Vector3(), type: pd.type });
            }
        });
    }

    // ── Vending Machines ──────────────────────────────────────────────────────
    const vendingMachines = [];
    if (lv.vendingMachineData) {
        lv.vendingMachineData.forEach(vd => {
            const group = new THREE.Group();
            const body = new THREE.Mesh(
                new THREE.BoxGeometry(1.2, 2.5, 0.8),
                new THREE.MeshStandardMaterial({ color: 0x333333 })
            );
            body.position.y = 1.25;
            group.add(body);
            const screen = new THREE.Mesh(
                new THREE.PlaneGeometry(0.8, 0.6),
                new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.5 })
            );
            screen.position.set(0, 1.8, 0.41);
            group.add(screen);
            const slot = new THREE.Mesh(
                new THREE.BoxGeometry(0.8, 0.4, 0.1),
                new THREE.MeshStandardMaterial({ color: 0x111111 })
            );
            slot.position.set(0, 0.4, 0.36);
            group.add(slot);
            group.position.set(vd.x * 2, 0, vd.z * 2);
            scene.add(group);
            vendingMachines.push({ mesh: group, hp: 30, active: true, screen });
        });
    }

    // ── Toxic Zones ───────────────────────────────────────────────────────────
    if (lv.toxicData) {
        lv.toxicData.forEach(td => {
            const toxGeo = new THREE.PlaneGeometry(1.9, 1.9);
            const toxMat = new THREE.MeshStandardMaterial({
                color: 0x33cc00,
                emissive: 0x116600,
                emissiveIntensity: 0.7,
                transparent: true,
                opacity: 0.88
            });
            const mesh = new THREE.Mesh(toxGeo, toxMat);
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.set(td.x * 2, 0.06, td.z * 2);
            scene.add(mesh);
            toxicZones.push({ x: td.x * 2, z: td.z * 2, mesh, _dmgTimer: 0, _shown: false });
        });
    }

    // ── Crushers ──────────────────────────────────────────────────────────────
    if (lv.crusherData) {
        lv.crusherData.forEach(cd => {
            // Crusher block (comes down from ceiling)
            const geo = new THREE.BoxGeometry(1.8, 0.5, 1.8);
            const mat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(cd.x * 2, 4.0, cd.z * 2);
            mesh.castShadow = true;
            scene.add(mesh);
            // Warning markings on floor
            const markGeo = new THREE.PlaneGeometry(1.8, 1.8);
            const markMat = new THREE.MeshStandardMaterial({
                color: 0xff9900,
                emissive: 0x442200,
                emissiveIntensity: 0.5
            });
            const mark = new THREE.Mesh(markGeo, markMat);
            mark.rotation.x = -Math.PI / 2;
            mark.position.set(cd.x * 2, 0.04, cd.z * 2);
            scene.add(mark);
            crushers.push({
                mesh,
                x: cd.x * 2,
                z: cd.z * 2,
                period: cd.period || 3,
                phase: cd.phase || 0,
                _dmgCooldown: 0
            });
        });
    }

    // ── Alarm Panels ──────────────────────────────────────────────────────────
    if (lv.alarmPanelData) {
        lv.alarmPanelData.forEach(ad => {
            const group = new THREE.Group();

            const panelGeo = new THREE.BoxGeometry(0.75, 1.1, 0.12);
            const panelMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, metalness: 0.3 });
            const panel = new THREE.Mesh(panelGeo, panelMat);
            panel.position.y = 1.6;
            group.add(panel);

            // Blinking light
            const lightGeo = new THREE.SphereGeometry(0.1, 8, 8);
            const lightMat = new THREE.MeshStandardMaterial({
                color: 0xff2200, emissive: 0xff2200, emissiveIntensity: 1.0
            });
            const light = new THREE.Mesh(lightGeo, lightMat);
            light.position.set(0, 2.05, 0.1);
            group.add(light);

            // Yellow key icon on panel
            const keyIconGeo = new THREE.BoxGeometry(0.3, 0.45, 0.05);
            const keyIconMat = new THREE.MeshStandardMaterial({ color: 0xffdd00, emissive: 0x554400, emissiveIntensity: 0.4 });
            const keyIcon = new THREE.Mesh(keyIconGeo, keyIconMat);
            keyIcon.position.set(0, 1.45, 0.1);
            group.add(keyIcon);

            group.position.set(ad.x * 2, 0, ad.z * 2);
            const facing = ad.facing || 'south';
            if (facing === 'south')     group.position.z += 0.85;
            else if (facing === 'north') group.position.z -= 0.85;
            else if (facing === 'east')  group.position.x += 0.85;
            else if (facing === 'west')  group.position.x -= 0.85;

            scene.add(group);
            alarmPanels.push({
                mesh: group,
                lightMesh: light,
                active: true,
                triggered: false,
                x: ad.x * 2,
                z: ad.z * 2,
                spawnEnemies: ad.spawnEnemies || [],
                _blinkTimer: 0
            });
        });
    }

    // ── Floor and Ceiling ─────────────────────────────────────────────────────
    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshStandardMaterial({
        color: lv.floor,
        roughness: 0.2,
        metalness: 0.4
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    const ceilGeo = new THREE.PlaneGeometry(200, 200);
    const ceilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const ceil = new THREE.Mesh(ceilGeo, ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 4;
    scene.add(ceil);

    return {
        walls, doors, enemies, exits, playerStart,
        pickups, barrels, props, vendingMachines,
        secretWalls, toxicZones, crushers, alarmPanels
    };
}
