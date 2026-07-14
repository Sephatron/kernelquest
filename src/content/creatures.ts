// Wild glitchmite species, three for zone 1 and two per zone thereafter.
// Every sprite is enforced to exist by the tests.

export interface Species {
	id: string;
	name: string;
	sprite: string;
	zone: number; // 1..8 — selects the puzzle pool and difficulty
	dex: string;
	xp: number;
	bits: number;
	dmg: number; // integrity lost on a wrong answer
}

function sp(
	id: string,
	name: string,
	sprite: string,
	zone: number,
	dex: string
): Species {
	return { id, name, sprite, zone, dex, xp: 4 + zone * 2, bits: 2 + zone, dmg: zone <= 3 ? 2 : zone <= 6 ? 3 : 4 };
}

export const SPECIES: Record<string, Species> = {
	bitling: sp("bitling", "BITLING", "mite.bitling", 1,
		"A stray bit that learned to bounce. Flips between 0 and 1 when nervous, which is always."),
	nullmoth: sp("nullmoth", "NULLMOTH", "mite.nullmoth", 1,
		"Drawn to undefined behaviour like a lamp. Vanishes if you look at it directly."),
	loopling: sp("loopling", "LOOPLING", "mite.loopling", 1,
		"A tiny loop that never terminated. It's having a lovely time and cannot be told."),
	dittograf: sp("dittograf", "DITTOGRAF", "mite.dittograf", 2,
		"Copies itself instead of solving anything. Management material."),
	echomite: sp("echomite", "ECHOMITE", "mite.echomite", 2,
		"Repeats everything it hears. Repeats everything it hears."),
	shutterbug: sp("shutterbug", "SHUTTERBUG", "mite.shutterbug", 3,
		"Opens and closes on a whim. Photographs poorly and bites conditionally."),
	maybit: sp("maybit", "MAYBIT", "mite.maybit", 3,
		"Neither true nor false until you check. Then it's annoyed."),
	cachegrub: sp("cachegrub", "CACHEGRUB", "mite.cachegrub", 4,
		"Hoards stale values in its cheeks. Refuses to invalidate."),
	memmoth: sp("memmoth", "MEMMOTH", "mite.memmoth", 4,
		"Enormous, ancient, and full of things nobody freed. A leak with wings."),
	stacklet: sp("stacklet", "STACKLET", "mite.stacklet", 5,
		"Stacks itself on itself calling itself. Knows exactly how it got here, in order."),
	callowtail: sp("callowtail", "CALLOWTAIL", "mite.callowtail", 5,
		"A young routine that calls everyone. Never writes anything down."),
	modulith: sp("modulith", "MODULITH", "mite.modulith", 6,
		"Four tidy compartments and a load-bearing base. Aspires to be a monolith; lacks commitment."),
	fragmite: sp("fragmite", "FRAGMITE", "mite.fragmite", 6,
		"A program that shattered into well-organised pieces. Happier this way."),
	tracehound: sp("tracehound", "TRACEHOUND", "mite.tracehound", 7,
		"Follows execution paths by smell. Points at the exact line, every time."),
	breakpointer: sp("breakpointer", "BREAKPOINTER", "mite.breakpointer", 7,
		"Freezes the moment anyone looks at it. The world's most cooperative witness."),
	bigosaur: sp("bigosaur", "BIGOSAUR", "mite.bigosaur", 8,
		"Grows quadratically with the size of its inputs. Diet: nested loops."),
	lambdrake: sp("lambdrake", "LAMBDRAKE", "mite.lambdrake", 8,
		"An anonymous little dragon. Takes one argument and gives everything.")
};
