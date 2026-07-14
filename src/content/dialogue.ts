// All simple NPC dialogue. One entry per id; each string is one page.
// Scripts (scripts.ts) handle anything with branching, gifts or battles.

export const DIALOGUE: Record<string, string[]> = {
	// --- Boot Village ---
	"bv-villager": [
		"Morning! Lovely day for a walk.",
		"A walk is just a loop over steps, if you think about it. I try not to."
	],
	"bv-kid": ["The pond crashed once.", "They turned it off and on again. Classic."],
	mum: [
		"Off to see Prof Ada? Take your coat.",
		"And remember: every big problem is just small problems in a trench coat."
	],
	"nb-oldman": [
		"I've watched this screensaver for nine years.",
		"The pipes never connect. It teaches patience. Or despair. One of those."
	],
	"r1-kid": [
		"Wild glitchmites hide in the tall grass.",
		"They pop out and ask you things. Rude, honestly."
	],

	// --- Stepwick ---
	"sw-villager": [
		"Welcome to Stepwick! Marshal Index runs the gym.",
		"She alphabetises her spice rack. And her enemies."
	],
	"sw-oldman": [
		"In my day we didn't have blocks. We flipped switches.",
		"Uphill. Both directions. In the rain."
	],

	// --- Route 2 / Loophollow ---
	"r2-guard": [
		"Heading north to Loophollow? Bold, with no badge on you.",
		"The glitchmites up there won't wait for you to catch up. Beat Marshal Index first — trust me."
	],
	"r2-kid": ["I counted the trees on this route.", "Then I lost count and started a REPEAT in my head."],
	"lh-villager": [
		"Loophollow! We do everything twice here.",
		"We do everything twice here."
	],
	"lh-kid": ["Vectora made a program with one ZAP and a loop.", "It went on for ages. The bug never stood a chance."],
	"lh-guard": [
		"Forkbridge is north, but the wilds there branch mean and fast.",
		"Vectora's gym is right here. Earn your loops before you go — no excuses, only iterations."
	],

	// --- Route 3 / Forkbridge ---
	"r3-villager": ["Careful crossing the bridges.", "Take the wrong one and... well, there's always an ELSE branch."],
	"fb-villager": [
		"Old Else runs the gym. Ancient. Contrary.",
		"Ask him a yes/no question and he'll answer 'it depends'. Correctly."
	],
	"fb-oldman": ["Two bridges. I've crossed the left one 400 times.", "Never the right. I don't know what's over there. I'm at peace with it."],
	"fb-guard": [
		"Cacheford's north of here, and its glitchmites hoard nasty tricks.",
		"Learn to branch with Old Else first, traveller. The river insists."
	],

	// --- Route 4 / Cacheford ---
	"r4-kid": ["I keep a number in my pocket.", "It's a 7. It's been a 7 all day. That's what state means, I think."],
	"cf-villager": [
		"Cacheford remembers everything. Every value. Forever.",
		"It's why the rent is so high. Storage isn't free."
	],
	"cf-oldman": ["Registra's armour shrugs off small hits.", "You have to save up a big one. Store the power. THEN spend it."],
	"cf-guard": ["Routine Row's up north — sharp crowd, sharper glitchmites.", "Prove you can hold a value in your head with Registra first. Then go show them."],

	// --- Route 5 / Routine Row ---
	"r5-villager": ["Every house on the Row is identical inside.", "Built once, stamped out a hundred times. Very efficient. Slightly eerie."],
	"rr-villager": [
		"Welcome to Routine Row! Define once, use everywhere.",
		"I named my morning: WAKE, COFFEE, PANIC. Now I just DO MORNING."
	],
	"rr-kid": ["Sub gave a combo a NAME.", "Then used the name five times. Five! With one block each!"],
	"rr-guard": ["Modula Heights is up north — everything there's built in big, daunting pieces.", "Learn to name your routines with Sub first. It'll make the Heights make sense."],

	// --- Route 6 / Modula Heights ---
	"r6-oldman": ["The Heights were built from prefab views.", "Big thing, made of small things you'd already built. That's the trick up there."],
	"mh-villager": [
		"Archie Tecture designed this whole town.",
		"Well — he designed one house, then reused it. Don't tell the tourists."
	],
	"mh-guard": ["Tracewell's north — half its programs are broken on purpose.", "Learn to decompose with Archie first, or you'll drown up there. His whole religion, that."],

	// --- Route 7 / Tracewell ---
	"r7-grunt": [
		"Heh. The Kludge Collective doesn't fix bugs.",
		"We paste over them. Faster. Who cares what's underneath?"
	],
	"r7-grunt2": ["Boss NULL is our masterpiece.", "Held together entirely by patches. It's beautiful. It's screaming."],
	"tw-villager": [
		"Tracewell's water always leads somewhere.",
		"Follow a bug upstream. The source is never where the splash was."
	],
	"tw-grunt": [
		"The Collective's hideout is right there.",
		"You won't go in. You're not the type. ...you're going in, aren't you."
	],
	"tw-guard": ["Big-O City's the last stop before the Peak — and it does not tolerate waste.", "Learn to READ a broken program with Bisector before you go. Painfully, but you'll thank him."],
	"kv-beaten": [
		"The vat's gone quiet. The patches stopped glowing.",
		"Turns out 'fix the root cause' works. Who knew. (We knew. We were just lazy.)"
	],

	// --- Route 8 / Big-O City ---
	"r8-villager": ["Big-O City never sleeps. It just gets slower under load.", "Rent scales quadratically. Nobody can afford to invite friends over."],
	"bo-villager": [
		"Ada Mant runs the last gym. She times everything.",
		"She once described a sunset as 'O(1), thankfully'."
	],
	"bo-clerk": ["Fewer steps, same answer. That's the whole city motto.", "Also our transit system. It has one stop. It's very fast."],
	"bo-guard": ["Victory Route's just north. Then the Peak. Then the Mainframe.", "Get the Big-O badge from Ada Mant first, though. You'll want every trick you've got. No pressure. Actually — total pressure."],
	"bo-house1": ["A whiteboard covered in arrows.", "Every arrow points at a bin labelled 'rewrite'. Some habits die hard."],
	"bo-house2": ["A tiny trophy: FASTEST LOOP, 2019.", "'It was nested,' the owner admits. 'I'm not proud. I'm fast, but not proud.'"],
	"bo-house3": ["A wall planner with a single repeating entry:", "'optimise'. Every day. For a year. The handwriting gets shakier."],

	// --- Kernel Peak (post-fight council lines) ---
	"kp-c1-after": ["SEQUENZA: Order holds. Pass, sequencer."],
	"kp-c2-after": ["ACCUMULA: You kept your nerve and your number. Pass."],
	"kp-c3-after": ["GATEKEEPER: Correct branch, every time. The gate is yours."],
	"kp-c4-after": ["COMPOSITA: Beautifully decomposed. The summit is ahead. Go."]
};
