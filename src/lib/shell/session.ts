/**
 * Remembers when this browser last opened the terminal, so the login banner
 * reports something true instead of a hardcoded timestamp.
 *
 * External Adapter Module: the only thing here that touches storage. `now` is
 * passed in rather than read, so the shell layer stays testable and free of
 * ambient time.
 */

const KEY = 'uzaaft.me:session';

export interface PreviousLogin {
	readonly at: Date;
	/** The tty of that previous session, e.g. `ttys004`. */
	readonly tty: string;
}

/**
 * `null` means this browser has no recorded prior visit — either a genuine
 * first visit, or storage is unavailable (private windows, disabled cookies).
 * The two are deliberately indistinguishable: the banner is cosmetic and there
 * is nothing a caller would do differently.
 */
export type Session = PreviousLogin | null;

interface StoredSession {
	readonly at: number;
	readonly session: number;
}

/** Terminals count up from ttys000; wrap rather than grow a fourth digit. */
const ttyName = (session: number): string =>
	`ttys${String(session % 1000).padStart(3, '0')}`;

function read(): StoredSession | null {
	try {
		const raw = localStorage.getItem(KEY);
		if (raw === null) return null;

		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null) return null;

		const at = (parsed as { at?: unknown }).at;
		const session = (parsed as { session?: unknown }).session;
		if (typeof at !== 'number' || !Number.isFinite(at)) return null;
		if (typeof session !== 'number' || !Number.isFinite(session)) return null;

		return { at, session };
	} catch {
		// Malformed JSON or storage denied — treat as a first visit.
		return null;
	}
}

/**
 * Record this visit and report the previous one.
 *
 * Called once per page load, before the banner is written.
 */
export function beginSession(now: Date): Session {
	const previous = read();
	const session = (previous?.session ?? 0) + 1;

	try {
		localStorage.setItem(KEY, JSON.stringify({ at: now.getTime(), session }));
	} catch {
		// Storage is full or denied; the banner just degrades to a first visit
		// next time. Not worth surfacing.
	}

	if (previous === null) return null;
	return { at: new Date(previous.at), tty: ttyName(previous.session) };
}
