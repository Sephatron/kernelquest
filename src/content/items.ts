// Item definitions. Deliberately few — each one earns its slot.

export interface ItemDef {
	id: string;
	name: string;
	price: number;
	blurb: string;
}

export const ITEMS: Record<string, ItemDef> = {
	patch: {
		id: "patch",
		name: "PATCH",
		price: 6,
		blurb: "Restores 5 integrity. A bandage with release notes."
	},
	duck: {
		id: "duck",
		name: "RUBBER DUCK",
		price: 8,
		blurb: "Explain the puzzle to the duck: removes one wrong answer."
	},
	breakpoint: {
		id: "breakpoint",
		name: "BREAKPOINT",
		price: 10,
		blurb: "In a gym battle: shows a turn-by-turn preview of your last run."
	},
	silencer: {
		id: "silencer",
		name: "SILENCER",
		price: 12,
		blurb: "Mutes wild glitchmites for 40 steps. Blessed quiet."
	}
};

export const SHOP_STOCK = ["patch", "duck", "breakpoint", "silencer"];
