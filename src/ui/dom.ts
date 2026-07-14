// Tiny DOM helpers for the UI layers that sit above the world canvas.

export function el<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	className = "",
	parent: HTMLElement | null = null,
	text = ""
): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text) node.textContent = text;
	if (parent) parent.appendChild(node);
	return node;
}

export function clear(node: HTMLElement): void {
	while (node.firstChild) node.removeChild(node.firstChild);
}

let uiRoot: HTMLElement | null = null;
let fxRoot: HTMLElement | null = null;

export function mountLayers(stage: HTMLElement): { ui: HTMLElement; fx: HTMLElement } {
	uiRoot = el("div", "layer", stage);
	uiRoot.id = "ui";
	fxRoot = el("div", "layer", stage);
	fxRoot.id = "fx";
	return { ui: uiRoot, fx: fxRoot };
}

export function ui(): HTMLElement {
	return uiRoot!;
}

export function fx(): HTMLElement {
	return fxRoot!;
}
