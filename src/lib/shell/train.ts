import { CRLF } from './ansi';

const LOCOMOTIVE: readonly string[] = [
	'      ====        ________                ___________ ',
	'  _D _|  |_______/        \\__I_I_____===__|_________| ',
	'   |(_)---  |   H\\________/ |   |        =|___ ___|   ',
	'   /     |  |   H  |  |     |   |         ||_| |_||   ',
	'  |      |  |   H  |__--------------------| [___] |   ',
	'  | ________|___H__/__|_____/[][]~\\_______|       |   ',
	'  |/ |   |-----------I_____I [][] []  D   |=======|__ ',
	'__/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__',
	' |/-=|___|=    ||    ||    ||    |_____/~\\___/        ',
	'  \\_/      \\O=====O=====O=====O_/      \\_/            '
];

const SMOKE: readonly (readonly string[])[] = [
	['        (@@)', '    (   )', '   (   )'],
	['      (  )', '   (   )', '    (@@)'],
	['    (   )', '      (@@)', '   (  )']
];

export const TRAIN_WIDTH = Math.max(...LOCOMOTIVE.map((line) => line.length));

export const TRAIN_HEIGHT = LOCOMOTIVE.length + SMOKE[0].length;

function visibleSlice(line: string, left: number, columns: number): string {
	const sourceStart = Math.max(0, -left);
	const screenStart = Math.max(0, left);
	const length = Math.min(line.length - sourceStart, columns - screenStart);
	if (length <= 0) return '';
	return ' '.repeat(screenStart) + line.slice(sourceStart, sourceStart + length);
}

/** Render one viewport-sized frame of the `sl` locomotive animation. */
export function renderTrainFrame(
	columns: number,
	rows: number,
	left: number,
	frame: number
): string {
	const smoke = SMOKE[frame % SMOKE.length] ?? SMOKE[0];
	const art = [...smoke, ...LOCOMOTIVE];
	const top = Math.max(0, Math.floor((rows - TRAIN_HEIGHT) / 2));
	const visible = art.map((line) => visibleSlice(line, left, columns));
	return CRLF.repeat(top) + visible.join(CRLF);
}
