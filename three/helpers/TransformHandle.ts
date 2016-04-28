import TransformControls from "./TransformControls";

export default class TransformHandle {
  control: TransformControls;

  private root = new THREE.Object3D();
  private target: THREE.Object3D;

  constructor(scene: THREE.Scene, threeCamera: THREE.Camera, canvas: HTMLCanvasElement) {
    scene.add(this.root);

    this.control = new TransformControls(threeCamera, canvas);
    scene.add(this.control);
  }

  update() {
    this.control.update();
    this.control.updateMatrixWorld(true);
  }

  setMode(mode: string) {
    if (this.target != null) this.control.setMode(mode);
    return this;
  }

  setSpace(space: string) {
    if (this.target != null) this.control.setSpace(space);
    return this;
  }

  setTarget(target: THREE.Object3D) {
    this.target = target;
    this.control.attach(this.root);
    this.move();
    return this;
  }

  move() {
    this.root.position.copy(this.target.getWorldPosition());
    this.root.quaternion.copy(this.target.getWorldQuaternion());
    this.root.scale.copy(this.target.scale);
    this.root.updateMatrixWorld(false);

    this.control.update();
    this.control.updateMatrixWorld(true);
    return this;
  }

  hide() {
    this.control.detach();
    return this;
  }
}
