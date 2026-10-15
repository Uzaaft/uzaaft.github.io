import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createServer } from 'vite';

test('Rush opens the blog reader while cat remains ordinary terminal output', async () => {
	const server = await createServer({
		server: { middlewareMode: true, hmr: false }
	});
	let shell;
	try {
		const { RushModule } = await server.ssrLoadModule('/src/lib/rush/module.ts');
		const { RUSH_INIT_SCRIPT } = await server.ssrLoadModule('/src/lib/shell/commands.ts');
		const { parseShellOutput } = await server.ssrLoadModule('/src/lib/shell/effects.ts');
		const wasm = await readFile(new URL('../../../static/rush.wasm', import.meta.url));
		const loaded = await RushModule.load(`data:application/wasm;base64,${wasm.toString('base64')}`);
		assert.equal(loaded._tag, 'ok');
		const created = loaded.value.createShell();
		assert.equal(created._tag, 'ok');
		shell = created.value;
		const initialized = shell.evaluate(RUSH_INIT_SCRIPT);
		assert.equal(initialized._tag, 'ok');
		assert.equal(initialized.value.status, 0);

		for (const command of ['blog', 'open blog']) {
			const result = shell.evaluate(command);
			assert.equal(result._tag, 'ok');
			assert.equal(result.value.status, 0);
			assert.deepEqual(parseShellOutput(result.value.stdout), {
				bytes: '',
				effects: [{ kind: 'blog' }]
			});
		}
		const result = shell.evaluate('cat blog/hello-world.md');
		assert.equal(result._tag, 'ok');
		assert.equal(result.value.status, 0);
		const output = parseShellOutput(result.value.stdout);
		assert.deepEqual(output.effects, []);
		assert.match(output.bytes, /Hello World/);
		assert.match(output.bytes, /!\[Bobr\]\(\/bobr.gif\)/);
	} finally {
		shell?.dispose();
		await server.close();
	}
});
