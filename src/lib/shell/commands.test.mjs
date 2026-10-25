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

		// The size-optimized embed must retain shell state and virtual navigation.
		assert.equal(shell.evaluate('answer=37; cd /blog').value.status, 0);
		assert.match(shell.evaluate('ls').value.stdout, /hello-world\.md/);
		assert.match(shell.evaluate('__site_prompt').value.stdout, /~\/blog/);
		assert.equal(shell.evaluate('printf "%s" "$((answer + 5))"').value.stdout, '42');
		assert.equal(shell.evaluate('missing_command').value.status, 127);

		assert.equal(shell.evaluate('printf "%s:%04d:%x" kept 23 42').value.stdout, 'kept:0023:2a');
		for (const conversion of ['f', 'F', 'e', 'E', 'g', 'G', 'a', 'A']) {
			const disabled = shell.evaluate(`printf '%${conversion}' 1.25`).value;
			assert.notEqual(disabled.status, 0);
			assert.equal(disabled.stdout, '');
			assert.match(disabled.stderr, /floating-point conversions disabled/);
		}
		for (const command of ['history', 'fc', 'z']) {
			assert.notEqual(shell.evaluate(`command -v ${command}`).value.status, 0);
			assert.equal(shell.evaluate(command).value.status, 127);
			assert.equal(shell.evaluate(`command ${command}`).value.status, 127);
		}
	} finally {
		shell?.dispose();
		await server.close();
	}
});
