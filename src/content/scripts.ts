// Cutscene and interaction scripts, referenced by id from maps and NPCs.
// Gym leaders follow one shape: if already beaten, a short post-win line;
// otherwise intro → gymBattle → (won? badge + hint : retry line). Gym-entry
// triggers grant the concept block the leader fight will demand.

import { act } from "../battle/vm";
import type { Cmd } from "../game/script";

// A gym leader interaction: `pre` before the fight, `win` after victory,
// `hint` on where to go next, plus the badge id and the battle id.
function gymLeader(
	battleId: string,
	badgeId: string,
	pre: string[],
	win: string[],
	hint: string[],
	retry: string[]
): Cmd[] {
	return [
		{
			ifFlag: {
				flag: "won." + battleId,
				then: [{ say: hint }],
				els: [
					{ say: pre },
					{ gymBattle: battleId },
					{
						ifFlag: {
							flag: "won." + battleId,
							then: [{ say: win }, { badge: badgeId }, { say: hint }],
							els: [{ say: retry }]
						}
					}
				]
			}
		}
	];
}

// A gym-entry plaque plus the concept unlock the gym teaches. This fires from
// the entry trigger the moment you walk in (see Game.doWarp, which runs
// arrival triggers) — BEFORE the aide or the leader, both of which need the
// new block. The unlock flag persists, so re-entering (onceFlag) is fine.
function gymEntry(text: string[], unlock?: { flag: string; toast: string }): Cmd[] {
	const cmds: Cmd[] = [{ say: text }];
	if (unlock) cmds.push({ unlock });
	return cmds;
}

// A rival encounter that plays once regardless of outcome.
function rivalScene(battleId: string, approach: string[], pre: string[]): Cmd[] {
	return [
		{ face: { who: "player", dir: "up" } },
		{ say: approach },
		{ say: pre },
		{ trainerBattle: battleId },
		{
			ifFlag: {
				flag: "won." + battleId,
				then: [{ say: winLine(battleId) }],
				els: [{ say: ["CHAD: HA! Even my spaghetti beats your... whatever that was. Later, nerd."] }]
			}
		}
	];
}

function winLine(battleId: string): string[] {
	return { rival1: RIVAL1_WIN, rival2: RIVAL2_WIN, rival3: RIVAL3_WIN }[battleId] ?? ["..."];
}

const RIVAL1_WIN = ["CHAD: ...I'm adding a SEVENTH zap. That'll show you. See you up north, loser."];
const RIVAL2_WIN = ["CHAD: Loops are cheating. That's just... using less. Where's the pride in LESS?"];
const RIVAL3_WIN = ["CHAD: FINE. Kernel Peak. You and me. Bring everything. I'll bring... more of the same, probably."];

export const SCRIPTS: Record<string, Cmd[]> = {
	// -------------------------------------------------------------- intro
	"intro-lab": [
		{ face: { who: "ada", dir: "down" } },
		{
			say: [
				"ADA: Ah! A visitor. Or a burglar with excellent posture.",
				"Welcome to my lab. I study the routines that kept Kernelia running — before the Crash, anyway."
			]
		},
		{ say: ["ADA: You must be the new debugger. What's your name?"] },
		{ nameEntry: true },
		{ say: ["ADA: Splendid. Now — every debugger needs a companion bot. Pick one."] },
		{ starterChoice: true },
		{
			say: [
				"ADA: Marvellous choice. Your bot runs on programs. Little lists of steps. That's all a program is, whatever anyone tells you.",
				"Out in the tall grass you'll meet glitchmites — wild scraps of broken code. They pop out and test your thinking.",
				"Reason it out and they pop. Guess wildly and they bite. Either way you learn, but one of them stings less."
			]
		},
		{
			say: [
				"ADA: Head north to Stepwick and challenge Marshal Index for your first badge.",
				"Eight badges, then Kernel Peak, then you fix the Mainframe. Simple. Well. 'Simple'.",
				"Oh — my former student Chad is out there too. If he tells you to 'just copy-paste it'... don't."
			]
		},
		{ give: { item: "patch", count: 3 } },
		{ sfx: "confirm" },
		{ toast: "Got 3 PATCHES!" },
		{ flag: ["intro.starter", true] },
		{ setRespawn: true }
	],
	"ada-talk": [
		{
			ifFlag: {
				flag: "intro.starter",
				then: [
					{
						say: [
							"ADA: Stuck? Programs are steps. Bugs are steps in the wrong order. Badges are proof you noticed.",
							"The RUBBER DUCK in any shop is the finest debugging tool ever made. I will not be taking questions."
						]
					}
				],
				els: [{ run: "intro-lab" }]
			}
		}
	],
	"block-route1": [
		{ say: ["A firm thought arrives, wearing a lab coat:", "'Visit PROF ADA before wandering off.' The lab is the big building south of here."] },
		{ walk: { who: "player", steps: ["down"] } }
	],

	// ------------------------------------------------------- town services
	"repair-heal": [
		{ say: ["TECH: Welcome to the Repair Centre. Shall I patch up your bot?"] },
		{
			choice: {
				options: ["Yes please", "Not now"],
				branches: [
					[
						{ sfx: "heal" },
						{ heal: true },
						{ setRespawn: true },
						{ wait: 24 },
						{ say: ["TECH: Good as new. Do try to keep the magic smoke on the inside."] }
					],
					[{ say: ["TECH: Sensible. Preventative maintenance is a myth anyway."] }]
				]
			}
		}
	],
	"shop-open": [{ say: ["CLERK: Welcome in! Take a look."] }, { shop: true }],
	"rr-gifter": [
		{
			ifFlag: {
				flag: "got.routine-guard",
				then: [{ say: ["NEIGHBOUR: Use GUARD-ZAP well. Name good things and you can call them forever."] }],
				els: [
					{
						say: [
							"NEIGHBOUR: New to the Row? Here's a housewarming gift.",
							"I've written you a routine: GUARD, then ZAP. I call it GUARD-ZAP. Original, I know."
						]
					},
					{
						give: {
							routine: {
								name: "GUARDZAP",
								blocks: [act("GUARD"), act("ZAP")],
								source: "gift · Routine Row",
								note: "A neighbour's housewarming combo. Block, then hit."
							}
						}
					},
					{ flag: ["got.routine-guard", true] },
					{ say: ["NEIGHBOUR: Once you've earned the Call badge you can DO GUARDZAP in any battle. One slot, two steps."] }
				]
			}
		}
	],

	// ------------------------------------------------------------- gym 1
	"gym1-enter": gymEntry([
		"A plaque by the door:",
		"'STEPWICK GYM. Discipline: SEQUENCING. The right steps, in the right order, and nothing else.'"
	]),
	"gym1-t1": [
		{
			ifFlag: {
				flag: "won.gym1-t1",
				then: [{ say: ["AIDE: The Marshal reorganised my sock drawer by RGB value. I can't stop her. You could, though."] }],
				els: [
					{ say: ["AIDE: Before the Marshal, you face me. House rules — order matters here.", "My CRASHKET has a two-step pattern. Watch it. Then beat it."] },
					{ trainerBattle: "gym1-t1" }
				]
			}
		}
	],
	"gym1-leader": gymLeader(
		"gym1",
		"order",
		[
			"INDEX: I am MARSHAL INDEX. I alphabetise my spice rack, my bookcase, and my regrets.",
			"Your bot does exactly what you tell it, in exactly the order you say it. That is its whole personality.",
			"Show me you can command a sequence — or be filed under F, for Failed."
		],
		[
			"INDEX: Filed under P. For Passed.",
			"Order isn't pedantry — it's the difference between 'dress, then leave' and 'leave, then dress'."
		],
		[
			"INDEX: Take the ORDER BADGE. Loophollow is north, past Route 2.",
			"And with a badge on your jacket, your legs work harder — hold B to RUN."
		],
		["INDEX: Regroup, re-read the pattern, return. It isn't going anywhere. Neither am I."]
	),

	// ------------------------------------------------------------- rival 1
	"rival1-scene": rivalScene(
		"rival1",
		["A blur in a backwards cap skids to a halt in front of you.", "CHAD: Well well. Ada's new pet debugger."],
		["CHAD: My bot's got SIX zaps. Count 'em. SIX. More zaps = more better. It's just maths.", "Let's go!"]
	),

	// ------------------------------------------------------------- gym 2
	"gym2-enter": gymEntry(
		["A plaque, printed twice by mistake:", "'LOOPHOLLOW GYM. Discipline: LOOPS. Why say a thing many times when you can say it once, many times?'"],
		{ flag: "unlock.repeat", toast: "New block unlocked: REPEAT! Wrap steps to run them N times." }
	),
	"gym2-t1": [
		{
			ifFlag: {
				flag: "won.gym2-t1",
				then: [{ say: ["APPRENTICE: Loops, eh? I used to fear them. Now I fear nothing. Well. Recursion. But not loops."] }],
				els: [
					{ say: ["APPRENTICE: Twelve HP. Three slots. You do the maths — actually, don't. Let REPEAT do it."] },
					{ trainerBattle: "gym2-t1" }
				]
			}
		}
	],
	"gym2-leader": gymLeader(
		"gym2",
		"loop",
		[
			"VECTORA: I'm VECTORA. I have said 'welcome' 22 times today, using one word and a loop.",
			"My REDUNDA.EXE has 22 HP and your rig holds four slots. Copy-paste cannot save you now.",
			"Wrap your zap. Set the count. Watch leverage happen."
		],
		["VECTORA: Two slots. Infinite zaps. THAT is leverage.", "You didn't work harder. You worked FEWER."],
		["VECTORA: The LOOP BADGE. Forkbridge is north; the river there asks questions.", "Old Else has run that gym since before questions were invented."],
		["VECTORA: The pattern repeats. So can your attempts. Go again."]
	),

	// ------------------------------------------------------------- gym 3
	"gym3-enter": gymEntry(
		["A plaque, hedging its bets:", "'FORKBRIDGE GYM. Discipline: CONDITIONALS. It depends. On what? On IF.'"],
		{ flag: "unlock.if", toast: "New blocks: IF <sense> and PIERCE! React to what the enemy is doing." }
	),
	"gym3-t1": [
		{
			ifFlag: {
				flag: "won.gym3-t1",
				then: [{ say: ["TOLLKEEPER: Read the moment, pay the right toll. You've got it."] }],
				els: [
					{ say: ["TOLLKEEPER: It shields, then it doesn't. A fixed plan pays the wrong toll. IF the shield's up, PIERCE it."] },
					{ trainerBattle: "gym3-t1" }
				]
			}
		}
	],
	"gym3-leader": gymLeader(
		"gym3",
		"fork",
		[
			"OLD ELSE: Young one. You want a badge. IF you're ready. Are you ready? It depends.",
			"DILEMMA.EXE changes with every beat. No recited script survives contact with it.",
			"Ask the moment what it needs. THEN act. Or ELSE."
		],
		["OLD ELSE: IF you understood that — and you did — THEN you passed. No else about it."],
		["OLD ELSE: The FORK BADGE. North to Cacheford, where they never throw a value away.", "Registra hoards numbers like a dragon hoards grudges."],
		["OLD ELSE: Wrong branch. Read it again. The moment is patient. So am I. Mostly."]
	),

	// ------------------------------------------------------------- gym 4
	"gym4-enter": gymEntry(
		["A plaque behind reinforced glass:", "'CACHEFORD GYM. Discipline: VARIABLES & STATE. Keep something. Spend it when it counts.'"],
		{ flag: "unlock.vars", toast: "New blocks: BOOST and IF PWR≥3! Store power, then unleash it." }
	),
	"gym4-leader": gymLeader(
		"gym4",
		"cache",
		[
			"REGISTRA: VAULTRON.EXE wears ARMOR 2. Every hit loses two. A plain zap? It laughs.",
			"You must SAVE UP. Hold a charge across turns. Then spend it all in one devastating moment.",
			"A number, kept in mind, patiently. That is state. Show me you can hold one."
		],
		["REGISTRA: You kept a number in your head and it kept you alive. THAT is state."],
		["REGISTRA: The CACHE BADGE. Routine Row lies north — where they name things and never repeat themselves.", "Sub runs that gym. Ask him to introduce himself. Twice, ironically, he won't."],
		["REGISTRA: Not enough saved. Armor ate it. Store MORE before you spend. Again."]
	),

	// ------------------------------------------------------------- rival 2
	"rival2-scene": rivalScene(
		"rival2",
		["CHAD is here, surrounded by printouts.", "CHAD: I upgraded! MK2 charges up, so I copy-pasted the charge code FIVE times."],
		["CHAD: Five times the charging. That's like... five times the science. Prepare to be out-sciENCED."]
	),

	// ------------------------------------------------------------- gym 5
	"gym5-enter": gymEntry(
		["A plaque, and below it the same plaque, labelled 'see above':", "'ROUTINE ROW GYM. Discipline: FUNCTIONS. Name it once. Call it forever.'"],
		{ flag: "unlock.func", toast: "New powers: DEFINE a routine mid-battle, DO it by name, plus MEND!" }
	),
	"gym5-t1": [
		{
			ifFlag: {
				flag: "won.gym5-t1",
				then: [{ say: ["CLERK: DRY living. Don't Repeat Yourself. Except the good bits. Repeat those."] }],
				els: [
					{ say: ["CLERK: Guard-zap-answer, over and over? NAME it. Then DO the name. Save a routine, spend one slot."] },
					{ trainerBattle: "gym5-t1" }
				]
			}
		}
	],
	"gym5-leader": gymLeader(
		"gym5",
		"call",
		[
			"SUB: I'm Sub. I'm Sub. (One of those was a call.)",
			"TANGLE.EXE needs eighteen steps of answer. Your rig holds six slots. The arithmetic is hostile.",
			"So don't store steps. Store NAMES. DEFINE a routine, then DO it. Six slots, eighteen steps, no contradiction."
		],
		["SUB: You didn't write a longer program. You wrote a better vocabulary. That's the whole job."],
		["SUB: The CALL BADGE. North: Modula Heights, built entirely from things Archie built once.", "Your routines live in the DEX now. Check the START menu — collect the abstractions."],
		["SUB: Ran out of room? You're still storing steps, not names. DEFINE first. Go again."]
	),

	// ------------------------------------------------------------- gym 6
	"gym6-enter": gymEntry([
		"A plaque, assembled from four smaller plaques:",
		"'MODULA HEIGHTS GYM. Discipline: DECOMPOSITION. Don't fight the monolith. Break it into phrases.'"
	]),
	"gym6-leader": gymLeader(
		"gym6",
		"module",
		[
			"ARCHIE: MONOLITH.EXE is twelve beats of wall. Fighting it head-on is how promising debuggers retire.",
			"So don't. Split it into three phrases you can name. Notice one repeats — reuse it.",
			"A big problem is just small problems that haven't been named yet."
		],
		["ARCHIE: Big thing, small pieces, one of them reused. That's architecture, not luck."],
		["ARCHIE: The MODULE BADGE. Tracewell is north — where nothing works and that's the point.", "Bisector will hand you a BROKEN program. Your job won't be writing. It'll be reading."],
		["ARCHIE: Still swinging at the whole wall. Break it up. Name the pieces. Again."]
	),

	// ------------------------------------------------------------- gym 7
	"gym7-enter": gymEntry([
		"A plaque, deliberately hung slightly crooked:",
		"'TRACEWELL GYM. Discipline: DEBUGGING. The program is almost right. Almost is the whole problem.'"
	]),
	"gym7-leader": gymLeader(
		"gym7",
		"trace",
		[
			"BISECTOR: Everyone before you WROTE programs. You'll FIX one.",
			"Here's a program a hopeful student left behind. It almost works. Run it. Watch exactly where it fails.",
			"Then change ONE thing. Run again. Bisect the problem. Don't rewrite — READ."
		],
		["BISECTOR: You didn't panic and retype it all. You found the one wrong block. That restraint IS the skill."],
		["BISECTOR: The TRACE BADGE. Big-O City is the last stop before the Peak.", "Ada Mant times everything up there. Bring your fewest, sharpest steps."],
		["BISECTOR: Still failing — but LOOK where. Same spot? Then that's your bug. Fix that. Only that."]
	),

	// ------------------------------------------------------------- gym 8
	"gym8-enter": gymEntry([
		"A plaque with a stopwatch embedded in it:",
		"'BIG-O CITY GYM. Discipline: EFFICIENCY. Same answer. Fewer steps. Every step is rent.'"
	]),
	"gym8-leader": gymLeader(
		"gym8",
		"bigo",
		[
			"ADA MANT: OMEGA.EXE heals 3 every fourth beat. You have sixteen turns and FOUR slots.",
			"Waste a slot and it out-heals you forever. There's a winning program in there — a lean one.",
			"Everything you've learned, distilled to its shortest honest form. Show me."
		],
		["ADA MANT: Same answer, fewer steps. That is the last lesson, and the first one, and every one between."],
		["ADA MANT: The BIG-O BADGE — your eighth. Victory Route climbs to Kernel Peak.", "Save your game. Heal your bot. The Council of Four waits, and behind them... you already know."],
		["ADA MANT: It out-healed you. Somewhere in your program is a wasted beat. Find it. Cut it. Again."]
	),

	// ------------------------------------------------------- NULL / Kludge
	"kludge-boss": [
		{ face: { who: "kv-boss", dir: "down" } },
		{
			say: [
				"KLUDGE BOSS: Behold NULL — our masterpiece! Every bug in Kernelia, patched over, never fixed!",
				"It shields. It strikes. It is held together by pure denial. Debug it if you dare!"
			]
		},
		{ trainerBattle: "nullfight" },
		{
			ifFlag: {
				flag: "won.nullfight",
				then: [
					{
						say: [
							"KLUDGE BOSS: Nooo! You addressed the ROOT CAUSE! That's — that's cheating!",
							"...fine. Maybe patches aren't a personality. We'll... look into it. Properly this time."
						]
					},
					{ toast: "The Kludge Collective slinks away, muttering about 'tech debt'." },
					{ flag: ["kludge.beaten", true] }
				],
				els: [{ say: ["KLUDGE BOSS: HA! NULL endures! Come back when you can read what you're fighting."] }]
			}
		}
	],

	// --------------------------------------------------------- rival 3
	"rival3-scene": rivalScene(
		"rival3",
		["CHAD blocks the path, MK3 humming ominously.", "CHAD: Armor. A shield. A hammer. I bolted them ALL on. Regret? Only the wiring."],
		["CHAD: This is my final form before my OTHER final form at the Peak. Prepare yourself!"]
	),

	// ------------------------------------------------------- Kernel Peak
	"council1-scene": councilScene("council1", ["SEQUENZA: First seat of the Council. Two blows, one breath. Prove the first lesson lives in you still."]),
	"council2-scene": councilScene("council2", ["ACCUMULA: Second seat. Armor two, patience three. Hold a number and a nerve."]),
	"council3-scene": councilScene("council3", ["GATEKEEPER: Third seat. Mostly wall, occasionally teeth. One good branch beats a thousand plans."]),
	"council4-scene": councilScene("council4", ["COMPOSITA: Fourth seat. Nine beats in three movements. Name them and conduct."]),

	"champion-scene": [
		{ face: { who: "player", dir: "up" } },
		{
			ifFlag: {
				flag: "won.council1",
				then: [
					{
						ifFlag: {
							flag: "won.council2",
							then: [
								{
									ifFlag: {
										flag: "won.council3",
										then: [
											{
												ifFlag: {
													flag: "won.council4",
													then: [
														{
															say: [
																"CHAD: You made it through all four. Of course you did.",
																"I've been up here practising. Watch — I bolted FOUR bots together. CHAD-BOT ULTRA!",
																"No more copy-paste jokes. This is it. Region Champion. Winner keeps the Mainframe. Let's GO."
															]
														},
														{ music: "peak" },
														{ trainerBattle: "champion" },
														{
															ifFlag: {
																flag: "won.champion",
																then: [
																	{
																		say: [
																			"CHAD: ...huh. You beat four bots with, what, eight named steps?",
																			"I had four whole bots. You had... ideas. Better ones.",
																			"Okay. Okay. Teach me the loop thing. Please. I mean it."
																		]
																	},
																	{ toast: "CHAD-BOT ULTRA crashes gracefully. A first." }
																],
																els: [{ say: ["CHAD: HA! Not today! Regroup and try me again — I'm not going anywhere, I live up here now."] }]
															}
														}
													],
													els: [{ say: ["CHAD: Nuh-uh. Beat all four Council seats first. COMPOSITA's still waiting. I'll be here. Stretching."] }]
												}
											}
										],
										els: [{ say: ["CHAD: The GATEKEEPER's still got their seat. No skipping. I would know — I tried."] }]
									}
								}
							],
							els: [{ say: ["CHAD: ACCUMULA's not done with you. Go on. I'll wait. Dramatically."] }]
						}
					}
				],
				els: [{ say: ["CHAD: Whoa there, Champion-in-your-dreams. The Council of Four goes first. SEQUENZA's right down there."] }]
			}
		}
	],
	"champion-after": [{ say: ["CHAD: The whole region's stable because of you. And me. Mostly you. I'm... fine with that. Growth!"] }],

	"mainframe-scene": [
		{ face: { who: "ada", dir: "down" } },
		{
			ifFlag: {
				flag: "kernelia.stable",
				then: [{ say: ["ADA: STABLE BUILD holds. Kernelia hums. Go on — you've earned a lie-down in the tall grass."] }],
				els: [
					{
						say: [
							"ADA: You did it. Eight badges, the Council, the Champion — and NULL, I hear.",
							"The Mainframe's been waiting for someone who thinks in steps instead of panic. Come. One last program."
						]
					},
					{ say: ["ADA: The Core is right here. Everything you learned, all at once now: sequence, loop, branch, state, name, decompose, debug, and do it in as few steps as it takes.", "That's not eight lessons. It's one. Ready?"] },
					{ sfx: "levelup" },
					{ toast: "You reboot the Mainframe of Kernelia." },
					{ wait: 30 },
					{ sfx: "save" },
					{
						say: [
							"The Core spins up. Corruption drains from the tall grass. Glitchmites blink, confused, then wander off to be ordinary bits again.",
							"KERNELIA: STABLE BUILD.",
							"You didn't memorise a language. You learned to think like a program: small steps, in the right order, reused and refined until the impossible fits in a few clean lines."
						]
					},
					{ say: ["ADA: That's the secret nobody tells beginners. It was never about the code.", "It was about you, learning to break the world into steps you could actually take.", "Thank you, debugger. Kernelia will remember. So will you — that's rather the point."] },
					{ flag: ["kernelia.stable", true] },
					{ toast: "★ THE END ★  Thanks for playing Kernel Quest!" },
					{ endGame: true }
				]
			}
		}
	]
};

// A Council seat: fights once, is retryable on loss, flavour line after.
function councilScene(battleId: string, intro: string[]): Cmd[] {
	return [
		{ face: { who: "player", dir: "up" } },
		{
			ifFlag: {
				flag: "won." + battleId,
				then: [{ say: ["The seat's occupant nods you onward."] }],
				els: [
					{ say: intro },
					{ trainerBattle: battleId },
					{
						ifFlag: {
							flag: "won." + battleId,
							then: [{ say: ["A seat of the Council concedes. The way up is a little clearer."] }],
							els: [{ say: ["Not yet. Study the pattern, mend your rig, return. The seat keeps."] }]
						}
					}
				]
			}
		}
	];
}
