import * as THREE from "three";
(window as any).THREE = THREE;

export function createWebGLRenderer(params?: THREE.WebGLRendererParameters) {
  if (params == null) params = {};
  if (params.precision == null) params.precision = "mediump";
  if (params.alpha == null) params.alpha = false;
  if (params.antialias == null) params.antialias = false;
  // NOTE: We ask for a stencil buffer by default because of a Firefox bug:
  // Without it, Firefox will often return a 16-bit depth buffer
  // (rather than a more useful 24-bit depth buffer).
  // See https://bugzilla.mozilla.org/show_bug.cgi?id=1202387
  if (params.stencil == null) params.stencil = true;

  const renderer = new THREE.WebGLRenderer(params);

  return renderer;
}

export class Ticker {
  private previousTimestamp = 0;
  private accumulatedTime = 0;

  private maxAccumulatedTime: number;
  private timeStep: number;

  constructor(private tickCallback: () => boolean, options?: SupTHREE.TickerOptions) {
    if (options == null) options = { timeStep: 1000 / 60, maxLateTicks: 5 };
    this.timeStep = options.timeStep;
    this.maxAccumulatedTime = options.maxLateTicks * options.timeStep;
  }

  tick(timestamp: number) {
    this.accumulatedTime += timestamp - this.previousTimestamp;
    this.previousTimestamp = timestamp;

    let ticks = 0;

    if (this.accumulatedTime > this.maxAccumulatedTime) this.accumulatedTime = this.maxAccumulatedTime;

    while (this.accumulatedTime >= this.timeStep) {
      if (this.tickCallback != null) {
        const keepGoing = this.tickCallback();
        if (!keepGoing) break;
      }

      this.accumulatedTime -= this.timeStep;
      ticks++;
    }

    return ticks;
  }

  reset() {
    this.previousTimestamp = 0;
    this.accumulatedTime = 0;
  }
}
