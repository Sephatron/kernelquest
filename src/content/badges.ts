// The eight badges, in story order, with the concept each one certifies.

export interface BadgeDef {
	id: string;
	name: string;
	town: string;
	concept: string;
	leader: string;
}

export const BADGES: Record<string, BadgeDef> = {
	order: { id: "order", name: "ORDER BADGE", town: "Stepwick", concept: "Sequencing", leader: "Marshal Index" },
	loop: { id: "loop", name: "LOOP BADGE", town: "Loophollow", concept: "Loops", leader: "Vectora" },
	fork: { id: "fork", name: "FORK BADGE", town: "Forkbridge", concept: "Conditionals", leader: "Old Else" },
	cache: { id: "cache", name: "CACHE BADGE", town: "Cacheford", concept: "Variables & state", leader: "Registra" },
	call: { id: "call", name: "CALL BADGE", town: "Routine Row", concept: "Functions", leader: "Sub" },
	module: { id: "module", name: "MODULE BADGE", town: "Modula Heights", concept: "Decomposition", leader: "Archie Tecture" },
	trace: { id: "trace", name: "TRACE BADGE", town: "Tracewell", concept: "Debugging", leader: "Bisector" },
	bigo: { id: "bigo", name: "BIG-O BADGE", town: "Big-O City", concept: "Efficiency", leader: "Ada Mant" }
};

export const BADGE_ORDER = ["order", "loop", "fork", "cache", "call", "module", "trace", "bigo"];
