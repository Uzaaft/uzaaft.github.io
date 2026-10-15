import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createServer } from 'vite';

test('the shipped Ghostty module can render styled terminal output', async () => {
	const server = await createServer({ server: { middlewareMode: true } });
	let terminal;
	try {
		const { VtModule } = await server.ssrLoadModule('/src/lib/vt/module.ts');
		const { VtTerminal } = await server.ssrLoadModule('/src/lib/vt/terminal.ts');
		const wasm = await readFile(new URL('../../../static/ghostty-vt.wasm', import.meta.url));
		const loaded = await VtModule.load(`data:application/wasm;base64,${wasm.toString('base64')}`);
		assert.equal(loaded._tag, 'ok');
		const created = VtTerminal.create(loaded.value, 40, 6);
		assert.equal(created._tag, 'ok');
		terminal = created.value;
		terminal.writeText('\x1b[1;31mhello\x1b[0m\r\nworld');
		const snapshot = terminal.snapshot();
		assert.equal(snapshot._tag, 'ok');
		assert.equal(snapshot.value.lines[0].runs[0].text, 'hello');
		assert.equal(snapshot.value.lines[0].runs[0].bold, true);
		assert.equal(snapshot.value.lines[1].runs[0].text.trimEnd(), 'world');
		assert.equal(snapshot.value.lines[1].runs[0].bold, false);
		assert.equal(snapshot.value.cursor.x, 5);
		assert.equal(snapshot.value.cursor.y, 1);

		// Direct, chunked KIP must produce real pixels, not just consume APCs.
		assert.equal(terminal.resize(40, 6, 8, 20)._tag, 'ok');
		const pixels = Buffer.from([
			255, 0, 0, 0, 255, 0, 0, 0, 255, 12, 34, 56, 200, 150, 100, 9, 8, 7
		]);
		const encoded = pixels.toString('base64');
		terminal.writeText(
			`\x1b[2;3H\x1b_Ga=T,f=24,s=2,v=3,i=7,p=1,c=4,r=2,C=1,q=2,m=1;${encoded.slice(0, 12)}\x1b\\`
		);
		assert.deepEqual(terminal.snapshot().value.images, []);
		terminal.writeText(`\x1b_Gm=0;${encoded.slice(12)}\x1b\\`);
		const placed = terminal.snapshot().value.images;
		assert.equal(placed.length, 1);
		assert.deepEqual([...placed[0].image.pixels], [...pixels]);
		assert.deepEqual(
			[placed[0].column, placed[0].row, placed[0].width, placed[0].height],
			[2, 1, 32, 40]
		);
		terminal.writeText('\x1b_Ga=p,i=7,p=9,x=1,y=1,w=1,h=2,c=2,r=1,z=-3,C=1,q=2\x1b\\');
		const cropped = terminal.snapshot().value.images;
		assert.equal(cropped.length, 2);
		assert.deepEqual(
			[
				cropped[0].sourceX,
				cropped[0].sourceY,
				cropped[0].sourceWidth,
				cropped[0].sourceHeight,
				cropped[0].width,
				cropped[0].height,
				cropped[0].z
			],
			[1, 1, 1, 2, 16, 20, -3]
		);
		terminal.writeText('\x1b[?1049h');
		assert.deepEqual(terminal.snapshot().value.images, []);
		terminal.writeText('\x1b[?1049l');
		assert.equal(terminal.snapshot().value.images.length, 2);
		assert.equal(terminal.resize(40, 6, 10, 18)._tag, 'ok');
		assert.equal(terminal.snapshot().value.images[0].width, 20);
		terminal.writeText('\x1b_Ga=d,d=I,i=7,q=2\x1b\\');
		assert.deepEqual(terminal.snapshot().value.images, []);
		// Previous snapshots must stay readable after mutation and deletion.
		assert.deepEqual([...placed[0].image.pixels], [...pixels]);
		// Two PNG pixels: opaque (21,43,65) and half-alpha (87,109,131).
		terminal.writeText('\x1b_Ga=T,f=100,i=8,C=1,q=2;iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4nGMQ1Xb8H57b3AAADIgDSDJEE/MAAAAASUVORK5CYII=\x1b\\');
		const png = terminal.snapshot().value.images[0].image;
		assert.deepEqual([png.width, png.height, png.format], [2, 1, 1]);
		assert.deepEqual([...png.pixels], [21, 43, 65, 255, 87, 109, 131, 128]);
	} finally {
		terminal?.dispose();
		await server.close();
	}
});
