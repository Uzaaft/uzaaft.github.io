/**
 * A live libghostty-vt terminal and the grid snapshots a renderer draws from.
 *
 * Callers write bytes and read snapshots; the wasm handles, iterator lifetimes,
 * and scratch allocations stay in here.
 *
 * Two ABI details this module encodes, both of which trap or corrupt if you get
 * them wrong (see example/c-vt-render/src/main.c):
 *
 *  - Iterator constructors take an *allocator*, not the render state. They
 *    produce an unbound iterator that `_get` then binds.
 *  - `_get`/`_row_get` take the *address of* a handle, not the handle. The
 *    opaque slot holding it must outlive every use of the iterator, so slots
 *    are owned for the lifetime of this object rather than scoped per call.
 */

import { err, ok, type Result } from '$lib/prelude';
import { VtModule } from './module';
import { GHOSTTY_SUCCESS, VtCallFailed } from './result';

/* --- render.h enums --- */

const DATA_COLS = 1;
const DATA_ROWS = 2;
const DATA_DIRTY = 3;
const DATA_ROW_ITERATOR = 4;
const DATA_COLOR_BACKGROUND = 5;
const DATA_COLOR_FOREGROUND = 6;
const DATA_CURSOR_VISUAL_STYLE = 10;
const DATA_CURSOR_VISIBLE = 11;
const DATA_CURSOR_VIEWPORT_HAS_VALUE = 14;
const DATA_CURSOR_VIEWPORT_X = 15;
const DATA_CURSOR_VIEWPORT_Y = 16;

const OPTION_DIRTY = 0;

const ROW_DATA_DIRTY = 1;
const ROW_DATA_CELLS = 3;
const ROW_OPTION_DIRTY = 0;

const CELLS_DATA_STYLE = 2;
const CELLS_DATA_BG_COLOR = 5;
const CELLS_DATA_FG_COLOR = 6;
const CELLS_DATA_HAS_STYLING = 8;
const CELLS_DATA_GRAPHEMES_UTF8 = 9;

/** Longest UTF-8 grapheme cluster we read from a single cell. */
const GRAPHEME_CAP = 64;

export type Dirty = 'none' | 'partial' | 'full';

export type CursorShape = 'bar' | 'block' | 'underline' | 'block-hollow';

const CURSOR_SHAPES: readonly CursorShape[] = ['bar', 'block', 'underline', 'block-hollow'];

export interface Rgb {
	readonly r: number;
	readonly g: number;
	readonly b: number;
}

/** A run of adjacent cells sharing every visual attribute. */
export interface CellRun {
	readonly x: number;
	readonly text: string;
	/** `null` means "use the terminal default", per the render.h contract. */
	readonly fg: Rgb | null;
	readonly bg: Rgb | null;
	readonly bold: boolean;
	readonly italic: boolean;
	readonly underline: boolean;
	readonly inverse: boolean;
}

export interface GridRow {
	readonly y: number;
	readonly dirty: boolean;
	readonly runs: readonly CellRun[];
}

export interface Cursor {
	readonly x: number;
	readonly y: number;
	readonly shape: CursorShape;
}

export interface GridSnapshot {
	readonly cols: number;
	readonly rows: number;
	readonly dirty: Dirty;
	readonly foreground: Rgb;
	readonly background: Rgb;
	readonly cursor: Cursor | null;
	readonly lines: readonly GridRow[];
}

interface RunStyle {
	readonly fg: Rgb | null;
	readonly bg: Rgb | null;
	readonly bold: boolean;
	readonly italic: boolean;
	readonly underline: boolean;
	readonly inverse: boolean;
}

const sameStyle = (a: RunStyle, b: RunStyle): boolean =>
	a.bold === b.bold &&
	a.italic === b.italic &&
	a.underline === b.underline &&
	a.inverse === b.inverse &&
	a.fg?.r === b.fg?.r &&
	a.fg?.g === b.fg?.g &&
	a.fg?.b === b.fg?.b &&
	a.bg?.r === b.bg?.r &&
	a.bg?.g === b.bg?.g &&
	a.bg?.b === b.bg?.b;

export class VtTerminal {
	private disposed = false;

	private constructor(
		private readonly vt: VtModule,
		private readonly terminal: number,
		private readonly renderState: number,
		/** Slots must outlive the iterators they hold — see the module doc. */
		private readonly iterSlot: number,
		private readonly cellsSlot: number,
		/** Reused per-frame scratch, so a repaint does not churn the allocator. */
		private readonly scratchPtr: number,
		private readonly scratchSize: number,
		private readonly stylePtr: number,
		private readonly styleSize: number,
		private readonly bufferPtr: number,
		private readonly bufferSize: number,
		private readonly textPtr: number,
		private readonly styleOffsets: {
			readonly size: number;
			readonly bold: number;
			readonly italic: number;
			readonly inverse: number;
			readonly underline: number;
		},
		private readonly bufferOffsets: {
			readonly ptr: number;
			readonly cap: number;
			readonly len: number;
		}
	) {}

	static create(
		vt: VtModule,
		cols: number,
		rows: number
	): Result<VtTerminal, VtCallFailed> {
		const e = vt.exports;

		const termSlot = e.ghostty_wasm_alloc_opaque();
		const termCode = e.ghostty_terminal_new(0, termSlot, cols, rows);
		if (termCode !== GHOSTTY_SUCCESS) {
			e.ghostty_wasm_free_opaque(termSlot);
			return err(new VtCallFailed('ghostty_terminal_new', termCode));
		}
		const terminal = vt.readPointer(termSlot);
		e.ghostty_wasm_free_opaque(termSlot);

		const rsSlot = e.ghostty_wasm_alloc_opaque();
		const rsCode = e.ghostty_render_state_new(0, rsSlot);
		if (rsCode !== GHOSTTY_SUCCESS) {
			e.ghostty_wasm_free_opaque(rsSlot);
			e.ghostty_terminal_free(terminal);
			return err(new VtCallFailed('ghostty_render_state_new', rsCode));
		}
		const renderState = vt.readPointer(rsSlot);
		e.ghostty_wasm_free_opaque(rsSlot);

		const iterSlot = e.ghostty_wasm_alloc_opaque();
		const iterCode = e.ghostty_render_state_row_iterator_new(0, iterSlot);
		if (iterCode !== GHOSTTY_SUCCESS) {
			e.ghostty_wasm_free_opaque(iterSlot);
			e.ghostty_render_state_free(renderState);
			e.ghostty_terminal_free(terminal);
			return err(new VtCallFailed('ghostty_render_state_row_iterator_new', iterCode));
		}

		const cellsSlot = e.ghostty_wasm_alloc_opaque();
		const cellsCode = e.ghostty_render_state_row_cells_new(0, cellsSlot);
		if (cellsCode !== GHOSTTY_SUCCESS) {
			e.ghostty_wasm_free_opaque(cellsSlot);
			e.ghostty_render_state_row_iterator_free(vt.readPointer(iterSlot));
			e.ghostty_wasm_free_opaque(iterSlot);
			e.ghostty_render_state_free(renderState);
			e.ghostty_terminal_free(terminal);
			return err(new VtCallFailed('ghostty_render_state_row_cells_new', cellsCode));
		}

		const styleSize = vt.structSize('GhosttyStyle');
		const bufferSize = vt.structSize('GhosttyBuffer');
		const scratchSize = 8;

		return ok(
			new VtTerminal(
				vt,
				terminal,
				renderState,
				iterSlot,
				cellsSlot,
				e.ghostty_wasm_alloc_u8_array(scratchSize),
				scratchSize,
				e.ghostty_wasm_alloc_u8_array(styleSize),
				styleSize,
				e.ghostty_wasm_alloc_u8_array(bufferSize),
				bufferSize,
				e.ghostty_wasm_alloc_u8_array(GRAPHEME_CAP),
				{
					size: vt.fieldOffset('GhosttyStyle', 'size'),
					bold: vt.fieldOffset('GhosttyStyle', 'bold'),
					italic: vt.fieldOffset('GhosttyStyle', 'italic'),
					inverse: vt.fieldOffset('GhosttyStyle', 'inverse'),
					underline: vt.fieldOffset('GhosttyStyle', 'underline')
				},
				{
					ptr: vt.fieldOffset('GhosttyBuffer', 'ptr'),
					cap: vt.fieldOffset('GhosttyBuffer', 'cap'),
					len: vt.fieldOffset('GhosttyBuffer', 'len')
				}
			)
		);
	}

	/** Feed VT bytes. Sequence processing happens synchronously. */
	write(bytes: Uint8Array): void {
		if (this.disposed || bytes.length === 0) return;
		this.vt.withBytes(bytes, (ptr, len) => {
			this.vt.exports.ghostty_terminal_vt_write(this.terminal, ptr, len);
		});
	}

	writeText(text: string): void {
		this.write(new TextEncoder().encode(text));
	}

	resize(
		cols: number,
		rows: number,
		cellWidthPx: number,
		cellHeightPx: number
	): Result<void, VtCallFailed> {
		const code = this.vt.exports.ghostty_terminal_resize(
			this.terminal,
			cols,
			rows,
			cellWidthPx,
			cellHeightPx
		);
		return this.vt.check('ghostty_terminal_resize', code);
	}

	private readU32(): number {
		return this.vt.view().getUint32(this.scratchPtr, true);
	}

	private readBool(): boolean {
		return this.vt.view().getUint8(this.scratchPtr) !== 0;
	}

	private stateGet(data: number): number {
		this.vt.bytes(this.scratchPtr, this.scratchSize).fill(0);
		return this.vt.exports.ghostty_render_state_get(this.renderState, data, this.scratchPtr);
	}

	private readColor(data: number): Rgb | null {
		this.vt.bytes(this.scratchPtr, this.scratchSize).fill(0);
		const code = this.vt.exports.ghostty_render_state_get(
			this.renderState,
			data,
			this.scratchPtr
		);
		if (code !== GHOSTTY_SUCCESS) return null;
		const b = this.vt.bytes(this.scratchPtr, 3);
		return { r: b[0], g: b[1], b: b[2] };
	}

	private cellColor(cells: number, data: number): Rgb | null {
		this.vt.bytes(this.scratchPtr, this.scratchSize).fill(0);
		const code = this.vt.exports.ghostty_render_state_row_cells_get(
			cells,
			data,
			this.scratchPtr
		);
		// INVALID_VALUE means "no explicit color"; the caller substitutes the
		// terminal default rather than treating it as a failure.
		if (code !== GHOSTTY_SUCCESS) return null;
		const b = this.vt.bytes(this.scratchPtr, 3);
		return { r: b[0], g: b[1], b: b[2] };
	}

	/** Read the current cell's grapheme cluster as UTF-8. */
	private cellText(cells: number): string {
		const view = this.vt.view();
		this.vt.bytes(this.bufferPtr, this.bufferSize).fill(0);
		view.setUint32(this.bufferPtr + this.bufferOffsets.ptr, this.textPtr, true);
		view.setUint32(this.bufferPtr + this.bufferOffsets.cap, GRAPHEME_CAP, true);

		const code = this.vt.exports.ghostty_render_state_row_cells_get(
			cells,
			CELLS_DATA_GRAPHEMES_UTF8,
			this.bufferPtr
		);
		if (code !== GHOSTTY_SUCCESS) return ' ';

		const len = this.vt.view().getUint32(this.bufferPtr + this.bufferOffsets.len, true);
		if (len === 0) return ' ';
		return new TextDecoder().decode(this.vt.bytes(this.textPtr, len));
	}

	private cellStyle(cells: number): Omit<RunStyle, 'fg' | 'bg'> {
		// GHOSTTY_INIT_SIZED: sized structs carry their own size so the library
		// can version them; zeroing it makes the call fail.
		this.vt.bytes(this.stylePtr, this.styleSize).fill(0);
		this.vt
			.view()
			.setUint32(this.stylePtr + this.styleOffsets.size, this.styleSize, true);

		const code = this.vt.exports.ghostty_render_state_row_cells_get(
			cells,
			CELLS_DATA_STYLE,
			this.stylePtr
		);
		if (code !== GHOSTTY_SUCCESS) {
			return { bold: false, italic: false, underline: false, inverse: false };
		}

		const view = this.vt.view();
		return {
			bold: view.getUint8(this.stylePtr + this.styleOffsets.bold) !== 0,
			italic: view.getUint8(this.stylePtr + this.styleOffsets.italic) !== 0,
			inverse: view.getUint8(this.stylePtr + this.styleOffsets.inverse) !== 0,
			underline: view.getInt32(this.stylePtr + this.styleOffsets.underline, true) !== 0
		};
	}

	/**
	 * Refresh from the terminal and read the grid.
	 *
	 * Clears both the per-row and global dirty flags before returning; `update`
	 * only ever sets them, so a renderer that does not clear will repaint
	 * forever.
	 */
	snapshot(): Result<GridSnapshot, VtCallFailed> {
		const e = this.vt.exports;

		const updateCode = e.ghostty_render_state_update(this.renderState, this.terminal);
		if (updateCode !== GHOSTTY_SUCCESS) {
			return err(new VtCallFailed('ghostty_render_state_update', updateCode));
		}

		const dirtyCode = this.stateGet(DATA_DIRTY);
		if (dirtyCode !== GHOSTTY_SUCCESS) {
			return err(new VtCallFailed('ghostty_render_state_get(DIRTY)', dirtyCode));
		}
		const dirtyRaw = this.readU32();
		const dirty: Dirty = dirtyRaw === 0 ? 'none' : dirtyRaw === 1 ? 'partial' : 'full';

		const colsCode = this.stateGet(DATA_COLS);
		if (colsCode !== GHOSTTY_SUCCESS) {
			return err(new VtCallFailed('ghostty_render_state_get(COLS)', colsCode));
		}
		const cols = this.readU32();

		const rowsCode = this.stateGet(DATA_ROWS);
		if (rowsCode !== GHOSTTY_SUCCESS) {
			return err(new VtCallFailed('ghostty_render_state_get(ROWS)', rowsCode));
		}
		const rows = this.readU32();

		const foreground = this.readColor(DATA_COLOR_FOREGROUND) ?? { r: 197, g: 200, b: 198 };
		const background = this.readColor(DATA_COLOR_BACKGROUND) ?? { r: 29, g: 31, b: 33 };

		const cursor = this.readCursor();

		const bindCode = e.ghostty_render_state_get(
			this.renderState,
			DATA_ROW_ITERATOR,
			this.iterSlot
		);
		if (bindCode !== GHOSTTY_SUCCESS) {
			return err(new VtCallFailed('ghostty_render_state_get(ROW_ITERATOR)', bindCode));
		}
		const iter = this.vt.readPointer(this.iterSlot);

		const lines: GridRow[] = [];
		let y = 0;

		while (e.ghostty_render_state_row_iterator_next(iter) !== 0) {
			this.vt.bytes(this.scratchPtr, this.scratchSize).fill(0);
			e.ghostty_render_state_row_get(iter, ROW_DATA_DIRTY, this.scratchPtr);
			const rowDirty = this.readBool();

			const cellsCode = e.ghostty_render_state_row_get(
				iter,
				ROW_DATA_CELLS,
				this.cellsSlot
			);
			if (cellsCode !== GHOSTTY_SUCCESS) {
				return err(new VtCallFailed('ghostty_render_state_row_get(CELLS)', cellsCode));
			}

			lines.push({
				y,
				dirty: rowDirty,
				runs: this.readRuns(this.vt.readPointer(this.cellsSlot))
			});

			// Clear the row's dirty flag now that it has been read.
			this.vt.bytes(this.scratchPtr, this.scratchSize).fill(0);
			e.ghostty_render_state_row_set(iter, ROW_OPTION_DIRTY, this.scratchPtr);

			y++;
		}

		// Clear the global dirty flag for the next frame.
		this.vt.bytes(this.scratchPtr, this.scratchSize).fill(0);
		e.ghostty_render_state_set(this.renderState, OPTION_DIRTY, this.scratchPtr);

		return ok({ cols, rows, dirty, foreground, background, cursor, lines });
	}

	private readCursor(): Cursor | null {
		if (this.stateGet(DATA_CURSOR_VISIBLE) !== GHOSTTY_SUCCESS || !this.readBool()) {
			return null;
		}
		if (
			this.stateGet(DATA_CURSOR_VIEWPORT_HAS_VALUE) !== GHOSTTY_SUCCESS ||
			!this.readBool()
		) {
			return null;
		}

		if (this.stateGet(DATA_CURSOR_VIEWPORT_X) !== GHOSTTY_SUCCESS) return null;
		const x = this.readU32();
		if (this.stateGet(DATA_CURSOR_VIEWPORT_Y) !== GHOSTTY_SUCCESS) return null;
		const y = this.readU32();

		const shape =
			this.stateGet(DATA_CURSOR_VISUAL_STYLE) === GHOSTTY_SUCCESS
				? (CURSOR_SHAPES[this.readU32()] ?? 'block')
				: 'block';

		return { x, y, shape };
	}

	/**
	 * Coalesce a row's cells into runs sharing identical attributes.
	 *
	 * Text accumulates into a local and one object is built per run rather than
	 * per cell — a full 100x30 repaint walks 3000 cells, so per-cell allocation
	 * shows up.
	 */
	private readRuns(cells: number): readonly CellRun[] {
		const e = this.vt.exports;
		const runs: CellRun[] = [];

		let style: RunStyle | null = null;
		let startX = 0;
		let text = '';
		let x = 0;

		const flush = (): void => {
			if (style === null || text.length === 0) return;
			runs.push({
				x: startX,
				text,
				fg: style.fg,
				bg: style.bg,
				bold: style.bold,
				italic: style.italic,
				underline: style.underline,
				inverse: style.inverse
			});
		};

		while (e.ghostty_render_state_row_cells_next(cells) !== 0) {
			const cellText = this.cellText(cells);

			this.vt.bytes(this.scratchPtr, this.scratchSize).fill(0);
			e.ghostty_render_state_row_cells_get(cells, CELLS_DATA_HAS_STYLING, this.scratchPtr);
			const hasStyling = this.readBool();

			const attrs = hasStyling
				? this.cellStyle(cells)
				: { bold: false, italic: false, underline: false, inverse: false };

			const cellStyle: RunStyle = {
				bold: attrs.bold,
				italic: attrs.italic,
				underline: attrs.underline,
				inverse: attrs.inverse,
				fg: hasStyling ? this.cellColor(cells, CELLS_DATA_FG_COLOR) : null,
				bg: hasStyling ? this.cellColor(cells, CELLS_DATA_BG_COLOR) : null
			};

			if (style !== null && sameStyle(style, cellStyle)) {
				text += cellText;
			} else {
				flush();
				style = cellStyle;
				startX = x;
				text = cellText;
			}

			x++;
		}

		flush();
		return runs;
	}

	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;

		const e = this.vt.exports;
		e.ghostty_render_state_row_cells_free(this.vt.readPointer(this.cellsSlot));
		e.ghostty_render_state_row_iterator_free(this.vt.readPointer(this.iterSlot));
		e.ghostty_wasm_free_opaque(this.cellsSlot);
		e.ghostty_wasm_free_opaque(this.iterSlot);
		e.ghostty_wasm_free_u8_array(this.textPtr, GRAPHEME_CAP);
		e.ghostty_wasm_free_u8_array(this.bufferPtr, this.bufferSize);
		e.ghostty_wasm_free_u8_array(this.stylePtr, this.styleSize);
		e.ghostty_wasm_free_u8_array(this.scratchPtr, this.scratchSize);
		e.ghostty_render_state_free(this.renderState);
		e.ghostty_terminal_free(this.terminal);
	}
}
