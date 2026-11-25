export interface Swimmer {
	x: number;
	y: number;
	heading: number;
	speed: number;
	phase: number;
	time: number;
	turn: number;
	targetSpeed: number;
	nextDecision: number;
}

export function createSwimmer(width: number, height: number): Swimmer {
	return {
		x: Math.min(158, width / 2),
		y: Math.max(height / 2, height - 112),
		heading: -0.12,
		speed: 18,
		phase: 0,
		time: 0,
		turn: 0,
		targetSpeed: 18,
		nextDecision: 0
	};
}

/** Gentle wandering with soft banks and a current around the terminal's center. */
export function stepSwimmer(swimmer: Swimmer, dt: number, width: number, height: number): void {
	if (width <= 0 || height <= 0) return;
	const scale = Math.min(1, width / 320);
	const margin = 55 * scale;
	// Resize can move a bank past the swimmer. Bring it into the new water first.
	swimmer.x = Math.max(margin, Math.min(width - margin, swimmer.x));
	swimmer.y = Math.max(margin, Math.min(height - margin, swimmer.y));
	if (dt <= 0) return;
	swimmer.time += dt;
	if (swimmer.time >= swimmer.nextDecision) {
		swimmer.turn = (Math.random() - 0.5) * 0.7;
		swimmer.targetSpeed = 12 + Math.random() * 16;
		swimmer.nextDecision = swimmer.time + 2 + Math.random() * 4;
	}

	let dx = Math.cos(swimmer.heading + swimmer.turn);
	let dy = Math.sin(swimmer.heading + swimmer.turn);
	const bank = 105 * scale;
	dx += Math.max(0, 1 - swimmer.x / bank) * 4;
	dx -= Math.max(0, 1 - (width - swimmer.x) / bank) * 4;
	dy += Math.max(0, 1 - swimmer.y / bank) * 4;
	dy -= Math.max(0, 1 - (height - swimmer.y) / bank) * 4;

	// Prefer the surrounding river to spending long stretches hidden under the shell.
	const nx = (swimmer.x - width / 2) / (width * 0.38);
	const ny = (swimmer.y - height / 2) / (height * 0.36);
	const distance = Math.hypot(nx, ny);
	if (distance > 0 && distance < 1) {
		const outward = (1 - distance) * 3;
		dx += (nx / distance) * outward;
		dy += (ny / distance) * outward;
	}

	const target = Math.atan2(dy, dx);
	const angle = Math.atan2(Math.sin(target - swimmer.heading), Math.cos(target - swimmer.heading));
	const turnLimit = 0.65 * dt;
	swimmer.heading += Math.max(-turnLimit, Math.min(turnLimit, angle * 1.2 * dt));
	swimmer.speed += (swimmer.targetSpeed - swimmer.speed) * (1 - Math.exp(-dt * 0.7));
	swimmer.x = Math.max(
		margin,
		Math.min(width - margin, swimmer.x + Math.cos(swimmer.heading) * swimmer.speed * scale * dt)
	);
	swimmer.y = Math.max(
		margin,
		Math.min(height - margin, swimmer.y + Math.sin(swimmer.heading) * swimmer.speed * scale * dt)
	);
	swimmer.phase += dt * (2 + swimmer.speed * 0.1);
}
