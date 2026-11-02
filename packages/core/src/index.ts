export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };
