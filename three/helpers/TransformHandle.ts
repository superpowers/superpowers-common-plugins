import "./TransformControls";

export default class TransformHandle {
  control: any; // : THREE.TransformControls;

  private target: THREE.Object3D;
  mode = "translate";
  private space = "world";
  private controlVisible = false;

  constructor(scene: THREE.Scene, private root: THREE.Object3D, threeCamera: THREE.Camera, canvas: HTMLCanvasElement) {
    this.control = new (THREE as any).TransformControls(threeCamera, canvas);
    this.control.traverse((object: THREE.Object3D) => { object.channels.set(1); });
    scene.add(this.control);
  }

  update() {
    this.control.update();
    this.control.updateMatrixWorld(true);
  }

  setMode(mode: string) {
    this.mode = mode;
    if (this.target != null) {
      this.control.setMode(mode);
      this.control.setSpace(this.mode === "scale" ? "local" : this.space);
    }
    return this;
  }

  setSpace(space: string) {
    this.space = space;
    if (this.target != null && this.mode !== "scale") this.control.setSpace(space);
    return this;
  }

  setTarget(target: THREE.Object3D) {
    this.target = target;
    this.controlVisible = true;
    this.control.attach(this.root);
    this.control.setSpace(this.mode === "scale" ? "local" : this.space);
    this.control.setMode(this.mode);
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
    this.controlVisible = false;
    this.control.detach();
    return this;
  }
}
