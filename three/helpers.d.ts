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
}
