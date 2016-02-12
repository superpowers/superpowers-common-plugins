const tmpVector3 = new THREE.Vector3();
const tmpQuaternion = new THREE.Quaternion();
const upVector = new THREE.Vector3(0, 1, 0);

const lerpFactor = 0.25;
const minOrbitingRadius = 0.5;

export default class Camera3DControls {
  private isPanning = false;

  private isOrbiting = false;
  private orbitingPivot: THREE.Vector3;

  private radius = 10;

  // Horizontal angle
  private theta: number;
  private targetTheta: number;
  // Vertical angle
  private phi: number;
  private targetPhi: number;

  constructor(private camera: THREE.Camera, private canvas: HTMLCanvasElement) {
    this.orbitingPivot = new THREE.Vector3(0, 0, -this.radius).applyQuaternion(this.camera.quaternion).add(this.camera.position);

    tmpQuaternion.setFromUnitVectors(this.camera.up, upVector);
    tmpVector3.copy(this.camera.position).sub(this.orbitingPivot).applyQuaternion(tmpQuaternion);

    this.theta = Math.atan2(tmpVector3.x, tmpVector3.z);
    this.targetTheta = this.theta;
    this.phi = Math.atan2(Math.sqrt(tmpVector3.x * tmpVector3.x + tmpVector3.z * tmpVector3.z), tmpVector3.y);
    this.targetPhi = this.phi;

    canvas.addEventListener("mousedown", this.onMouseDown);
    canvas.addEventListener("mousemove", this.onMouseMove);
    canvas.addEventListener("wheel", this.onWheel);
    document.addEventListener("mouseup", this.onMouseUp);
    document.addEventListener("mouseout", this.onMouseUp);
    canvas.addEventListener("contextmenu", (event) => { event.preventDefault(); });
  }

  private onMouseDown = (event: MouseEvent) => {
    if (this.isPanning || this.isOrbiting) return;

    if (event.button === 2) {
      this.isPanning = true;

    } else if (event.button === 1) {
      this.isOrbiting = true;
      this.orbitingPivot = new THREE.Vector3(0, 0, -this.radius).applyQuaternion(this.camera.quaternion).add(this.camera.position);

      tmpQuaternion.setFromUnitVectors(this.camera.up, upVector);
      tmpVector3.copy(this.camera.position).sub(this.orbitingPivot).applyQuaternion(tmpQuaternion);

      this.theta = Math.atan2(tmpVector3.x, tmpVector3.z);
      this.targetTheta = this.theta;
      this.phi = Math.atan2(Math.sqrt(tmpVector3.x * tmpVector3.x + tmpVector3.z * tmpVector3.z), tmpVector3.y);
      this.targetPhi = this.phi;
    }
  };

  private onMouseMove = (event: MouseEvent) => {
    if (this.isPanning) {
      tmpVector3.set(-event.movementX / 10, event.movementY / 10, 0).applyQuaternion(this.camera.quaternion);
      this.orbitingPivot.add(tmpVector3);
      this.camera.position.add(tmpVector3);
      this.camera.updateMatrixWorld(false);

    } else if (this.isOrbiting) {
      this.targetTheta -= event.movementX / 50;
      this.targetPhi -= event.movementY / 50;

      this.targetPhi = Math.max(0.001, Math.min(Math.PI - 0.001, this.targetPhi));
    }
  };

  private onWheel = (event: WheelEvent) => {
    const multiplicator = event.deltaY / 100 * 1.3;
    if (event.deltaY > 0) this.radius *= multiplicator;
    else if (event.deltaY < 0) this.radius /= -multiplicator;
    this.radius = Math.max(this.radius, minOrbitingRadius);
  };

  private onMouseUp = (event: MouseEvent) => {
    if (event.button === 2) this.isPanning = false;
    else if (event.button === 1) this.isOrbiting = false;
  };

  update() {
    this.theta += (this.targetTheta - this.theta) * lerpFactor;
    this.phi += (this.targetPhi - this.phi) * lerpFactor;

    tmpVector3.x = this.radius * Math.sin(this.phi) * Math.sin(this.theta);
    tmpVector3.y = this.radius * Math.cos(this.phi);
    tmpVector3.z = this.radius * Math.sin(this.phi) * Math.cos(this.theta);
    tmpVector3.applyQuaternion(tmpQuaternion.clone().inverse());

    this.camera.position.copy(this.orbitingPivot).add(tmpVector3);
    this.camera.lookAt(this.orbitingPivot);
    this.camera.updateMatrixWorld(false);
  }
}
