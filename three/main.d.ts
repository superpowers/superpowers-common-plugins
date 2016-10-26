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

  export class Camera {
    threeCamera: THREE.OrthographicCamera|THREE.PerspectiveCamera;

    constructor(root: THREE.Object3D, canvas: HTMLCanvasElement)
    computeAspectRatio(): this;
    setOrthographicMode(isOrthographic: boolean): this;
    setFOV(fov: number): this;
    setOrthographicScale(orthographicScale: number): this;
    getOrthographicScale(): number;
    setViewport(x: number, y: number, width: number, height: number): this;
    setDepth(depth: number): this;
    setNearClippingPlane(nearClippingPlane: number): this;
    setFarClippingPlane(farClippingPlane: number): this;
    render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, channels: number[]): void;
  }

  interface Camera2DControlsOptions {
    zoomMin?: number;
    zoomMax?: number;
    zoomSpeed?: number;
    zoomCallback?: Function;
    moveCallback?: Function;
  }

  export class Camera2DControls {
    constructor(camera: Camera, canvas: HTMLCanvasElement, options?: Camera2DControlsOptions);
    setMultiplier(newMultiplier: number): this;
  }

  export class Camera3DControls {
    constructor(root: THREE.Object3D, camera: Camera, canvas: HTMLCanvasElement);
    setEnabled(enabled: boolean): this;
    resetOrbitPivot(position: THREE.Vector3, radius?: number): this;
    setPosition(position: THREE.Vector3): this;
    getPosition(): THREE.Vector3;
    setOrientation(orientation: { theta: number; phi: number; gamma: number; }): this;
    getOrientation(): { theta: number; phi: number; gamma: number; };
    hasJustPanned(): boolean;
    setMoveSpeed(moveSpeed: number): this;
    update(): void;
  }
}
