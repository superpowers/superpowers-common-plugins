/// <reference types="three" />

declare namespace SupTHREE {
  export class GridHelper {
    constructor(root: THREE.Object3D, size: number, step: number, opacity?: number);
    setup(size: number, step: number, opacity: number): this;
    setVisible(visible: boolean): this;
  }

  export class SelectionBoxRenderer {
    constructor(root: THREE.Object3D);
    setTarget(target: THREE.Object3D): this;
    move(): this;
    resize(): this;
    hide(): this;
  }

  export class TransformControls extends THREE.Object3D {
    translationSnap: number;
    rotationSnap: number;
    root: THREE.Object3D;

    constructor(scene: THREE.Scene, threeCamera: SupTHREE.Camera, canvas: HTMLCanvasElement);
    dispose(): void;

    setVisible(visible: boolean): this;
    attach(object: THREE.Object3D): this;
    detach(): this;

    update(): void;
    getMode(): string;
    setMode(mode: string): this;
    setSpace(space: string): this;
    enable(): this;
    disable(): this;
  }

  export class TransformMarker {
    constructor(root: THREE.Object3D);
    move(target: THREE.Object3D): this;
    hide(): this;
  }

  type ColorName = "white"|"red"|"green"|"blue"|"yellow"|"cyan"|"magenta";
  export class GizmoMaterial extends THREE.MeshBasicMaterial {
    constructor(parameters?: THREE.MeshBasicMaterialParameters);

    setColor(colorName: ColorName): void;
    highlight(highlighted: boolean): void;
    setDisabled(disabled: boolean): void;
  }
}
