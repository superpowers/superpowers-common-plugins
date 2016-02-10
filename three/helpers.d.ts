/// <reference path="typings/threejs/three.d.ts" />

declare namespace SupTHREE {
  export class GridHelper {
    constructor(root: THREE.Object3D, size: number, step: number)
    setup(size: number, step: number): GridHelper;
    setVisible(visible: boolean): GridHelper;
  }
}
