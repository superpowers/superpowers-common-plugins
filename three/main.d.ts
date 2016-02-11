/// <reference path="typings/threejs/three.d.ts" />

declare namespace SupTHREE {
  export function createWebGLRenderer(params?: THREE.WebGLRendererParameters): THREE.WebGLRenderer;

  // `maxLateTicks` limits how many late ticks to try and catch up.
  // This helps avoid falling into the "black pit of despair" or "doom spiral"
  // where every tick takes longer than the previous one.
  // See http://blogs.msdn.com/b/shawnhar/archive/2011/03/25/technical-term-that-should-exist-quot-black-pit-of-despair-quot.aspx
  interface TickerOptions { timeStep: number; maxLateTicks: number; }

  export class Ticker {
    constructor(tickCallback: () => boolean, options?: SupTHREE.TickerOptions);

    /**
     * @returns Number of ticks processed
     */
    tick(accumulatedTime: number): number;

    reset(): void;
  }

  export class Camera3DControls {
    constructor(camera: THREE.Camera, canvas: HTMLCanvasElement);
    update(): void;
  }
}
