/** Decorative river, rendered entirely as ASCII on a transparent canvas. */
import type { Swimmer } from './motion';

export interface Ripple {
	x: number;
	y: number;
	age: number;
}

const ellipse = (x: number, y: number, a: number, b: number, rx: number, ry: number) =>
	((x - a) / rx) ** 2 + ((y - b) / ry) ** 2;

export function drawRiver(
	ctx: CanvasRenderingContext2D,
	w: number,
	h: number,
	swimmer: Swimmer,
	ripple: Ripple | null
): void {
	ctx.clearRect(0, 0, w, h);
	if (w <= 0 || h <= 0) return;
	ctx.font = '12px monospace';
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'start';
	for (let row = 0; row < h / 14; row++) {
		for (let col = 0; col < w / 10; col++) {
			if ((col + row * 3) % 17 > 11) continue;
			const x = col * 10;
			const y = row * 14 + Math.sin(x / 100 + row * 0.65 - swimmer.time * 0.15) * 9;
			ctx.globalAlpha = row % 3 === 0 ? 0.4 : 0.19;
			ctx.fillStyle = row % 3 === 0 ? '#81a2be' : '#8abeb7';
			ctx.fillText((col + row) % 7 === 0 ? '~' : '-', x, y);
		}
	}
	ctx.globalAlpha = 1;
	ctx.font = '15px monospace';
	ctx.fillStyle = '#6c7079';
	ctx.fillText('____/____', w - 112, h - 64);
	ctx.globalAlpha = 0.65;
	ctx.fillStyle = '#b5bd68';
	ctx.fillText('\\|/  |/   \\|', w - 126, h - 84);
	ctx.fillText(' |   /     |', w - 126, h - 70);
	ctx.globalAlpha = 1;

	// The animal moves through a fixed character grid; glyphs stay upright.
	const scale = Math.min(1, w / 320);
	const { x: cx, y: cy, phase, heading } = swimmer;
	const cos = Math.cos(heading);
	const sin = Math.sin(heading);
	const cw = 5.5 * scale;
	const ch = 8 * scale;

	function anatomy(x: number, y: number) {
		const tailY = y - Math.sin(phase * 0.5) * Math.max(0, -x - 55) * 0.045;
		const tail = ellipse(x, tailY, -103, 0, 36, 22);
		if (tail < 1) return { part: 'tail', edge: tail };
		if (x > -77 && x < -48 && Math.abs(tailY) < 9) return { part: 'tail', edge: 0.5 };
		const side = y < 0 ? -1 : 1;
		const kick = Math.sin(phase + (side > 0 ? Math.PI : 0));
		if (ellipse(x, y, -40 - kick * 5, side * (33 + kick * 3), 18, 8) < 1) {
			return { part: 'foot', edge: 0.6 };
		}
		const body = ellipse(x, y, -6, 0, 65, 33);
		if (body < 1) return { part: 'fur', edge: body };
		const ear = ellipse(x, y, 53, side * 23, 8, 8);
		if (ear < 1) return { part: 'ear', edge: ear };
		const head = ellipse(x, y, 67, 0, 32, 23);
		if (head < 1) return { part: 'head', edge: head };
		if (ellipse(x, y, 94, 0, 16, 13) < 1) return { part: 'muzzle', edge: 0.6 };
		return null;
	}

	ctx.font = `${9 * scale}px monospace`;
	ctx.textAlign = 'center';
	// A square sampling region preserves the tail and wake through full turns.
	for (let sy = Math.floor((cy - 170 * scale) / ch) * ch; sy < cy + 170 * scale; sy += ch) {
		for (let sx = Math.floor((cx - 170 * scale) / cw) * cw; sx < cx + 170 * scale; sx += cw) {
			const dx = (sx - cx) / scale;
			const dy = (sy - cy) / scale;
			const x = dx * cos + dy * sin;
			const y = -dx * sin + dy * cos;
			const sample = anatomy(x, y);
			if (!sample) {
				const wake = Math.abs(Math.abs(y) - (24 + (80 - x) * 0.14));
				const bow = ellipse(x, y, 71, 0, 48, 34);
				if ((x < 65 && x > -156 && wake < 3) || (x > 72 && bow > 1 && bow < 1.16)) {
					ctx.fillStyle = '#81a2be';
					ctx.globalAlpha = x < -80 ? 0.26 : 0.48;
					ctx.fillText(x > 72 ? ')' : '~', sx, sy);
					ctx.globalAlpha = 1;
				}
				continue;
			}
			const noise =
				(Math.sin(Math.floor(x / 5) * 127.1 + Math.floor(y / 7) * 311.7) * 43758.5453) % 1;
			let glyph: string;
			let color: string;
			if (sample.part === 'tail') {
				glyph = sample.edge > 0.82 ? ':' : (Math.floor(x / 5) + Math.floor(y / 8)) % 2 ? 'X' : '#';
				color = '#8b9096';
			} else if (sample.part === 'foot') {
				glyph = ';';
				color = '#8b9096';
			} else if (sample.part === 'ear') {
				glyph = sample.edge < 0.4 ? 'o' : ':';
				color = '#c5c8c6';
			} else {
				const light = Math.max(0, 1 - sample.edge);
				glyph = '.,:;+tx%#@'[Math.min(9, Math.max(0, Math.floor(light * 7 + Math.abs(noise) * 2)))];
				color = sample.edge > 0.84 ? '#8b9096' : y < -4 ? '#e8eaea' : '#c5c8c6';
				if (sample.part === 'muzzle') {
					glyph = ':';
					color = '#c5c8c6';
				}
				if (x > 76 && x < 85 && Math.abs(Math.abs(y) - 14) < 3) {
					glyph = 'o';
					color = '#e8eaea';
				}
				if (x > 102 && Math.abs(y) < 6) {
					glyph = '@';
					color = '#c5c8c6';
				}
			}
			ctx.fillStyle = color;
			ctx.fillText(glyph, sx, sy);
		}
	}
	for (const side of [-1, 1]) {
		for (let i = 0; i < 3; i++) {
			const x = 96 + i * 4;
			const y = side * (13 + i * 4);
			ctx.fillStyle = '#6c7079';
			ctx.fillText(
				i === 1 ? '-' : side < 0 ? '/' : '\\',
				cx + (x * cos - y * sin) * scale,
				cy + (x * sin + y * cos) * scale
			);
		}
	}
	if (ripple) {
		ctx.fillStyle = '#81a2be';
		ctx.globalAlpha = (1 - ripple.age) * 0.7;
		for (let ring = 0; ring < 3; ring++) {
			for (let angle = 0; angle < Math.PI * 2; angle += 0.22) {
				ctx.fillText(
					'~',
					ripple.x + Math.cos(angle) * (8 + ripple.age * 55 + ring * 13),
					ripple.y + Math.sin(angle) * (4 + ripple.age * 18 + ring * 5)
				);
			}
		}
		ctx.globalAlpha = 1;
	}
}
