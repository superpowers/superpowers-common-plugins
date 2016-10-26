import Camera from "./Camera";

const tmpVector3 = new THREE.Vector3();
const tmpQuaternion = new THREE.Quaternion();
const tmpEuler = new THREE.Euler();
const upVector = new THREE.Vector3(0, 1, 0);

const lerpFactor = 0.3;
const minOrbitRadius = 0.5;
const maxOrbitRadius = 500;
const initialOrbitRadius = 10;

const panningSpeed = 0.005;
const orbitingSpeed = 0.008;
const rotateSpeed = 0.02;
const zoomingSpeed = 1.2;

export default class Camera3DControls {
  private enabled = true;
  private moveSpeed = 0.3;

  private wantToPan = false;
  private hasMovedWhilePanning = false;

  private isOrbiting = false;
  private orbitPivot: THREE.Vector3;
  private targetOrbitPivot: THREE.Vector3;

  private orbitRadius = initialOrbitRadius;
  private targetOrbitRadius = initialOrbitRadius;

  // Horizontal angle
  private theta: number;
  private targetTheta: number;
  // Vertical angle
  private phi: number;
  private targetPhi: number;
  // Forward angle
  private gamma: number;
  private targetGamma: number;

  private moveVector = new THREE.Vector3();
  private pivotMarker: THREE.LineSegments;
  private pivotMarkerOpacity = 0;

  constructor(private root: THREE.Object3D, private camera: Camera, private canvas: HTMLCanvasElement) {
    this.orbitPivot = new THREE.Vector3(0, 0, -this.orbitRadius).applyQuaternion(this.camera.threeCamera.quaternion).add(this.camera.threeCamera.position);
    this.targetOrbitPivot = this.orbitPivot.clone();

    tmpQuaternion.setFromUnitVectors(this.camera.threeCamera.up, upVector);
    tmpVector3.copy(this.camera.threeCamera.position).sub(this.orbitPivot).applyQuaternion(tmpQuaternion);

    this.theta = Math.atan2(tmpVector3.x, tmpVector3.z);
    this.targetTheta = this.theta;
    this.phi = Math.atan2(Math.sqrt(tmpVector3.x * tmpVector3.x + tmpVector3.z * tmpVector3.z), tmpVector3.y);
    this.targetPhi = this.phi;
    this.gamma = this.targetGamma = 0;

    const pivotGeometry = new THREE.Geometry();
    pivotGeometry.vertices.push(
      new THREE.Vector3( -0.5, 0, 0 ), new THREE.Vector3( 0.5, 0, 0 ),
      new THREE.Vector3( 0, -0.5, 0 ), new THREE.Vector3( 0, 0.5, 0 ),
      new THREE.Vector3( 0, 0, -0.5 ), new THREE.Vector3( 0, 0, 0.5 )
    );

    this.pivotMarker = new THREE.LineSegments(pivotGeometry, new THREE.LineBasicMaterial({ color: 0xffffff, opacity: this.pivotMarkerOpacity, transparent: true }));
    this.pivotMarker.layers.set(1);
    root.add(this.pivotMarker);

    canvas.addEventListener("mousedown", this.onMouseDown);
    canvas.addEventListener("mousemove", this.onMouseMove);
    canvas.addEventListener("wheel", this.onWheel);
    canvas.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("keyup", this.onKeyUp);
    document.addEventListener("mouseup", this.onMouseUp);
    canvas.addEventListener("mouseout", this.onMouseUp);
    canvas.addEventListener("contextmenu", (event) => { event.preventDefault(); });
    window.addEventListener("blur", this.onBlur);
  }

  private onMouseDown = (event: MouseEvent) => {
    if (!this.enabled) return;
    if (this.wantToPan || this.isOrbiting) return;

    if (event.button === 2) {
      this.wantToPan = true;
      this.hasMovedWhilePanning = false;

    } else if (event.button === 1 || (event.button === 0 && event.altKey)) {
      this.isOrbiting = true;
      if ((this.canvas as any).requestPointerLock) (this.canvas as any).requestPointerLock();
      else if ((this.canvas as any).webkitRequestPointerLock) (this.canvas as any).webkitRequestPointerLock();
      else if ((this.canvas as any).mozRequestPointerLock) (this.canvas as any).mozRequestPointerLock();

      this.targetOrbitPivot = new THREE.Vector3(0, 0, -this.targetOrbitRadius).applyQuaternion(this.camera.threeCamera.quaternion).add(this.camera.threeCamera.position);

      tmpQuaternion.setFromUnitVectors(this.camera.threeCamera.up, upVector);
      tmpVector3.copy(this.camera.threeCamera.position).sub(this.targetOrbitPivot).applyQuaternion(tmpQuaternion);

      this.theta = Math.atan2(tmpVector3.x, tmpVector3.z);
      this.targetTheta = this.theta;
      this.phi = Math.atan2(Math.sqrt(tmpVector3.x * tmpVector3.x + tmpVector3.z * tmpVector3.z), tmpVector3.y);
      this.targetPhi = this.phi;
    }
  };

  private onMouseMove = (event: MouseEvent) => {
    if (!this.enabled) return;

    if (this.wantToPan) {
      this.hasMovedWhilePanning = true;

      const panningMultiplier = panningSpeed * (1 + Math.sqrt(this.targetOrbitRadius));
      tmpVector3.set(-event.movementX * panningMultiplier, event.movementY * panningMultiplier, 0).applyQuaternion(this.camera.threeCamera.quaternion);
      this.targetOrbitPivot.add(tmpVector3);
      this.camera.threeCamera.position.add(tmpVector3);
      this.camera.threeCamera.updateMatrixWorld(false);

    } else if (this.isOrbiting) {
      this.targetTheta -= event.movementX * orbitingSpeed;
      this.targetPhi -= event.movementY * orbitingSpeed;

      this.targetPhi = Math.max(0.001, Math.min(Math.PI - 0.001, this.targetPhi));
    }
  };

  private onWheel = (event: WheelEvent) => {
    if (!this.enabled) return;

    if (event.deltaY > 0) this.targetOrbitRadius *= zoomingSpeed;
    else if (event.deltaY < 0) this.targetOrbitRadius /= zoomingSpeed;
    else return;

    this.targetOrbitRadius = Math.min(Math.max(this.targetOrbitRadius, minOrbitRadius), maxOrbitRadius);
  };

  private onKeyDown = (event: KeyboardEvent) => {
    if (!this.enabled) return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;

    if (event.keyCode === 87 /* W */ || event.keyCode === 90 /* Z */) {
      this.moveVector.z = -1;
    } else if (event.keyCode === 83 /* S */) {
      this.moveVector.z = 1;
    } else if (event.keyCode === 81 /* W */ || event.keyCode === 65 /* A */) {
      this.moveVector.x = -1;
    } else if (event.keyCode === 68 /* D */) {
      this.moveVector.x = 1;
    } else if (event.keyCode === 32 /* SPACE */) {
      this.moveVector.y = 1;
    } else if (event.keyCode === 16 /* SHIFT */) {
      this.moveVector.y = -1;
    } else if (event.keyCode === 74 /* J */) {
      this.targetGamma = Math.min(this.targetGamma + rotateSpeed, Math.PI / 2);
    } else if (event.keyCode === 75 /* K */) {
      this.targetGamma = Math.max(this.targetGamma - rotateSpeed, -Math.PI / 2);
    }
  };

  private onKeyUp = (event: KeyboardEvent) => {
    if (event.keyCode === 87 /* W */ || event.keyCode === 90 /* Z */) {
      this.moveVector.z = 0;
    } else if (event.keyCode === 83 /* S */) {
      this.moveVector.z = 0;
    } else if (event.keyCode === 81 /* W */ || event.keyCode === 65 /* A */) {
      this.moveVector.x = 0;
    } else if (event.keyCode === 68 /* D */) {
      this.moveVector.x = 0;
    } else if (event.keyCode === 32 /* SPACE */) {
      this.moveVector.y = 0;
    } else if (event.keyCode === 16 /* SHIFT */) {
      this.moveVector.y = 0;
    }
  };

  private onMouseUp = (event: MouseEvent) => {
    if (event.button === 2) {
      this.wantToPan = false;
      this.hasMovedWhilePanning = false;

    } else if (event.button === 1 || event.button === 0) {
      this.isOrbiting = false;
      if ((document as any).exitPointerLock) (document as any).exitPointerLock();
      else if ((document as any).webkitExitPointerLock) (document as any).webkitExitPointerLock();
      else if ((document as any).mozExitPointerLock) (document as any).mozExitPointerLock();
    }
  };

  private onBlur = () => {
    this.moveVector.set(0, 0, 0);
    this.wantToPan = false;

    if (this.isOrbiting) {
      this.isOrbiting = false;
      if ((document as any).exitPointerLock) (document as any).exitPointerLock();
      else if ((document as any).webkitExitPointerLock) (document as any).webkitExitPointerLock();
      else if ((document as any).mozExitPointerLock) (document as any).mozExitPointerLock();
    }
  };

  setEnabled(enabled: boolean) {
    this.enabled = enabled;

    if (!this.enabled) this.onBlur();

    return this;
  }

  resetOrbitPivot(position: THREE.Vector3, radius?: number) {
    if (!this.enabled) return this;

    this.targetOrbitPivot.copy(position);
    this.targetOrbitRadius = Math.max(this.targetOrbitRadius, initialOrbitRadius);
    return this;
  }

  setMoveSpeed(moveSpeed: number) {
    this.moveSpeed = moveSpeed;
    return this;
  }

  setPosition(position: THREE.Vector3) {
    if (!this.enabled) return this;

    tmpVector3.x = this.orbitRadius * Math.sin(this.targetPhi) * Math.sin(this.targetTheta);
    tmpVector3.y = this.orbitRadius * Math.cos(this.targetPhi);
    tmpVector3.z = this.orbitRadius * Math.sin(this.targetPhi) * Math.cos(this.targetTheta);
    tmpVector3.applyQuaternion(tmpQuaternion.clone().inverse());
    tmpVector3.sub(position).negate();

    this.targetOrbitPivot.copy(tmpVector3);
    return this;
  }
  getPosition() { return this.camera.threeCamera.position; }

  setOrientation(orientation: { theta: number; phi: number; gamma: number; }) {
    if (!this.enabled) return this;

    this.targetTheta = orientation.theta;
    this.targetPhi = orientation.phi;
    this.targetGamma = orientation.gamma;
    return this;
  }
  getOrientation() { return { theta: this.theta, phi: this.phi, gamma: this.gamma }; }

  hasJustPanned() { return this.wantToPan && this.hasMovedWhilePanning; }

  update() {
    if (this.moveVector.length() !== 0) {
      const rotatedMoveVector = this.moveVector.clone();
      rotatedMoveVector.applyQuaternion(this.camera.threeCamera.quaternion).normalize().multiplyScalar(this.moveSpeed);
      this.camera.threeCamera.position.add(rotatedMoveVector);
      this.targetOrbitPivot.add(rotatedMoveVector);
    }

    this.orbitPivot.lerp(this.targetOrbitPivot, lerpFactor);
    this.orbitRadius += (this.targetOrbitRadius - this.orbitRadius) * lerpFactor;

    this.theta += (this.targetTheta - this.theta) * lerpFactor;
    this.phi += (this.targetPhi - this.phi) * lerpFactor;
    this.gamma += (this.targetGamma - this.gamma) * lerpFactor;

    tmpVector3.x = this.orbitRadius * Math.sin(this.phi) * Math.sin(this.theta);
    tmpVector3.y = this.orbitRadius * Math.cos(this.phi);
    tmpVector3.z = this.orbitRadius * Math.sin(this.phi) * Math.cos(this.theta);
    tmpVector3.applyQuaternion(tmpQuaternion.clone().inverse());

    this.camera.threeCamera.position.copy(this.orbitPivot).add(tmpVector3);
    this.camera.threeCamera.lookAt(this.orbitPivot);
    tmpEuler.setFromQuaternion(this.camera.threeCamera.quaternion);
    tmpEuler.z = this.gamma;
    this.camera.threeCamera.setRotationFromEuler(tmpEuler);
    this.camera.threeCamera.updateMatrixWorld(false);

    // Update marker
    if (this.orbitPivot.distanceTo(this.targetOrbitPivot) > 0.1 ||
    Math.abs(this.orbitRadius - this.targetOrbitRadius) > 0.1 || this.isOrbiting || this.wantToPan) {
      this.pivotMarker.material.opacity = 0.5;
    } else {
      this.pivotMarker.material.opacity *= 1 - lerpFactor;
    }

    this.pivotMarker.position.copy(this.orbitPivot);
    this.pivotMarker.updateMatrixWorld(false);
  }
}
