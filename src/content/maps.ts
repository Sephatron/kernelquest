// All maps. ASCII rows, one char per tile — see TILES in game/world.ts for
// the legend. tests/content.test.ts validates every row, warp and NPC.

import type { GameMap } from "../game/world";

export const MAPS: Record<string, GameMap> = {};

MAPS["boot-village"] = {
	id: "boot-village",
	name: "Boot Village",
	music: "town",
	tiles: [
		"tttttttttt,,tttttttt",
		"t.........,,.......t",
		"t.IIII....,,..IIII.t",
		"t.HHHH....,,..HHHH.t",
		"t.#WdW....,,..#WdW.t",
		"t...,.....,,....,..t",
		"t...,.....,,....,..t",
		"t...,,,,,,,,,,,,,..t",
		"t......IIIIII......t",
		"t.f....HHHHHH....f.t",
		"t......#WWdW#.s....t",
		"t.........,........t",
		"t...==....,....www.t",
		"t...==....,....www.t",
		"t.........,....www.t",
		"t.........,.....f..t",
		"t..................t",
		"tttttttttttttttttttt"
	],
	warps: [
		{ x: 10, y: 0, toMap: "route-01", toX: 10, toY: 28, kind: "edge", dir: "up" },
		{ x: 11, y: 0, toMap: "route-01", toX: 11, toY: 28, kind: "edge", dir: "up" },
		{ x: 4, y: 4, toMap: "house-player", toX: 4, toY: 6, kind: "door", dir: "up" },
		{ x: 16, y: 4, toMap: "house-neighbour", toX: 4, toY: 6, kind: "door", dir: "up" },
		{ x: 10, y: 10, toMap: "boot-lab", toX: 5, toY: 7, kind: "door", dir: "up" }
	],
	npcs: [
		{ id: "bv-villager", sprite: "villager", x: 6, y: 11, dir: "down", move: "wander", dialogue: "bv-villager" },
		{ id: "bv-kid", sprite: "kid", x: 14, y: 15, dir: "left", move: "spin", dialogue: "bv-kid" }
	],
	signs: [{ x: 14, y: 10, text: ["PROF ADA'S LAB", "Debuggers wanted. Enquire within."] }],
	triggers: [
		{ x: 10, y: 1, w: 2, h: 1, script: "block-route1", when: { notFlag: "intro.starter" } }
	]
};

MAPS["house-player"] = {
	id: "house-player",
	name: "Your house",
	music: "town",
	indoor: true,
	tiles: [
		"##########",
		"#+____T__#",
		"#________#",
		"#___TT___#",
		"#___TT___#",
		"#________#",
		"#________#",
		"####mm####",
		"##########"
	],
	warps: [
		{ x: 4, y: 7, toMap: "boot-village", toX: 4, toY: 5, kind: "door", dir: "down" },
		{ x: 5, y: 7, toMap: "boot-village", toX: 4, toY: 5, kind: "door", dir: "down" }
	],
	npcs: [
		{ id: "mum", sprite: "villager2", x: 6, y: 3, dir: "down", move: "static", dialogue: "mum" }
	],
	signs: [{ x: 1, y: 1, text: ["Your terminal. 4,096 unread emails.", "They can wait. They have waited this long."] }]
};

MAPS["house-neighbour"] = {
	id: "house-neighbour",
	name: "Neighbour's house",
	music: "town",
	indoor: true,
	tiles: [
		"##########",
		"#T_____+_#",
		"#________#",
		"#__TT____#",
		"#__TT____#",
		"#________#",
		"#________#",
		"####mm####",
		"##########"
	],
	warps: [
		{ x: 4, y: 7, toMap: "boot-village", toX: 16, toY: 5, kind: "door", dir: "down" },
		{ x: 5, y: 7, toMap: "boot-village", toX: 16, toY: 5, kind: "door", dir: "down" }
	],
	npcs: [
		{ id: "nb-oldman", sprite: "oldman", x: 2, y: 3, dir: "down", move: "static", dialogue: "nb-oldman" }
	],
	signs: [{ x: 7, y: 1, text: ["A terminal running a screensaver of", "pipes. It has seen things."] }]
};

MAPS["boot-lab"] = {
	id: "boot-lab",
	name: "Prof Ada's lab",
	music: "lab",
	indoor: true,
	tiles: [
		"############",
		"#B__++++__B#",
		"#__________#",
		"#B__TTTT__B#",
		"#__________#",
		"#B________B#",
		"#__________#",
		"#__________#",
		"#####mm#####",
		"############"
	],
	warps: [
		{ x: 5, y: 8, toMap: "boot-village", toX: 10, toY: 11, kind: "door", dir: "down" },
		{ x: 6, y: 8, toMap: "boot-village", toX: 10, toY: 11, kind: "door", dir: "down" }
	],
	npcs: [
		{ id: "ada", sprite: "ada", x: 5, y: 2, dir: "down", move: "static", script: "ada-talk" }
	],
	signs: [
		{ x: 4, y: 1, text: ["THE ROUTINE DEX — a catalogue of every", "routine ever written in Kernelia.", "Volume 1 of 4,096."] }
	],
	triggers: [{ x: 1, y: 6, w: 10, h: 1, script: "intro-lab", onceFlag: "intro.lab" }]
};

MAPS["route-01"] = {
	id: "route-01",
	name: "Route 1",
	music: "route",
	tiles: [
		"tttttttttt,,tttttttt",
		"t.........,,.......t",
		"t..ttt.gg.,,.gg.tt.t",
		"t..ttt.gg.,,.gg.tt.t",
		"t......gg.,,.gg....t",
		"t...gg....,,.......t",
		"t...gg....,,..s....t",
		"t.........,,.......t",
		"t.LLLLLLLL,,LLLLLLLt",
		"t.........,,.......t",
		"t..gg.gg..,,..gg...t",
		"t..gg.gg..,,..gg...t",
		"t.........,,..gg...t",
		"t...f.....,,.......t",
		"t.........,,....f..t",
		"t.ttt.....,,..ttt..t",
		"t.ttt.gg..,,..ttt..t",
		"t.....gg..,,.......t",
		"t.........,,..gg...t",
		"t.LLLLLLLL,,LLLLLLLt",
		"t.........,,.......t",
		"t..gg.....,,...gg..t",
		"t..gg.....,,...gg..t",
		"t.........,,.......t",
		"t....tt...,,..tt...t",
		"t....tt...,,..tt...t",
		"t.f.......,,.....f.t",
		"t.........,,.......t",
		"t.........,,.......t",
		"tttttttttt,,tttttttt"
	],
	warps: [
		{ x: 10, y: 29, toMap: "boot-village", toX: 10, toY: 1, kind: "edge", dir: "down" },
		{ x: 11, y: 29, toMap: "boot-village", toX: 11, toY: 1, kind: "edge", dir: "down" },
		{ x: 10, y: 0, toMap: "stepwick", toX: 10, toY: 16, kind: "edge", dir: "up" },
		{ x: 11, y: 0, toMap: "stepwick", toX: 11, toY: 16, kind: "edge", dir: "up" }
	],
	npcs: [
		{ id: "r1-kid", sprite: "kid", x: 13, y: 21, dir: "down", move: "wander", dialogue: "r1-kid" }
	],
	signs: [{ x: 14, y: 6, text: ["ROUTE 1", "Mind the ledges. One-way, like time."] }],
	encounters: {
		rate: 0.16,
		species: [
			["bitling", 5],
			["nullmoth", 3],
			["loopling", 2]
		]
	}
};

MAPS["stepwick"] = {
	id: "stepwick",
	name: "Stepwick",
	music: "town",
	tiles: [
		"tttttttttt,,tttttttt",
		"t.........,,.......t",
		"t..IIII....IIII....t",
		"t..HHHH....HHHH....t",
		"t..#WdW....#WdW....t",
		"t....,.......,.....t",
		"t....,..s....,.....t",
		"t.IIIIII.....,.....t",
		"t.HHHHHH.....,.....t",
		"t.#WdW##G....,.....t",
		"t...,........,.....t",
		"t...,,,,,,,,,,.....t",
		"t.........,........t",
		"t...==....,....==..t",
		"t...f.....,......f.t",
		"t.........,........t",
		"t.........,........t",
		"tttttttttt,,tttttttt"
	],
	warps: [
		{ x: 10, y: 17, toMap: "route-01", toX: 10, toY: 1, kind: "edge", dir: "down" },
		{ x: 11, y: 17, toMap: "route-01", toX: 11, toY: 1, kind: "edge", dir: "down" },
		{ x: 10, y: 0, toMap: "route-02", toX: 10, toY: 26, kind: "edge", dir: "up" },
		{ x: 11, y: 0, toMap: "route-02", toX: 11, toY: 26, kind: "edge", dir: "up" },
		{ x: 5, y: 4, toMap: "stepwick-repair", toX: 4, toY: 5, kind: "door", dir: "up" },
		{ x: 13, y: 4, toMap: "stepwick-shop", toX: 4, toY: 5, kind: "door", dir: "up" },
		{ x: 4, y: 9, toMap: "stepwick-gym", toX: 5, toY: 9, kind: "door", dir: "up" }
	],
	npcs: [
		{ id: "sw-villager", sprite: "villager2", x: 7, y: 12, dir: "down", move: "wander", dialogue: "sw-villager" },
		{ id: "sw-oldman", sprite: "oldman", x: 16, y: 15, dir: "left", move: "spin", dialogue: "sw-oldman" }
	],
	signs: [
		{ x: 8, y: 6, text: ["STEPWICK", "First things first. Then second things."] },
		{ x: 8, y: 9, text: ["STEPWICK GYM", "Leader: MARSHAL INDEX", "\"Order isn't optional.\""] }
	]
};

// Interior templates reused across towns (ids differ, layouts rhyme).
function repairCentre(id: string, town: string, exitX: number, exitY: number): GameMap {
	return {
		id,
		name: "Repair centre",
		music: "repair",
		indoor: true,
		tiles: [
			"##########",
			"#.B....B.#",
			"#...--...#",
			"#........#",
			"#........#",
			"#........#",
			"####mm####",
			"##########"
		],
		warps: [
			{ x: 4, y: 6, toMap: town, toX: exitX, toY: exitY, kind: "door", dir: "down" },
			{ x: 5, y: 6, toMap: town, toX: exitX, toY: exitY, kind: "door", dir: "down" }
		],
		npcs: [{ id: id + "-tech", sprite: "tech", x: 4, y: 1, dir: "down", move: "static", script: "repair-heal" }]
	};
}

function shop(id: string, town: string, exitX: number, exitY: number): GameMap {
	return {
		id,
		name: "Shop",
		music: "repair",
		indoor: true,
		tiles: [
			"##########",
			"#SSS..SSS#",
			"#........#",
			"#..--....#",
			"#........#",
			"#........#",
			"####mm####",
			"##########"
		],
		warps: [
			{ x: 4, y: 6, toMap: town, toX: exitX, toY: exitY, kind: "door", dir: "down" },
			{ x: 5, y: 6, toMap: town, toX: exitX, toY: exitY, kind: "door", dir: "down" }
		],
		npcs: [{ id: id + "-clerk", sprite: "clerk", x: 3, y: 2, dir: "down", move: "static", script: "shop-open" }]
	};
}

MAPS["stepwick-repair"] = repairCentre("stepwick-repair", "stepwick", 5, 5);
MAPS["stepwick-shop"] = shop("stepwick-shop", "stepwick", 13, 5);

MAPS["stepwick-gym"] = {
	id: "stepwick-gym",
	name: "Stepwick gym",
	music: "gym",
	indoor: true,
	tiles: [
		"############",
		"#____PP____#",
		"#__________#",
		"#__________#",
		"#_B______B_#",
		"#__________#",
		"#__________#",
		"#_B______B_#",
		"#__________#",
		"#__________#",
		"#####mm#####",
		"############"
	],
	warps: [
		{ x: 5, y: 10, toMap: "stepwick", toX: 4, toY: 10, kind: "door", dir: "down" },
		{ x: 6, y: 10, toMap: "stepwick", toX: 4, toY: 10, kind: "door", dir: "down" }
	],
	npcs: [
		{ id: "gym1-leader", sprite: "leader", x: 5, y: 2, dir: "down", move: "static", script: "gym1-leader" },
		{ id: "gym1-t1", sprite: "kid", x: 3, y: 6, dir: "right", move: "static", script: "gym1-t1" }
	],
	triggers: [{ x: 4, y: 9, w: 4, h: 1, script: "gym1-enter", onceFlag: "gym1.entered" }]
};

// A reusable gym hall: leader on the dais, optional aide mid-floor, entry
// plaque trigger, mats back to town.
function gymHall(
	id: string,
	town: string,
	exitX: number,
	exitY: number,
	leaderScript: string,
	enterScript: string,
	aide?: { sprite: string; script: string }
): GameMap {
	return {
		id,
		name: "Gym",
		music: "gym",
		indoor: true,
		tiles: [
			"############",
			"#____PP____#",
			"#__________#",
			"#__________#",
			"#_B______B_#",
			"#__________#",
			"#__________#",
			"#_B______B_#",
			"#__________#",
			"#__________#",
			"#####mm#####",
			"############"
		],
		warps: [
			{ x: 5, y: 10, toMap: town, toX: exitX, toY: exitY, kind: "door", dir: "down" },
			{ x: 6, y: 10, toMap: town, toX: exitX, toY: exitY, kind: "door", dir: "down" }
		],
		npcs: [
			{ id: id + "-leader", sprite: "leader", x: 5, y: 2, dir: "down", move: "static", script: leaderScript },
			...(aide
				? [{ id: id + "-aide", sprite: aide.sprite, x: 3, y: 6, dir: "right" as const, move: "static" as const, script: aide.script }]
				: [])
		],
		triggers: [{ x: 4, y: 9, w: 4, h: 1, script: enterScript, onceFlag: id + ".entered" }]
	};
}

MAPS["route-02"] = {
	id: "route-02",
	name: "Route 2",
	music: "route",
	tiles: [
		"tttttttttt,,tttttttt",
		"t.........,,.......t",
		"t.gg..tt..,,..gg...t",
		"t.gg..tt..,,..gg...t",
		"t.........,,.......t",
		"t...s.....,,...tt..t",
		"t.........,,...tt..t",
		"t.LLLLLLLL,,LLLLLLLt",
		"t.........,,.......t",
		"t..gg.....,,....gg.t",
		"t..gg..f..,,....gg.t",
		"t.........,,.......t",
		"t....tt...,,..tt...t",
		"t....tt...,,..tt...t",
		"t.........,,.......t",
		"t.LLLLLLLL,,LLLLLLLt",
		"t.........,,.......t",
		"t...gg....,,..gg...t",
		"t...gg....,,..gg...t",
		"t.........,,..gg...t",
		"t..f......,,.......t",
		"t.........,,.tt....t",
		"t....tt...,,.tt....t",
		"t....tt...,t.......t",
		"t.........,t..f....t",
		"t.........,,.......t",
		"t.........,,.......t",
		"tttttttttt,,tttttttt"
	],
	warps: [
		{ x: 10, y: 27, toMap: "stepwick", toX: 10, toY: 1, kind: "edge", dir: "down" },
		{ x: 11, y: 27, toMap: "stepwick", toX: 11, toY: 1, kind: "edge", dir: "down" },
		{ x: 10, y: 0, toMap: "loophollow", toX: 10, toY: 16, kind: "edge", dir: "up" },
		{ x: 11, y: 0, toMap: "loophollow", toX: 11, toY: 16, kind: "edge", dir: "up" }
	],
	npcs: [
		{
			id: "r2-guard",
			sprite: "villager",
			x: 10,
			y: 23,
			dir: "down",
			move: "static",
			dialogue: "r2-guard",
			when: { maxBadges: 0 }
		},
		{ id: "r2-kid", sprite: "kid", x: 15, y: 18, dir: "down", move: "wander", dialogue: "r2-kid" }
	],
	signs: [{ x: 4, y: 5, text: ["ROUTE 2", "Loophollow ahead. Around and around you go."] }],
	triggers: [
		{ x: 10, y: 14, w: 2, h: 1, script: "rival1-scene", onceFlag: "seen.rival1" }
	],
	encounters: {
		rate: 0.16,
		species: [
			["dittograf", 5],
			["echomite", 4],
			["bitling", 2]
		]
	}
};

MAPS["loophollow"] = {
	id: "loophollow",
	name: "Loophollow",
	music: "town",
	tiles: [
		"tttttttttt,,tttttttt",
		"t.........,,.......t",
		"t..IIII...,,.IIII..t",
		"t..HHHH...,,.HHHH..t",
		"t..#WdW...,,.#WdW..t",
		"t....,....,,...,...t",
		"t....,,,,,,,,,,,...t",
		"t.....s............t",
		"t...,,,,,,,,,......t",
		"t...,ttttttt,......t",
		"t...,t.f.f.t,......t",
		"t...,ttttttt,......t",
		"t...,,,,,,,,,......t",
		"t..IIIIII..........t",
		"t..HHHHHH.....f....t",
		"t..#WdW##G.........t",
		"t..................t",
		"tttttttttt,,tttttttt"
	],
	warps: [
		{ x: 10, y: 17, toMap: "route-02", toX: 10, toY: 1, kind: "edge", dir: "down" },
		{ x: 11, y: 17, toMap: "route-02", toX: 11, toY: 1, kind: "edge", dir: "down" },
		{ x: 10, y: 0, toMap: "route-03", toX: 10, toY: 26, kind: "edge", dir: "up" },
		{ x: 11, y: 0, toMap: "route-03", toX: 11, toY: 26, kind: "edge", dir: "up" },
		{ x: 5, y: 4, toMap: "loophollow-repair", toX: 4, toY: 5, kind: "door", dir: "up" },
		{ x: 15, y: 4, toMap: "loophollow-shop", toX: 4, toY: 5, kind: "door", dir: "up" },
		{ x: 5, y: 15, toMap: "loophollow-gym", toX: 5, toY: 9, kind: "door", dir: "up" }
	],
	npcs: [
		{ id: "lh-villager", sprite: "villager", x: 7, y: 10, dir: "down", move: "wander", dialogue: "lh-villager" },
		{ id: "lh-kid", sprite: "kid", x: 14, y: 8, dir: "left", move: "spin", dialogue: "lh-kid" },
		{
			id: "lh-guard",
			sprite: "oldman",
			x: 10,
			y: 1,
			dir: "down",
			move: "static",
			dialogue: "lh-guard",
			when: { maxBadges: 1 }
		}
	],
	signs: [{ x: 6, y: 7, text: ["LOOPHOLLOW", "Twinned with itself. Twinned with itself."] }]
};

MAPS["loophollow-repair"] = repairCentre("loophollow-repair", "loophollow", 5, 5);
MAPS["loophollow-shop"] = shop("loophollow-shop", "loophollow", 15, 5);
MAPS["loophollow-gym"] = gymHall("loophollow-gym", "loophollow", 5, 16, "gym2-leader", "gym2-enter", {
	sprite: "kid",
	script: "gym2-t1"
});

MAPS["route-03"] = {
	id: "route-03",
	name: "Route 3",
	music: "route",
	tiles: [
		"tttttttttt,,tttttttt",
		"t.........,,.......t",
		"t.pp......,,....pp.t",
		"t.pp..gg..,,....pp.t",
		"t.....gg..,,..gg...t",
		"t.........,,..gg...t",
		"t..s......,,.......t",
		"t.........,,...pp..t",
		"t.pp......,,...pp..t",
		"t.pp..gg..,,.......t",
		"t.....gg..,,..gg...t",
		"t.........,,..gg...t",
		"t.LLLLLLLL,,LLLLLLLt",
		"t.........,,.......t",
		"t...gg....,,...f...t",
		"t...gg....,,.......t",
		"t.pp......,,....pp.t",
		"t.pp..f...,,....pp.t",
		"t.........,,.......t",
		"t....gg...,,..gg...t",
		"t....gg...,,..gg...t",
		"t.........,,.......t",
		"t.pp......,,....pp.t",
		"t.pp......,,....pp.t",
		"t.........,,.......t",
		"t.........,,.......t",
		"t.........,,.......t",
		"tttttttttt,,tttttttt"
	],
	warps: [
		{ x: 10, y: 27, toMap: "loophollow", toX: 10, toY: 1, kind: "edge", dir: "down" },
		{ x: 11, y: 27, toMap: "loophollow", toX: 11, toY: 1, kind: "edge", dir: "down" },
		{ x: 10, y: 0, toMap: "forkbridge", toX: 10, toY: 16, kind: "edge", dir: "up" },
		{ x: 11, y: 0, toMap: "forkbridge", toX: 11, toY: 16, kind: "edge", dir: "up" }
	],
	npcs: [
		{ id: "r3-villager", sprite: "villager2", x: 14, y: 15, dir: "down", move: "wander", dialogue: "r3-villager" }
	],
	signs: [{ x: 3, y: 6, text: ["ROUTE 3", "Forkbridge ahead. The river asks a question."] }],
	encounters: {
		rate: 0.16,
		species: [
			["shutterbug", 5],
			["maybit", 4],
			["echomite", 2]
		]
	}
};

MAPS["forkbridge"] = {
	id: "forkbridge",
	name: "Forkbridge",
	music: "town",
	tiles: [
		"tttttttttt,,tttttttt",
		"t.........,,.......t",
		"t..IIII...,,.IIII..t",
		"t..HHHH...,,.HHHH..t",
		"t..#WdW...,,.#WdW..t",
		"t..................t",
		"twwwwwwbbwwwwwbbwwwt",
		"twwwwwwbbwwwwwbbwwwt",
		"t.....s............t",
		"t..................t",
		"t..IIIIII......==..t",
		"t..HHHHHH......f...t",
		"t..#WdW##G.........t",
		"t..................t",
		"t...f..............t",
		"t..................t",
		"t..................t",
		"tttttttttt,,tttttttt"
	],
	warps: [
		{ x: 10, y: 17, toMap: "route-03", toX: 10, toY: 1, kind: "edge", dir: "down" },
		{ x: 11, y: 17, toMap: "route-03", toX: 11, toY: 1, kind: "edge", dir: "down" },
		{ x: 10, y: 0, toMap: "route-04", toX: 10, toY: 24, kind: "edge", dir: "up" },
		{ x: 11, y: 0, toMap: "route-04", toX: 11, toY: 24, kind: "edge", dir: "up" },
		{ x: 5, y: 4, toMap: "forkbridge-repair", toX: 4, toY: 5, kind: "door", dir: "up" },
		{ x: 15, y: 4, toMap: "forkbridge-shop", toX: 4, toY: 5, kind: "door", dir: "up" },
		{ x: 5, y: 12, toMap: "forkbridge-gym", toX: 5, toY: 9, kind: "door", dir: "up" }
	],
	npcs: [
		{ id: "fb-villager", sprite: "villager", x: 7, y: 6, dir: "down", move: "static", dialogue: "fb-villager" },
		{ id: "fb-oldman", sprite: "oldman", x: 16, y: 14, dir: "left", move: "spin", dialogue: "fb-oldman" },
		{
			id: "fb-guard",
			sprite: "villager2",
			x: 10,
			y: 1,
			dir: "down",
			move: "static",
			dialogue: "fb-guard",
			when: { maxBadges: 2 }
		}
	],
	signs: [{ x: 6, y: 8, text: ["FORKBRIDGE", "Two bridges. One river. Choose wisely, or don't — there's an else."] }]
};

MAPS["forkbridge-repair"] = repairCentre("forkbridge-repair", "forkbridge", 5, 5);
MAPS["forkbridge-shop"] = shop("forkbridge-shop", "forkbridge", 15, 5);
MAPS["forkbridge-gym"] = gymHall("forkbridge-gym", "forkbridge", 5, 13, "gym3-leader", "gym3-enter", {
	sprite: "villager",
	script: "gym3-t1"
});

MAPS["route-04"] = {
	id: "route-04",
	name: "Route 4",
	music: "route",
	tiles: [
		"tttttttttt,,tttttttt",
		"t.........,,.......t",
		"t..^^.....,,....^^.t",
		"t..^^..gg.,,....^^.t",
		"t......gg.,,..gg...t",
		"t.........,,..gg...t",
		"t..s......,,.......t",
		"t.........,,....^^.t",
		"t.LLLLLLLL,,LLLLLLLt",
		"t.........,,.......t",
		"t...gg....,,..gg...t",
		"t...gg....,,..gg...t",
		"t..^^.....,,.......t",
		"t..^^..f..,,....^^.t",
		"t.........,,....^^.t",
		"t....gg...,,.......t",
		"t....gg...,,..gg...t",
		"t.........,,..gg...t",
		"t..^^.....,,.......t",
		"t..^^.....,,....f..t",
		"t.........,,.......t",
		"t.........,,.......t",
		"t.........,,.......t",
		"t.........,,.......t",
		"tttttttttt,,tttttttt"
	],
	warps: [
		{ x: 10, y: 24, toMap: "forkbridge", toX: 10, toY: 1, kind: "edge", dir: "down" },
		{ x: 11, y: 24, toMap: "forkbridge", toX: 11, toY: 1, kind: "edge", dir: "down" },
		{ x: 10, y: 0, toMap: "cacheford", toX: 10, toY: 16, kind: "edge", dir: "up" },
		{ x: 11, y: 0, toMap: "cacheford", toX: 11, toY: 16, kind: "edge", dir: "up" }
	],
	npcs: [
		{ id: "r4-kid", sprite: "kid", x: 14, y: 15, dir: "down", move: "wander", dialogue: "r4-kid" }
	],
	signs: [{ x: 3, y: 6, text: ["ROUTE 4", "Cacheford ahead. Bring something worth keeping."] }],
	encounters: {
		rate: 0.16,
		species: [
			["cachegrub", 5],
			["memmoth", 4],
			["maybit", 2]
		]
	}
};

MAPS["cacheford"] = {
	id: "cacheford",
	name: "Cacheford",
	music: "town",
	tiles: [
		"tttttttttt,,tttttttt",
		"t.........,,.......t",
		"t..IIII...,,.IIII..t",
		"t..HHHH...,,.HHHH..t",
		"t..#WdW...,,.#WdW..t",
		"t.........,,.......t",
		"t..s..^^..,,..^^...t",
		"t.....^^..,,..^^...t",
		"t.........,,.......t",
		"t..^^.....,,....^^.t",
		"t..^^..www,,www.^^.t",
		"t......www,,www....t",
		"t.........,,.......t",
		"t..IIIIII.,,.......t",
		"t..HHHHHH.,,..f....t",
		"t..#WdW##G,,.......t",
		"t.........,,.......t",
		"tttttttttt,,tttttttt"
	],
	warps: [
		{ x: 10, y: 17, toMap: "route-04", toX: 10, toY: 1, kind: "edge", dir: "down" },
		{ x: 11, y: 17, toMap: "route-04", toX: 11, toY: 1, kind: "edge", dir: "down" },
		{ x: 10, y: 0, toMap: "route-05", toX: 10, toY: 24, kind: "edge", dir: "up" },
		{ x: 11, y: 0, toMap: "route-05", toX: 11, toY: 24, kind: "edge", dir: "up" },
		{ x: 5, y: 4, toMap: "cacheford-repair", toX: 4, toY: 5, kind: "door", dir: "up" },
		{ x: 15, y: 4, toMap: "cacheford-shop", toX: 4, toY: 5, kind: "door", dir: "up" },
		{ x: 5, y: 15, toMap: "cacheford-gym", toX: 5, toY: 9, kind: "door", dir: "up" }
	],
	npcs: [
		{ id: "cf-villager", sprite: "villager2", x: 7, y: 8, dir: "down", move: "wander", dialogue: "cf-villager" },
		{ id: "cf-oldman", sprite: "oldman", x: 15, y: 12, dir: "left", move: "spin", dialogue: "cf-oldman" },
		{
			id: "cf-guard",
			sprite: "villager",
			x: 10,
			y: 1,
			dir: "down",
			move: "static",
			dialogue: "cf-guard",
			when: { maxBadges: 3 }
		}
	],
	signs: [{ x: 3, y: 6, text: ["CACHEFORD", "What we keep, keeps us. Mostly crates."] }]
};

MAPS["cacheford-repair"] = repairCentre("cacheford-repair", "cacheford", 5, 5);
MAPS["cacheford-shop"] = shop("cacheford-shop", "cacheford", 15, 5);
MAPS["cacheford-gym"] = gymHall("cacheford-gym", "cacheford", 5, 16, "gym4-leader", "gym4-enter");

MAPS["route-05"] = {
	id: "route-05",
	name: "Route 5",
	music: "route",
	tiles: [
		"tttttttttt,,tttttttt",
		"t.........,,.......t",
		"t.gg......,,....gg.t",
		"t.gg..^^..,,....gg.t",
		"t.....^^..,,..^^...t",
		"t.........,,..^^...t",
		"t..s......,,.......t",
		"t.........,,....gg.t",
		"t...gg....,,....gg.t",
		"t...gg....,,.......t",
		"t.........,,..f....t",
		"t.LLLLLLLL,,LLLLLLLt",
		"t.........,,.......t",
		"t..gg.gg..,,..gg...t",
		"t..gg.gg..,,..gg...t",
		"t.........,,.......t",
		"t..^^.....,,....^^.t",
		"t..^^..f..,,....^^.t",
		"t.........,,.......t",
		"t....gg...,,..gg...t",
		"t....gg...,,..gg...t",
		"t.........,,.......t",
		"t.........,,.......t",
		"t.........,,.......t",
		"tttttttttt,,tttttttt"
	],
	warps: [
		{ x: 10, y: 24, toMap: "cacheford", toX: 10, toY: 1, kind: "edge", dir: "down" },
		{ x: 11, y: 24, toMap: "cacheford", toX: 11, toY: 1, kind: "edge", dir: "down" },
		{ x: 10, y: 0, toMap: "routine-row", toX: 10, toY: 16, kind: "edge", dir: "up" },
		{ x: 11, y: 0, toMap: "routine-row", toX: 11, toY: 16, kind: "edge", dir: "up" }
	],
	npcs: [
		{ id: "r5-villager", sprite: "villager", x: 15, y: 18, dir: "down", move: "wander", dialogue: "r5-villager" }
	],
	signs: [{ x: 3, y: 6, text: ["ROUTE 5", "Routine Row ahead. Say what you do; do what you say."] }],
	triggers: [{ x: 10, y: 8, w: 2, h: 1, script: "rival2-scene", onceFlag: "seen.rival2" }],
	encounters: {
		rate: 0.16,
		species: [
			["stacklet", 5],
			["callowtail", 4],
			["cachegrub", 2]
		]
	}
};

MAPS["routine-row"] = {
	id: "routine-row",
	name: "Routine Row",
	music: "town",
	tiles: [
		"tttttttttt,,tttttttt",
		"t.........,,.......t",
		"t.IIII.IIII,,IIII..t",
		"t.HHHH.HHHH,,HHHH..t",
		"t.#WdW.#WdW,,#WdW..t",
		"t.........,,.......t",
		"t..s......,,.......t",
		"t.........,,.......t",
		"t.IIII.IIII,,IIII..t",
		"t.HHHH.HHHH,,HHHH..t",
		"t.#WdW.#WdW,,#WdW..t",
		"t.........,,.......t",
		"t..IIIIII.,,...f...t",
		"t..HHHHHH.,,.......t",
		"t..#WdW##G,,.......t",
		"t.........,,.......t",
		"t.........,,.......t",
		"tttttttttt,,tttttttt"
	],
	warps: [
		{ x: 10, y: 17, toMap: "route-05", toX: 10, toY: 1, kind: "edge", dir: "down" },
		{ x: 11, y: 17, toMap: "route-05", toX: 11, toY: 1, kind: "edge", dir: "down" },
		{ x: 10, y: 0, toMap: "route-06", toX: 10, toY: 24, kind: "edge", dir: "up" },
		{ x: 11, y: 0, toMap: "route-06", toX: 11, toY: 24, kind: "edge", dir: "up" },
		{ x: 4, y: 4, toMap: "routinerow-repair", toX: 4, toY: 5, kind: "door", dir: "up" },
		{ x: 9, y: 4, toMap: "routinerow-shop", toX: 4, toY: 5, kind: "door", dir: "up" },
		{ x: 15, y: 4, toMap: "routinerow-house", toX: 4, toY: 6, kind: "door", dir: "up" },
		{ x: 5, y: 14, toMap: "routinerow-gym", toX: 5, toY: 9, kind: "door", dir: "up" }
	],
	npcs: [
		{ id: "rr-villager", sprite: "villager2", x: 6, y: 6, dir: "down", move: "wander", dialogue: "rr-villager" },
		{ id: "rr-kid", sprite: "kid", x: 15, y: 11, dir: "left", move: "spin", dialogue: "rr-kid" },
		{
			id: "rr-guard",
			sprite: "oldman",
			x: 10,
			y: 1,
			dir: "down",
			move: "static",
			dialogue: "rr-guard",
			when: { maxBadges: 4 }
		}
	],
	signs: [{ x: 3, y: 6, text: ["ROUTINE ROW", "Every house identical. Every household different."] }]
};

MAPS["routinerow-repair"] = repairCentre("routinerow-repair", "routine-row", 4, 5);
MAPS["routinerow-shop"] = shop("routinerow-shop", "routine-row", 9, 5);
MAPS["routinerow-house"] = {
	id: "routinerow-house",
	name: "A terraced house",
	music: "town",
	indoor: true,
	tiles: [
		"##########",
		"#T____+__#",
		"#________#",
		"#__TT____#",
		"#________#",
		"#________#",
		"#________#",
		"####mm####",
		"##########"
	],
	warps: [
		{ x: 4, y: 7, toMap: "routine-row", toX: 15, toY: 5, kind: "door", dir: "down" },
		{ x: 5, y: 7, toMap: "routine-row", toX: 15, toY: 5, kind: "door", dir: "down" }
	],
	npcs: [
		{ id: "rr-gifter", sprite: "villager", x: 6, y: 2, dir: "down", move: "static", script: "rr-gifter" }
	],
	signs: [{ x: 6, y: 1, text: ["A framed cross-stitch:", "'DRY — Don't Repeat Yourself.'", "The other wall has the same one."] }]
};
MAPS["routinerow-gym"] = gymHall("routinerow-gym", "routine-row", 5, 15, "gym5-leader", "gym5-enter", {
	sprite: "clerk",
	script: "gym5-t1"
});

MAPS["route-06"] = {
	id: "route-06",
	name: "Route 6",
	music: "route",
	tiles: [
		"tttttttttt,,tttttttt",
		"t.^^......,,....^^.t",
		"t.^^......,,....^^.t",
		"t....^^...,,..^^...t",
		"t....^^...,,..^^...t",
		"t..s......,,.......t",
		"t.........,,..gg...t",
		"t.LLLLLLLL,,LLLLLLLt",
		"t.........,,.......t",
		"t..gg.....,,....gg.t",
		"t..gg..^^.,,....gg.t",
		"t......^^.,,..^^...t",
		"t.........,,..^^...t",
		"t.LLLLLLLL,,LLLLLLLt",
		"t.........,,.......t",
		"t...gg....,,..gg...t",
		"t...gg....,,..gg...t",
		"t.^^......,,......^t",
		"t.^^..f...,,....f.^t",
		"t.........,,.......t",
		"t.........,,.......t",
		"t.........,,.......t",
		"t.........,,.......t",
		"t.........,,.......t",
		"tttttttttt,,tttttttt"
	],
	warps: [
		{ x: 10, y: 24, toMap: "routine-row", toX: 10, toY: 1, kind: "edge", dir: "down" },
		{ x: 11, y: 24, toMap: "routine-row", toX: 11, toY: 1, kind: "edge", dir: "down" },
		{ x: 10, y: 0, toMap: "modula-heights", toX: 10, toY: 16, kind: "edge", dir: "up" },
		{ x: 11, y: 0, toMap: "modula-heights", toX: 11, toY: 16, kind: "edge", dir: "up" }
	],
	npcs: [
		{ id: "r6-oldman", sprite: "oldman", x: 14, y: 16, dir: "down", move: "wander", dialogue: "r6-oldman" }
	],
	signs: [{ x: 3, y: 5, text: ["ROUTE 6", "Modula Heights ahead. Watch your step; it's load-bearing."] }],
	encounters: {
		rate: 0.16,
		species: [
			["modulith", 5],
			["fragmite", 4],
			["stacklet", 2]
		]
	}
};

MAPS["modula-heights"] = {
	id: "modula-heights",
	name: "Modula Heights",
	music: "town",
	tiles: [
		"tttttttttt,,tttttttt",
		"t^^.......,,......^t",
		"t^.IIII...,,.IIII.^t",
		"t..HHHH...,,.HHHH..t",
		"t..#WdW...,,.#WdW..t",
		"t.........,,.......t",
		"t..s..^^..,,..^^...t",
		"t......^^.,,.^^....t",
		"t.........,,.......t",
		"t.LLLLLLL.,,.LLLLL.t",
		"t.........,,.......t",
		"t..IIIIII.,,....^^.t",
		"t..HHHHHH.,,....^^.t",
		"t..#WdW##G,,..f....t",
		"t.........,,.......t",
		"t^........,,......^t",
		"t^^.......,,.....^^t",
		"tttttttttt,,tttttttt"
	],
	warps: [
		{ x: 10, y: 17, toMap: "route-06", toX: 10, toY: 1, kind: "edge", dir: "down" },
		{ x: 11, y: 17, toMap: "route-06", toX: 11, toY: 1, kind: "edge", dir: "down" },
		{ x: 10, y: 0, toMap: "route-07", toX: 10, toY: 24, kind: "edge", dir: "up" },
		{ x: 11, y: 0, toMap: "route-07", toX: 11, toY: 24, kind: "edge", dir: "up" },
		{ x: 5, y: 4, toMap: "modula-repair", toX: 4, toY: 5, kind: "door", dir: "up" },
		{ x: 15, y: 4, toMap: "modula-shop", toX: 4, toY: 5, kind: "door", dir: "up" },
		{ x: 5, y: 13, toMap: "modula-gym", toX: 5, toY: 9, kind: "door", dir: "up" }
	],
	npcs: [
		{ id: "mh-villager", sprite: "villager", x: 7, y: 8, dir: "down", move: "wander", dialogue: "mh-villager" },
		{
			id: "mh-guard",
			sprite: "villager2",
			x: 10,
			y: 1,
			dir: "down",
			move: "static",
			dialogue: "mh-guard",
			when: { maxBadges: 5 }
		}
	],
	signs: [{ x: 3, y: 6, text: ["MODULA HEIGHTS", "Assembled on site from prefabricated views."] }]
};

MAPS["modula-repair"] = repairCentre("modula-repair", "modula-heights", 5, 5);
MAPS["modula-shop"] = shop("modula-shop", "modula-heights", 14, 5);
MAPS["modula-gym"] = gymHall("modula-gym", "modula-heights", 5, 14, "gym6-leader", "gym6-enter");

MAPS["route-07"] = {
	id: "route-07",
	name: "Route 7",
	music: "route",
	tiles: [
		"tttttttttt,,tttttttt",
		"t.........,,.......t",
		"t.~~~.....,,..~~~..t",
		"t.~~~..s..,,..~~~..t",
		"t.........,,.......t",
		"t...~~....,,..~~...t",
		"t...~~....,,..~~...t",
		"t.........,,.......t",
		"t.~~~.....,,....~~.t",
		"t.~~~.....,,....~~.t",
		"t.........,,.......t",
		"t....~~...,,..~~...t",
		"t....~~...,,..~~...t",
		"t.........,,.......t",
		"t.~~......,,....~~.t",
		"t.~~..f...,,....~~.t",
		"t.........,,.......t",
		"t...~~....,,..~~...t",
		"t...~~....,,..~~...t",
		"t.........,,.......t",
		"t.........,,.......t",
		"t.........,,.......t",
		"t.........,,.......t",
		"t.........,,.......t",
		"tttttttttt,,tttttttt"
	],
	warps: [
		{ x: 10, y: 24, toMap: "modula-heights", toX: 10, toY: 1, kind: "edge", dir: "down" },
		{ x: 11, y: 24, toMap: "modula-heights", toX: 11, toY: 1, kind: "edge", dir: "down" },
		{ x: 10, y: 0, toMap: "tracewell", toX: 10, toY: 16, kind: "edge", dir: "up" }
		,{ x: 11, y: 0, toMap: "tracewell", toX: 11, toY: 16, kind: "edge", dir: "up" }
	],
	npcs: [
		{ id: "r7-grunt", sprite: "grunt", x: 8, y: 10, dir: "right", move: "static", dialogue: "r7-grunt" },
		{ id: "r7-grunt2", sprite: "grunt", x: 13, y: 17, dir: "left", move: "static", dialogue: "r7-grunt2" }
	],
	signs: [{ x: 7, y: 3, text: ["ROUTE 7", "Tracewell ahead. If you're lost, good — now you're paying attention."] }],
	encounters: {
		rate: 0.17,
		species: [
			["tracehound", 5],
			["breakpointer", 4],
			["fragmite", 2]
		]
	}
};

MAPS["tracewell"] = {
	id: "tracewell",
	name: "Tracewell",
	music: "town",
	tiles: [
		"tttttttttt,,tttttttt",
		"t.........,,.......t",
		"t..IIII...,,.IIII..t",
		"t..HHHH...,,.HHHH..t",
		"t..#WdW...,,.#WdW..t",
		"t.........,,.......t",
		"t..s.www..,,.......t",
		"t....www..,,..III..t",
		"t.........,,..HHH..t",
		"t.~~......,,..#d#..t",
		"t.~~......,,.......t",
		"t.........,,.......t",
		"t..IIIIII.,,...~~..t",
		"t..HHHHHH.,,...~~..t",
		"t..#WdW##G,,.......t",
		"t.........,,..f....t",
		"t.........,,.......t",
		"tttttttttt,,tttttttt"
	],
	warps: [
		{ x: 10, y: 17, toMap: "route-07", toX: 10, toY: 1, kind: "edge", dir: "down" },
		{ x: 11, y: 17, toMap: "route-07", toX: 11, toY: 1, kind: "edge", dir: "down" },
		{ x: 10, y: 0, toMap: "route-08", toX: 10, toY: 24, kind: "edge", dir: "up" },
		{ x: 11, y: 0, toMap: "route-08", toX: 11, toY: 24, kind: "edge", dir: "up" },
		{ x: 5, y: 4, toMap: "tracewell-repair", toX: 4, toY: 5, kind: "door", dir: "up" },
		{ x: 15, y: 4, toMap: "tracewell-shop", toX: 4, toY: 5, kind: "door", dir: "up" },
		{ x: 15, y: 9, toMap: "kludge-vat", toX: 5, toY: 8, kind: "door", dir: "up" },
		{ x: 5, y: 14, toMap: "tracewell-gym", toX: 5, toY: 9, kind: "door", dir: "up" }
	],
	npcs: [
		{ id: "tw-villager", sprite: "villager2", x: 6, y: 10, dir: "down", move: "wander", dialogue: "tw-villager" },
		{
			id: "tw-grunt",
			sprite: "grunt",
			x: 15,
			y: 10,
			dir: "down",
			move: "static",
			dialogue: "tw-grunt",
			when: { notFlag: "won.nullfight" }
		},
		{
			id: "tw-guard",
			sprite: "oldman",
			x: 10,
			y: 1,
			dir: "down",
			move: "static",
			dialogue: "tw-guard",
			when: { maxBadges: 6 }
		}
	],
	signs: [{ x: 3, y: 6, text: ["TRACEWELL", "Every well goes somewhere. Follow the water."] }]
};

MAPS["tracewell-repair"] = repairCentre("tracewell-repair", "tracewell", 5, 5);
MAPS["tracewell-shop"] = shop("tracewell-shop", "tracewell", 14, 5);
MAPS["tracewell-gym"] = gymHall("tracewell-gym", "tracewell", 5, 15, "gym7-leader", "gym7-enter");

MAPS["kludge-vat"] = {
	id: "kludge-vat",
	name: "The Kludge vat",
	music: "gym",
	indoor: true,
	tiles: [
		"############",
		"#B________B#",
		"#__________#",
		"#B__BBBB__B#",
		"#___BBBB___#",
		"#__________#",
		"#________s_#",
		"#__________#",
		"#####mm#####",
		"############"
	],
	warps: [
		{ x: 5, y: 8, toMap: "tracewell", toX: 15, toY: 10, kind: "door", dir: "down" },
		{ x: 6, y: 8, toMap: "tracewell", toX: 15, toY: 10, kind: "door", dir: "down" }
	],
	npcs: [
		{
			id: "kv-boss",
			sprite: "grunt",
			x: 5,
			y: 5,
			dir: "down",
			move: "static",
			script: "kludge-boss",
			when: { notFlag: "won.nullfight" }
		},
		{
			id: "kv-boss-beaten",
			sprite: "grunt",
			x: 2,
			y: 6,
			dir: "down",
			move: "static",
			dialogue: "kv-beaten",
			when: { flag: "won.nullfight" }
		}
	],
	signs: [{ x: 9, y: 6, text: ["A vat of glowing patches.", "None of them addressed the root cause."] }]
};

MAPS["route-08"] = {
	id: "route-08",
	name: "Route 8",
	music: "route",
	tiles: [
		"tttttttttt,,tttttttt",
		"t.........,,.......t",
		"t.::......,,....::.t",
		"t.::..gg..,,....::.t",
		"t.....gg..,,..gg...t",
		"t..s......,,..gg...t",
		"t.........,,.......t",
		"t.LLLLLLLL,,LLLLLLLt",
		"t.........,,.......t",
		"t..gg.....,,....gg.t",
		"t..gg.....,,....gg.t",
		"t.........,,.......t",
		"t..::.....,,....::.t",
		"t..::..f..,,....::.t",
		"t.........,,.......t",
		"t....gg...,,..gg...t",
		"t....gg...,,..gg...t",
		"t.........,,.......t",
		"t.........,,.......t",
		"t.........,,.......t",
		"t.........,,.......t",
		"t.........,,.......t",
		"t.........,,.......t",
		"t.........,,.......t",
		"tttttttttt,,tttttttt"
	],
	warps: [
		{ x: 10, y: 24, toMap: "tracewell", toX: 10, toY: 1, kind: "edge", dir: "down" },
		{ x: 11, y: 24, toMap: "tracewell", toX: 11, toY: 1, kind: "edge", dir: "down" },
		{ x: 10, y: 0, toMap: "bigo-city", toX: 10, toY: 18, kind: "edge", dir: "up" },
		{ x: 11, y: 0, toMap: "bigo-city", toX: 11, toY: 18, kind: "edge", dir: "up" }
	],
	npcs: [
		{ id: "r8-villager", sprite: "villager", x: 14, y: 16, dir: "down", move: "wander", dialogue: "r8-villager" }
	],
	signs: [{ x: 3, y: 5, text: ["ROUTE 8", "Big-O City ahead. Time is money; space is also money."] }],
	triggers: [{ x: 10, y: 9, w: 2, h: 1, script: "rival3-scene", onceFlag: "seen.rival3" }],
	encounters: {
		rate: 0.17,
		species: [
			["bigosaur", 5],
			["lambdrake", 4],
			["tracehound", 2]
		]
	}
};

MAPS["bigo-city"] = {
	id: "bigo-city",
	name: "Big-O City",
	music: "town",
	tiles: [
		"tttttttttt,,tttttttt",
		"t::::::::::,,::::::t",
		"t:IIII:IIII,,IIII::t",
		"t:HHHH:HHHH,,HHHH::t",
		"t:#WdW:#WdW,,#WdW::t",
		"t::::::::::,,::::::t",
		"t::s:::::::,,::::::t",
		"t::::::::::,,::::::t",
		"t:IIII:::::,,:IIII:t",
		"t:HHHH:::::,,:HHHH:t",
		"t:#WdW:::::,,:#WdW:t",
		"t::::::::::,,::::::t",
		"t::IIIIII::,,::f:::t",
		"t::HHHHHH::,,::::::t",
		"t::#WdW##G:,,::::::t",
		"t::::::::::,,::::::t",
		"t::::::::::,,::::::t",
		"t::::::::::,,::::::t",
		"t::::::::::,,::::::t",
		"tttttttttt,,tttttttt"
	],
	warps: [
		{ x: 10, y: 19, toMap: "route-08", toX: 10, toY: 1, kind: "edge", dir: "down" },
		{ x: 11, y: 19, toMap: "route-08", toX: 11, toY: 1, kind: "edge", dir: "down" },
		{ x: 10, y: 0, toMap: "victory-route", toX: 10, toY: 20, kind: "edge", dir: "up" },
		{ x: 11, y: 0, toMap: "victory-route", toX: 11, toY: 20, kind: "edge", dir: "up" },
		{ x: 4, y: 4, toMap: "bigo-repair", toX: 4, toY: 5, kind: "door", dir: "up" },
		{ x: 9, y: 4, toMap: "bigo-shop", toX: 4, toY: 5, kind: "door", dir: "up" },
		{ x: 15, y: 4, toMap: "bigo-house", toX: 4, toY: 6, kind: "door", dir: "up" },
		{ x: 4, y: 10, toMap: "bigo-house2", toX: 4, toY: 6, kind: "door", dir: "up" },
		{ x: 16, y: 10, toMap: "bigo-house3", toX: 4, toY: 6, kind: "door", dir: "up" },
		{ x: 5, y: 14, toMap: "bigo-gym", toX: 5, toY: 9, kind: "door", dir: "up" }
	],
	npcs: [
		{ id: "bo-villager", sprite: "villager2", x: 7, y: 6, dir: "down", move: "wander", dialogue: "bo-villager" },
		{ id: "bo-clerk", sprite: "clerk", x: 15, y: 16, dir: "left", move: "spin", dialogue: "bo-clerk" },
		{
			id: "bo-guard",
			sprite: "villager",
			x: 10,
			y: 1,
			dir: "down",
			move: "static",
			dialogue: "bo-guard",
			when: { maxBadges: 7 }
		}
	],
	signs: [{ x: 3, y: 6, text: ["BIG-O CITY", "Population: n. Growth: n log n. Rent: n squared."] }]
};

MAPS["bigo-repair"] = repairCentre("bigo-repair", "bigo-city", 4, 5);
MAPS["bigo-shop"] = shop("bigo-shop", "bigo-city", 9, 5);
function cityHouse(id: string, npcDialogue: string, sign: string[]): GameMap {
	return {
		id,
		name: "A city flat",
		music: "town",
		indoor: true,
		tiles: [
			"##########",
			"#+____T__#",
			"#________#",
			"#__TT____#",
			"#________#",
			"#________#",
			"#________#",
			"####mm####",
			"##########"
		],
		warps: [
			{ x: 4, y: 7, toMap: "bigo-city", toX: id === "bigo-house" ? 15 : id === "bigo-house2" ? 4 : 16, toY: id === "bigo-house" ? 5 : 11, kind: "door", dir: "down" },
			{ x: 5, y: 7, toMap: "bigo-city", toX: id === "bigo-house" ? 15 : id === "bigo-house2" ? 4 : 16, toY: id === "bigo-house" ? 5 : 11, kind: "door", dir: "down" }
		],
		npcs: [{ id: id + "-npc", sprite: "villager", x: 6, y: 3, dir: "down", move: "static", dialogue: npcDialogue }],
		signs: [{ x: 1, y: 1, text: sign }]
	};
}
MAPS["bigo-house"] = cityHouse("bigo-house", "bo-house1", ["A whiteboard covered in arrows.", "All of them point at a bin labelled 'rewrite'."]);
MAPS["bigo-house2"] = cityHouse("bigo-house2", "bo-house2", ["A trophy: 'FASTEST LOOP, 2019'.", "It's a very small trophy."]);
MAPS["bigo-house3"] = cityHouse("bigo-house3", "bo-house3", ["A wall planner with one entry, repeated:", "'optimise'."]);
MAPS["bigo-gym"] = gymHall("bigo-gym", "bigo-city", 5, 15, "gym8-leader", "gym8-enter");

MAPS["victory-route"] = {
	id: "victory-route",
	name: "Victory route",
	music: "peak",
	tiles: [
		"tttttttttt,,tttttttt",
		"t^^.......,,......^t",
		"t^^..%....,,...%..^t",
		"t.........,,......^t",
		"t...^^....,,..^^..^t",
		"t...^^....,,..^^..^t",
		"t.........,,......^t",
		"t.LLLLLLLL,,LLLLLLLt",
		"t.........,,.......t",
		"t..%......,,....%..t",
		"t.........,,.......t",
		"t..^^.....,,..^^...t",
		"t..^^..s..,,..^^...t",
		"t.........,,.......t",
		"t....%....,,...%...t",
		"t.........,,.......t",
		"t^^.......,,......^t",
		"t^^.......,,......^t",
		"t.........,,.......t",
		"t.........,,.......t",
		"t.........,,.......t",
		"tttttttttt,,tttttttt"
	],
	warps: [
		{ x: 10, y: 21, toMap: "bigo-city", toX: 10, toY: 1, kind: "edge", dir: "down" },
		{ x: 11, y: 21, toMap: "bigo-city", toX: 11, toY: 1, kind: "edge", dir: "down" },
		{ x: 10, y: 0, toMap: "kernel-peak", toX: 10, toY: 26, kind: "edge", dir: "up" },
		{ x: 11, y: 0, toMap: "kernel-peak", toX: 11, toY: 26, kind: "edge", dir: "up" }
	],
	npcs: [],
	signs: [{ x: 7, y: 12, text: ["VICTORY ROUTE", "Beyond: the Kernel Council. Save your game. Seriously."] }],
	encounters: {
		rate: 0.14,
		species: [
			["bigosaur", 4],
			["lambdrake", 4],
			["breakpointer", 3]
		]
	}
};

MAPS["kernel-peak"] = {
	id: "kernel-peak",
	name: "Kernel Peak",
	music: "peak",
	tiles: [
		"tttttttttt,,tttttttt",
		"t%%%%%%%%%,,%%%%%%%t",
		"t%*******%,,%*****%t",
		"t%%%%%%%%%,,%%%%%%%t",
		"t.........,,.......t",
		"t%%%%%%%%%,,%%%%%%%t",
		"t%*******%,,%*****%t",
		"t%%%%%%%%%,,%%%%%%%t",
		"t.........,,.......t",
		"t%%%%%%%%%,,%%%%%%%t",
		"t%*******%,,%*****%t",
		"t%%%%%%%%%,,%%%%%%%t",
		"t.........,,.......t",
		"t%%%%%%%%%,,%%%%%%%t",
		"t%*******%,,%*****%t",
		"t%%%%%%%%%,,%%%%%%%t",
		"t.........,,.......t",
		"t%%%%%%%%%,,%%%%%%%t",
		"t%*******%,,%*****%t",
		"t%%%%%%%%%,,%%%%%%%t",
		"t.........,,.......t",
		"t.........,,.......t",
		"t.........,,.......t",
		"t.........,,.......t",
		"t.........,,.......t",
		"t.........,,.......t",
		"tttttttttt,,tttttttt"
	],
	warps: [
		{ x: 10, y: 26, toMap: "victory-route", toX: 10, toY: 1, kind: "edge", dir: "down" },
		{ x: 11, y: 26, toMap: "victory-route", toX: 11, toY: 1, kind: "edge", dir: "down" }
	],
	npcs: [
		{ id: "kp-c1", sprite: "council", x: 10, y: 20, dir: "down", move: "static", script: "council1-scene", when: { notFlag: "won.council1" } },
		{ id: "kp-c1b", sprite: "council", x: 8, y: 20, dir: "right", move: "static", dialogue: "kp-c1-after", when: { flag: "won.council1" } },
		{ id: "kp-c2", sprite: "council", x: 11, y: 16, dir: "down", move: "static", script: "council2-scene", when: { notFlag: "won.council2" } },
		{ id: "kp-c2b", sprite: "council", x: 13, y: 16, dir: "left", move: "static", dialogue: "kp-c2-after", when: { flag: "won.council2" } },
		{ id: "kp-c3", sprite: "council", x: 10, y: 12, dir: "down", move: "static", script: "council3-scene", when: { notFlag: "won.council3" } },
		{ id: "kp-c3b", sprite: "council", x: 8, y: 12, dir: "right", move: "static", dialogue: "kp-c3-after", when: { flag: "won.council3" } },
		{ id: "kp-c4", sprite: "council", x: 11, y: 8, dir: "down", move: "static", script: "council4-scene", when: { notFlag: "won.council4" } },
		{ id: "kp-c4b", sprite: "council", x: 13, y: 8, dir: "left", move: "static", dialogue: "kp-c4-after", when: { flag: "won.council4" } },
		{ id: "kp-chad", sprite: "chad", x: 10, y: 4, dir: "down", move: "static", script: "champion-scene", when: { notFlag: "won.champion" } },
		{ id: "kp-chad-after", sprite: "chad", x: 11, y: 4, dir: "down", move: "static", script: "champion-after", when: { flag: "won.champion" } },
		{ id: "kp-ada", sprite: "ada", x: 10, y: 2, dir: "down", move: "static", script: "mainframe-scene", when: { flag: "won.champion" } }
	],
	signs: []
};
