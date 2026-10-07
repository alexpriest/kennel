// Digs reacts to what is going on and to what you do. Easter egg, not a mascot.

export type Pose = 'sleep' | 'sit' | 'alert' | 'tilt';
const IDLE_MS = 45_000;

class Digs {
  pose = $state<Pose>('sleep');
  facing = $state<'left' | 'right'>('left');
  bubble = $state('');
  wagging = $state(false);
  private lockUntil = 0;
  private idleTimer: ReturnType<typeof setTimeout> | undefined;
  private bubbleTimer: ReturnType<typeof setTimeout> | undefined;
  private still = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Resting pose: alert while anything needs a look, otherwise sitting. */
  rest(problems: number, panelOpen: boolean): void {
    if (Date.now() < this.lockUntil || panelOpen) return;
    if (this.pose === 'sleep') return;
    this.pose = problems ? 'alert' : 'sit';
  }

  wake(problems: number, panelOpen: boolean): void {
    clearTimeout(this.idleTimer);
    if (this.pose === 'sleep' && !panelOpen) this.pose = problems ? 'alert' : 'sit';
    this.idleTimer = setTimeout(() => { if (!panelOpen) this.pose = 'sleep'; }, IDLE_MS);
  }

  react(pose: Pose, text: string | null, lockMs: number): void {
    this.pose = pose;
    this.lockUntil = Date.now() + lockMs;
    this.wag();
    if (text) this.say(text);
  }

  say(text: string, ms = 1800): void {
    this.bubble = text;
    clearTimeout(this.bubbleTimer);
    this.bubbleTimer = setTimeout(() => { this.bubble = ''; }, ms);
  }

  wag(): void {
    if (this.still) return;
    this.wagging = false;
    requestAnimationFrame(() => {
      this.wagging = true;
      setTimeout(() => { this.wagging = false; }, 1200);
    });
  }

  lookAt(problem: boolean): void {
    this.facing = 'right';
    this.pose = problem ? 'tilt' : 'alert';
  }

  lookAway(problems: number): void {
    this.facing = 'left';
    this.lockUntil = 0;
    this.pose = problems ? 'alert' : 'sit';
  }

  hoverProblem(on: boolean, problems: number, panelOpen: boolean): void {
    if (panelOpen || Date.now() < this.lockUntil || this.pose === 'sleep') return;
    if (on) this.pose = 'tilt';
    else if (this.pose === 'tilt') this.pose = problems ? 'alert' : 'sit';
  }
}

export const digs = new Digs();
