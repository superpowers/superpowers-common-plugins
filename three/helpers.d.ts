/// <reference path="typings/threejs/three.d.ts" />

declare namespace SupTHREE {
  export class GridHelper {
    constructor(root: THREE.Object3D, size: number, step: number);
    setup(size: number, step: number): GridHelper;
    setVisible(visible: boolean): GridHelper;
  }

  export class TransformMarker {
    constructor(root: THREE.Object3D);
    move(target: THREE.Object3D): TransformMarker;
    hide(): TransformMarker;
  }

  export class SelectionBox {
    constructor(root: THREE.Object3D);
    setTarget(target: THREE.Object3D): SelectionBox;
    move(): SelectionBox;
    resize(): SelectionBox;
    hide(): SelectionBox;
  }

  export class TransformHandle {
    control: any;
    mode: string;

    constructor(scene: THREE.Scene, root: THREE.Object3D, threeCamera: THREE.Camera, canvas: HTMLCanvasElement);
    update(): void;
    setMode(mode: string): TransformHandle;
    setSpace(space: string): TransformHandle;
    setTarget(target: THREE.Object3D): TransformHandle;
    move(): TransformHandle;
    hide(): TransformHandle;
  }
}
