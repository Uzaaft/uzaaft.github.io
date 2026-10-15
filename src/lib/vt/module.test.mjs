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
	} finally {
		terminal?.dispose();
		await server.close();
	}
});
