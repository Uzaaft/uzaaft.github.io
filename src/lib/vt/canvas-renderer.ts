/**
 * Paints a GridSnapshot onto a 2D canvas.
 *
 * Repaints per row and only when a row is dirty, so an idle terminal costs
 * nothing and a keystroke repaints one line rather than the screen.
 *
 * libghostty reports the terminal's own default colors as white-on-black; the
 * site's palette is supplied by the caller and substituted wherever a cell has
 * no explicit color.
 */

import type { CellRun, GridSnapshot, ImagePlacement, Rgb, TerminalImage } from './terminal';

export interface Theme {
	readonly foreground: string;
	readonly background: string;
}

export interface FontSpec {
	readonly family: string;
	readonly sizePx: number;
	/** Multiplier on font size; 1.6 matches the mockup's line-height. */
	readonly lineHeight: number;
}

export interface CellMetrics {
	readonly width: number;
	readonly height: number;
	readonly baseline: number;
}

const css = (color: Rgb): string => `rgb(${color.r} ${color.g} ${color.b})`;

/**
 * Block and box-drawing glyphs drawn as geometry rather than text.
 *
 * These must tile the cell exactly. Fonts disagree about their metrics — the
 * JetBrains Mono webfont subset omits U+2588 entirely, so it falls back to a
 * glyph only ~14px tall in a 21.6px line and the fastfetch swatches render as a
 * thin stripe. Terminals special-case this range for the same reason.
 *
 * Each entry maps a codepoint to the fraction of the cell to fill:
 * [x, y, width, height], plus an optional alpha for the shade characters.
 */
const BLOCKS: ReadonlyMap<string, readonly [number, number, number, number, number]> = new Map([
	['█', [0, 0, 1, 1, 1]], // full block
	['▀', [0, 0, 1, 0.5, 1]], // upper half
	['▄', [0, 0.5, 1, 0.5, 1]], // lower half
	['▌', [0, 0, 0.5, 1, 1]], // left half
	['▐', [0.5, 0, 0.5, 1, 1]], // right half
	['░', [0, 0, 1, 1, 0.25]], // light shade
	['▒', [0, 0, 1, 1, 0.5]], // medium shade
	['▓', [0, 0, 1, 1, 0.75]] // dark shade
]);

/** Box-drawing lines, as [x, y, w, h] fractions of the cell. */
const LINES: ReadonlyMap<string, readonly [number, number, number, number]> = new Map([
	['─', [0, 0.5, 1, 0]], // horizontal
	['│', [0.5, 0, 0, 1]] // vertical
]);

/**
 * Measure one cell for a monospace font.
 *
 * Uses the advance width of `M` rather than a bounding box so the grid pitch
 * matches what the font actually advances per character.
 */
export function measureCell(ctx: CanvasRenderingContext2D, font: FontSpec): CellMetrics {
	ctx.font = `${font.sizePx}px ${font.family}`;
	const metrics = ctx.measureText('M');
	const height = Math.round(font.sizePx * font.lineHeight);
	return {
		width: metrics.width,
		height,
		// Center the text box within the line box.
		baseline: Math.round((height + font.sizePx * 0.72) / 2)
	};
}

export class CanvasRenderer {
	private metrics: CellMetrics;
	private ratio = 1;
	private hadImages = false;
	private readonly imageCanvases = new WeakMap<TerminalImage, HTMLCanvasElement>();

	constructor(
		private readonly canvas: HTMLCanvasElement,
		private readonly ctx: CanvasRenderingContext2D,
		private font: FontSpec,
		private theme: Theme
	) {
		this.metrics = measureCell(ctx, font);
	}

	get cell(): CellMetrics {
		return this.metrics;
	}

	/**
	 * Size the backing store to the CSS box at the current device pixel ratio,
	 * and report the grid that now fits.
	 */
	resize(cssWidth: number, cssHeight: number): { readonly cols: number; readonly rows: number } {
		this.ratio = window.devicePixelRatio || 1;

		this.canvas.width = Math.max(1, Math.floor(cssWidth * this.ratio));
		this.canvas.height = Math.max(1, Math.floor(cssHeight * this.ratio));
		this.canvas.style.width = `${cssWidth}px`;
		this.canvas.style.height = `${cssHeight}px`;

		this.ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
		this.metrics = measureCell(this.ctx, this.font);

		return {
			cols: Math.max(1, Math.floor(cssWidth / this.metrics.width)),
			rows: Math.max(1, Math.floor(cssHeight / this.metrics.height))
		};
	}

	setTheme(theme: Theme): void {
		this.theme = theme;
	}

	setFont(font: FontSpec): void {
		this.font = font;
		this.metrics = measureCell(this.ctx, font);
	}

	/**
	 * Repaint. Rows are skipped unless dirty, unless `force` is set.
	 *
	 * The native command editor owns the caret; the canvas paints only output.
	 */
	draw(snapshot: GridSnapshot, force = false): void {
		const imageFrame = snapshot.images.length > 0 || this.hadImages;
		this.hadImages = snapshot.images.length > 0;
		if (!force && !imageFrame && snapshot.dirty === 'none') return;

		const full = force || imageFrame || snapshot.dirty === 'full';
		const { width, height } = this.metrics;
		const cssWidth = this.canvas.width / this.ratio;

		if (full) {
			this.ctx.fillStyle = this.theme.background;
			this.ctx.fillRect(0, 0, cssWidth, this.canvas.height / this.ratio);
		}

		this.ctx.textBaseline = 'alphabetic';
		this.ctx.save();
		this.ctx.beginPath();
		this.ctx.rect(0, 0, snapshot.cols * width, snapshot.rows * height);
		this.ctx.clip();
		for (const placement of snapshot.images) {
			if (placement.z < -1073741824) this.drawImage(placement);
		}

		for (const line of snapshot.lines) {
			const needed = full || line.dirty;
			if (!needed) continue;

			const y = line.y * height;

			if (!full) {
				this.ctx.fillStyle = this.theme.background;
				this.ctx.fillRect(0, y, cssWidth, height);
			}

			for (const run of line.runs) {
				const background = run.inverse
					? run.fg === null
						? this.theme.foreground
						: css(run.fg)
					: run.bg === null
						? null
						: css(run.bg);
				if (background !== null) {
					this.ctx.fillStyle = background;
					this.ctx.fillRect(run.x * width, y, run.text.length * width, height);
				}
			}
		}
		for (const placement of snapshot.images) {
			if (placement.z >= -1073741824 && placement.z < 0) this.drawImage(placement);
		}
		for (const line of snapshot.lines) {
			if (!full && !line.dirty) continue;
			for (const run of line.runs) this.drawRun(run, line.y * height, width, height);
		}
		for (const placement of snapshot.images) {
			if (placement.z >= 0) this.drawImage(placement);
		}
		this.ctx.restore();
	}

	private drawImage(placement: ImagePlacement): void {
		const { image } = placement;
		let source = this.imageCanvases.get(image);
		if (!source) {
			source = document.createElement('canvas');
			source.width = image.width;
			source.height = image.height;
			const rgba = new Uint8ClampedArray(image.width * image.height * 4);
			const channels = [3, 4, 0, 2, 1][image.format];
			for (let pixel = 0; pixel < image.width * image.height; pixel++) {
				const from = pixel * channels;
				const to = pixel * 4;
				rgba[to] = image.pixels[from];
				rgba[to + 1] = channels >= 3 ? image.pixels[from + 1] : image.pixels[from];
				rgba[to + 2] = channels >= 3 ? image.pixels[from + 2] : image.pixels[from];
				rgba[to + 3] = channels === 4 || channels === 2 ? image.pixels[from + channels - 1] : 255;
			}
			source.getContext('2d')!.putImageData(new ImageData(rgba, image.width, image.height), 0, 0);
			this.imageCanvases.set(image, source);
		}
		const { width, height } = this.metrics;
		this.ctx.drawImage(
			source,
			placement.sourceX,
			placement.sourceY,
			placement.sourceWidth,
			placement.sourceHeight,
			placement.column * width + Math.min(placement.xOffset, Math.max(0, Math.round(width) - 1)),
			placement.row * height + Math.min(placement.yOffset, Math.max(0, Math.round(height) - 1)),
			placement.width,
			placement.height
		);
	}

	private drawRun(run: CellRun, y: number, cellWidth: number, cellHeight: number): void {
		const x = run.x * cellWidth;

		// `inverse` swaps fg/bg after defaults are resolved, matching SGR 7.
		const resolvedFg = run.fg === null ? this.theme.foreground : css(run.fg);
		const resolvedBg = run.bg === null ? null : css(run.bg);
		const foreground = run.inverse ? (resolvedBg ?? this.theme.background) : resolvedFg;

		const weight = run.bold ? '700' : '400';
		const style = run.italic ? 'italic ' : '';
		this.ctx.font = `${style}${weight} ${this.font.sizePx}px ${this.font.family}`;
		this.ctx.fillStyle = foreground;

		// Draw per cell rather than per run so glyphs stay on the grid pitch even
		// when the font's advance width does not divide evenly.
		const baseline = y + this.metrics.baseline;
		for (let i = 0; i < run.text.length; i++) {
			const char = run.text[i];
			const cellX = x + i * cellWidth;

			const block = BLOCKS.get(char);
			if (block) {
				const [bx, by, bw, bh, alpha] = block;
				const previous = this.ctx.globalAlpha;
				this.ctx.globalAlpha = alpha;
				this.ctx.fillRect(
					cellX + bx * cellWidth,
					y + by * cellHeight,
					bw * cellWidth,
					bh * cellHeight
				);
				this.ctx.globalAlpha = previous;
				continue;
			}

			const rule = LINES.get(char);
			if (rule) {
				const [lx, ly, lw, lh] = rule;
				this.ctx.fillRect(
					cellX + lx * cellWidth,
					Math.round(y + ly * cellHeight),
					lw === 0 ? 1 : lw * cellWidth,
					lh === 0 ? 1 : lh * cellHeight
				);
				continue;
			}

			this.ctx.fillText(char, cellX, baseline);
		}

		if (run.underline) {
			this.ctx.fillRect(x, y + cellHeight - 2, run.text.length * cellWidth, 1);
		}
	}
}
