/**
 * https://github.com/mrdoob/three.js/blob/master/examples/js/controls/TransformControls.js
 * Rewritten in TypeScript and modified by bilou84
 */

import { TransformGizmo, TransformGizmoTranslate, TransformGizmoRotate, TransformGizmoScale, TransformGizmoResize } from "./TransformGizmos";

const ray = new THREE.Raycaster();
const pointerVector = new THREE.Vector2();

const point = new THREE.Vector3();
const offset = new THREE.Vector3();

const rotation = new THREE.Vector3();
const offsetRotation = new THREE.Vector3();

const lookAtMatrix = new THREE.Matrix4();
const eye = new THREE.Vector3();

const tempMatrix = new THREE.Matrix4();
const tempVector = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion();
const unitX = new THREE.Vector3(1, 0, 0);
const unitY = new THREE.Vector3(0, 1, 0);
const unitZ = new THREE.Vector3(0, 0, 1);

const quaternionXYZ = new THREE.Quaternion();
const quaternionX = new THREE.Quaternion();
const quaternionY = new THREE.Quaternion();
const quaternionZ = new THREE.Quaternion();
const quaternionE = new THREE.Quaternion();

const oldPosition = new THREE.Vector3();
const oldScale = new THREE.Vector3();
const oldRotationMatrix = new THREE.Matrix4();

const parentRotationMatrix  = new THREE.Matrix4();
const parentScale = new THREE.Vector3();

const worldPosition = new THREE.Vector3();
const worldRotation = new THREE.Euler();
const worldRotationMatrix  = new THREE.Matrix4();
const camPosition = new THREE.Vector3();
const camRotation = new THREE.Euler();

export default class TransformControls extends THREE.Object3D {
  visible = false;
  translationSnap: number;
  rotationSnap: number;
  root = new THREE.Object3D();

  private target: THREE.Object3D;
  private externVisible = true;
  private size = 1;
  private axis: string;
  private mode: "translate"|"rotate"|"scale"|"resize" = "translate";
  private space = "local";
  private dragging = false;
  private disabled = true;
  private gizmo: { [name: string]: TransformGizmo; } = {
    "translate": new TransformGizmoTranslate(),
    "rotate": new TransformGizmoRotate(),
    "scale": new TransformGizmoScale(),
    "resize": new TransformGizmoResize()
  };

  private changeEvent = { type: "change", target: null as any };
  private mouseDownEvent = { type: "mouseDown", target: null as any };
  private mouseUpEvent = { type: "mouseUp", mode: this.mode, target: null as any };
  private objectChangeEvent = { type: "objectChange", target: null as any };

  constructor(scene: THREE.Scene, private camera: SupTHREE.Camera, private domElement: HTMLElement) {
    super();

    scene.add(this);
    scene.add(this.root);

    for (const type in this.gizmo) {
      const gizmoObj = this.gizmo[type];
      gizmoObj.visible = (type === this.mode);
      this.add(gizmoObj);
    }

    this.enable();
  }

  dispose() {
    this.disable();
  }

  setVisible(visible: boolean) {
    this.externVisible = visible;
    this.visible = this.externVisible && this.target != null;
    return this;
  }

  attach(object: THREE.Object3D) {
    this.target = object;
    this.visible = this.externVisible;
    this.update();
    return this;
  }

  detach() {
    this.target = null;
    this.visible = false;
    this.axis = null;
    return this;
  }

  getMode() { return this.mode; }

  setMode(mode: "translate"|"rotate"|"scale"|"resize") {
    this.mode = mode;

    for (const type in this.gizmo) this.gizmo[type].visible = (type === mode);

    if (this.target == null) return this;
    this.update();
    this.dispatchEvent(this.changeEvent);
    return this;
  }

  setSize(size: number) {
    this.size = size;
    if (this.target == null) return this;

    this.update();
    this.dispatchEvent(this.changeEvent);
    return this;
  }

  setSpace(space: string) {
    this.space = space;
    if (this.target == null) return this;

    this.update();
    this.dispatchEvent(this.changeEvent);
    return this;
  }

  enable() {
    if (!this.disabled) return this;

    this.domElement.addEventListener("mousedown", this.onPointerDown, false);
    this.domElement.addEventListener("touchstart", this.onPointerDown, false);

    this.domElement.addEventListener("mousemove", this.onPointerHover, false);
    this.domElement.addEventListener("touchmove", this.onPointerHover, false);

    this.domElement.addEventListener("mousemove", this.onPointerMove, false);
    this.domElement.addEventListener("touchmove", this.onPointerMove, false);

    this.domElement.addEventListener("mouseup", this.onPointerUp, false);
    this.domElement.addEventListener("mouseout", this.onPointerUp, false);
    this.domElement.addEventListener("touchend", this.onPointerUp, false);
    this.domElement.addEventListener("touchcancel", this.onPointerUp, false);
    this.domElement.addEventListener("touchleave", this.onPointerUp, false);

    this.dragging = false;
    this.disabled = false;
    for (const gizmoName in this.gizmo) this.gizmo[gizmoName].setDisabled(false);

    return this;
  }

  disable() {
    if (this.disabled) return this;

    this.domElement.removeEventListener("mousedown", this.onPointerDown);
    this.domElement.removeEventListener("touchstart", this.onPointerDown);

    this.domElement.removeEventListener("mousemove", this.onPointerHover);
    this.domElement.removeEventListener("touchmove", this.onPointerHover);

    this.domElement.removeEventListener("mousemove", this.onPointerMove);
    this.domElement.removeEventListener("touchmove", this.onPointerMove);

    this.domElement.removeEventListener("mouseup", this.onPointerUp);
    this.domElement.removeEventListener("mouseout", this.onPointerUp);
    this.domElement.removeEventListener("touchend", this.onPointerUp);
    this.domElement.removeEventListener("touchcancel", this.onPointerUp);
    this.domElement.removeEventListener("touchleave", this.onPointerUp);

    this.dragging = false;
    this.disabled = true;
    for (const gizmoName in this.gizmo) this.gizmo[gizmoName].setDisabled(true);

    return this;
  }

  update(copyTarget = true) {
    if (this.target == null) return;

    if (copyTarget) {
      this.root.position.copy(this.target.getWorldPosition());
      this.root.quaternion.copy(this.target.getWorldQuaternion());

      const width = this.target.userData.width;
      const height = this.target.userData.height;
      const depth = this.target.userData.depth;

      if (this.mode === "resize") {
        this.root.scale.x = Math.abs(width);
        this.root.scale.y = Math.abs(height);
        this.root.scale.z = Math.abs(depth);
      } else {
        this.root.scale.x = (width < 0 ? -1 : 1) * this.target.scale.x;
        this.root.scale.y = (height < 0 ? -1 : 1) * this.target.scale.y;
        this.root.scale.z = (depth < 0 ? -1 : 1) * this.target.scale.z;
      }
    }
    this.root.updateMatrixWorld(false);
    worldPosition.setFromMatrixPosition(this.root.matrixWorld);

    // NOTE: Workaround for negative scales messing with extracted rotation — elisee
    const scaleX = this.root.scale.x / Math.abs(this.root.scale.x);
    const scaleY = this.root.scale.y / Math.abs(this.root.scale.y);
    const scaleZ = this.root.scale.z / Math.abs(this.root.scale.z);
    const negativeScaleFixMatrix = new THREE.Matrix4().makeScale(scaleX, scaleY, scaleZ);
    worldRotation.setFromRotationMatrix(tempMatrix.extractRotation(this.root.matrixWorld).multiply(negativeScaleFixMatrix));

    this.camera.threeCamera.updateMatrixWorld(false);
    camPosition.setFromMatrixPosition(this.camera.threeCamera.matrixWorld);
    camRotation.setFromRotationMatrix(tempMatrix.extractRotation(this.camera.threeCamera.matrixWorld));

    const scale = worldPosition.distanceTo(camPosition) / 8 * this.size;
    this.position.copy(worldPosition);
    this.scale.set(scale, scale, scale);

    eye.copy(camPosition).sub(worldPosition).normalize();

    if (this.space === "local" || this.mode === "scale" || this.mode === "resize") this.gizmo[this.mode].update(worldRotation, eye);
    else if (this.space === "world") this.gizmo[this.mode].update(new THREE.Euler(), eye);

    if (!this.disabled) this.gizmo[this.mode].highlight(this.axis);

    this.updateMatrixWorld(true);
  }

  private onPointerDown = (event: MouseEvent|TouchEvent) => {
    if (this.target == null || this.dragging || ((event as MouseEvent).button != null && (event as MouseEvent).button !== 0) || event.altKey) return;

    const pointer: MouseEvent = (event as any).changedTouches ? (event as any).changedTouches[ 0 ] : event;

    if (pointer.button === 0 || pointer.button == null) {
      const intersect = this.intersectObjects(pointer, this.gizmo[this.mode].pickersRoot.children);

      if (intersect != null) {
        event.preventDefault();
        event.stopPropagation();

        this.dispatchEvent(this.mouseDownEvent);
        this.axis = intersect.object.name;
        this.update();

        eye.copy(camPosition).sub(worldPosition).normalize();

        this.gizmo[this.mode].setActivePlane(this.axis, eye);

        const planeIntersect = this.intersectObjects(pointer, [ this.gizmo[this.mode].activePlane ]);

        if (planeIntersect != null) {
          oldPosition.copy(this.root.position);
          oldScale.copy(this.root.scale);

          oldRotationMatrix.extractRotation(this.root.matrix);
          worldRotationMatrix.extractRotation(this.root.matrixWorld);

          parentRotationMatrix.extractRotation(this.root.parent.matrixWorld);
          parentScale.setFromMatrixScale(tempMatrix.getInverse(this.root.parent.matrixWorld));

          offset.copy(planeIntersect.point);
        }
      }
    }

    this.dragging = true;
  }

  private onPointerHover = (event: MouseEvent|TouchEvent) => {
    if (this.target == null || this.dragging || ((event as MouseEvent).button != null && (event as MouseEvent).button !== 0)) return;

    const pointer: MouseEvent = (event as any).changedTouches ? (event as any).changedTouches[ 0 ] : event;

    let newAxis: string;
    const intersect = this.intersectObjects(pointer, this.gizmo[this.mode].pickersRoot.children);

    if (intersect != null) {
      newAxis = intersect.object.name;
      event.preventDefault();
    }

    if (this.axis !== newAxis) {
      this.axis = newAxis;
      this.update();
      this.dispatchEvent(this.changeEvent);
    }
  }

  private onPointerMove = (event: MouseEvent|TouchEvent) => {
    if (this.target == null || this.axis == null || !this.dragging || ((event as MouseEvent).button != null && (event as MouseEvent).button !== 0)) return;

    const pointer: MouseEvent = (event as any).changedTouches ? (event as any).changedTouches[ 0 ] : event;

    const planeIntersect = this.intersectObjects(pointer, [ this.gizmo[this.mode].activePlane ]);
    if (planeIntersect == null) return;

    event.preventDefault();
    event.stopPropagation();

    point.copy(planeIntersect.point);

    switch (this.mode) {
      case "translate": {
        point.sub(offset);
        point.multiply(parentScale);

        if (this.space === "local") {
          point.applyMatrix4(tempMatrix.getInverse(worldRotationMatrix));

          if (this.axis.search("X") === -1) point.x = 0;
          if (this.axis.search("Y") === -1) point.y = 0;
          if (this.axis.search("Z") === -1) point.z = 0;

          point.applyMatrix4(oldRotationMatrix);

          this.root.position.copy(oldPosition);
          this.root.position.add(point);
        }

        if (this.space === "world" || this.axis.search("XYZ") !== -1) {
          if (this.axis.search("X") === -1) point.x = 0;
          if (this.axis.search("Y") === -1) point.y = 0;
          if (this.axis.search("Z") === -1) point.z = 0;

          point.applyMatrix4(tempMatrix.getInverse(parentRotationMatrix));

          this.root.position.copy(oldPosition);
          this.root.position.add(point);
        }

        if (this.translationSnap !== null) {
          if (this.space === "local") this.root.position.sub(worldPosition).applyMatrix4(tempMatrix.getInverse(worldRotationMatrix));

          if (this.axis.search("X") !== -1) this.root.position.x = Math.round(this.root.position.x / this.translationSnap) * this.translationSnap;
          if (this.axis.search("Y") !== -1) this.root.position.y = Math.round(this.root.position.y / this.translationSnap) * this.translationSnap;
          if (this.axis.search("Z") !== -1) this.root.position.z = Math.round(this.root.position.z / this.translationSnap) * this.translationSnap;

          if (this.space === "local") this.root.position.applyMatrix4(worldRotationMatrix).add(worldPosition);
        }
      } break;

      case "scale": {
        point.sub(offset);
        point.multiply(parentScale);

        if (this.axis === "XYZ") {
          const scale = 1 + ( (point.y) / Math.max(oldScale.x, oldScale.y, oldScale.z));

          this.root.scale.x = oldScale.x * scale;
          this.root.scale.y = oldScale.y * scale;
          this.root.scale.z = oldScale.z * scale;
        } else {
          point.applyMatrix4(tempMatrix.getInverse(worldRotationMatrix));

          if (this.axis === "X") this.root.scale.x = oldScale.x * (1 + point.x / oldScale.x);
          if (this.axis === "Y") this.root.scale.y = oldScale.y * (1 + point.y / oldScale.y);
          if (this.axis === "Z") this.root.scale.z = oldScale.z * (1 + point.z / oldScale.z);
        }
      } break;

      case "resize": {
        point.sub(offset);
        point.multiply(parentScale);

        const multiplier = 16;

        if (this.axis === "XYZ") {
          const scale = 1 + ( (point.y) / Math.max(oldScale.x, oldScale.y, oldScale.z) * multiplier);

          this.root.scale.x = oldScale.x * scale;
          this.root.scale.y = oldScale.y * scale;
          this.root.scale.z = oldScale.z * scale;
        } else {
          point.applyMatrix4(tempMatrix.getInverse(worldRotationMatrix));

          if (this.axis === "X") this.root.scale.x = oldScale.x * (1 + point.x / oldScale.x * multiplier);
          if (this.axis === "Y") this.root.scale.y = oldScale.y * (1 + point.y / oldScale.y * multiplier);
          if (this.axis === "Z") this.root.scale.z = oldScale.z * (1 + point.z / oldScale.z * multiplier);
        }

        this.root.scale.x = Math.round(Math.max(1, this.root.scale.x));
        this.root.scale.y = Math.round(Math.max(1, this.root.scale.y));
        this.root.scale.z = Math.round(Math.max(1, this.root.scale.z));
      } break;

      case "rotate": {
        point.sub(worldPosition);
        point.multiply(parentScale);
        tempVector.copy(offset).sub(worldPosition);
        tempVector.multiply(parentScale);

        if (this.axis === "E") {
          point.applyMatrix4(tempMatrix.getInverse(lookAtMatrix));
          tempVector.applyMatrix4(tempMatrix.getInverse(lookAtMatrix));

          rotation.set(Math.atan2(point.z, point.y), Math.atan2(point.x, point.z), Math.atan2(point.y, point.x));
          offsetRotation.set(Math.atan2(tempVector.z, tempVector.y), Math.atan2(tempVector.x, tempVector.z), Math.atan2(tempVector.y, tempVector.x));

          tempQuaternion.setFromRotationMatrix(tempMatrix.getInverse(parentRotationMatrix));

          quaternionE.setFromAxisAngle(eye, rotation.z - offsetRotation.z);
          quaternionXYZ.setFromRotationMatrix(worldRotationMatrix);

          tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionE);
          tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionXYZ);

          this.root.quaternion.copy(tempQuaternion);

        } else if (this.axis === "XYZE") {
          quaternionE.setFromEuler(point.clone().cross(tempVector).normalize() as any); // rotation axis

          tempQuaternion.setFromRotationMatrix(tempMatrix.getInverse(parentRotationMatrix));
          quaternionX.setFromAxisAngle(quaternionE as any, - point.clone().angleTo(tempVector));
          quaternionXYZ.setFromRotationMatrix(worldRotationMatrix);

          tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionX);
          tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionXYZ);

          this.root.quaternion.copy(tempQuaternion);

        } else if (this.space === "local") {
          point.applyMatrix4(tempMatrix.getInverse(worldRotationMatrix));

          tempVector.applyMatrix4(tempMatrix.getInverse(worldRotationMatrix));

          rotation.set(Math.atan2(point.z, point.y), Math.atan2(point.x, point.z), Math.atan2(point.y, point.x));
          offsetRotation.set(Math.atan2(tempVector.z, tempVector.y), Math.atan2(tempVector.x, tempVector.z), Math.atan2(tempVector.y, tempVector.x));

          quaternionXYZ.setFromRotationMatrix(oldRotationMatrix);

          if (this.rotationSnap !== null) {
            quaternionX.setFromAxisAngle(unitX, Math.round( (rotation.x - offsetRotation.x) / this.rotationSnap) * this.rotationSnap);
            quaternionY.setFromAxisAngle(unitY, Math.round( (rotation.y - offsetRotation.y) / this.rotationSnap) * this.rotationSnap);
            quaternionZ.setFromAxisAngle(unitZ, Math.round( (rotation.z - offsetRotation.z) / this.rotationSnap) * this.rotationSnap);
          } else {
            quaternionX.setFromAxisAngle(unitX, rotation.x - offsetRotation.x);
            quaternionY.setFromAxisAngle(unitY, rotation.y - offsetRotation.y);
            quaternionZ.setFromAxisAngle(unitZ, rotation.z - offsetRotation.z);
          }

          if (this.axis === "X") quaternionXYZ.multiplyQuaternions(quaternionXYZ, quaternionX);
          if (this.axis === "Y") quaternionXYZ.multiplyQuaternions(quaternionXYZ, quaternionY);
          if (this.axis === "Z") quaternionXYZ.multiplyQuaternions(quaternionXYZ, quaternionZ);

          this.root.quaternion.copy(quaternionXYZ);

        } else if (this.space === "world") {
          rotation.set(Math.atan2(point.z, point.y), Math.atan2(point.x, point.z), Math.atan2(point.y, point.x));
          offsetRotation.set(Math.atan2(tempVector.z, tempVector.y), Math.atan2(tempVector.x, tempVector.z), Math.atan2(tempVector.y, tempVector.x));

          tempQuaternion.setFromRotationMatrix(tempMatrix.getInverse(parentRotationMatrix));

          if (this.rotationSnap !== null) {
            quaternionX.setFromAxisAngle(unitX, Math.round( (rotation.x - offsetRotation.x) / this.rotationSnap) * this.rotationSnap);
            quaternionY.setFromAxisAngle(unitY, Math.round( (rotation.y - offsetRotation.y) / this.rotationSnap) * this.rotationSnap);
            quaternionZ.setFromAxisAngle(unitZ, Math.round( (rotation.z - offsetRotation.z) / this.rotationSnap) * this.rotationSnap);
          } else {
            quaternionX.setFromAxisAngle(unitX, rotation.x - offsetRotation.x);
            quaternionY.setFromAxisAngle(unitY, rotation.y - offsetRotation.y);
            quaternionZ.setFromAxisAngle(unitZ, rotation.z - offsetRotation.z);
          }

          quaternionXYZ.setFromRotationMatrix(worldRotationMatrix);

          if (this.axis === "X") tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionX);
          if (this.axis === "Y") tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionY);
          if (this.axis === "Z") tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionZ);

          tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionXYZ);

          this.root.quaternion.copy(tempQuaternion);
        }
      } break;
    }

    this.update(false);
    this.dispatchEvent(this.changeEvent);
    this.dispatchEvent(this.objectChangeEvent);
  }

  private onPointerUp = (event: MouseEvent) => {
    if (event.button != null && event.button !== 0 || event.altKey) return;

    if (this.dragging && (this.axis !== null)) {
      this.mouseUpEvent.mode = this.mode;
      this.dispatchEvent(this.mouseUpEvent);
    }

    this.dragging = false;
    this.onPointerHover(event);
  }

  private intersectObjects(pointer: MouseEvent, objects: THREE.Object3D[]) {
    const rect = this.domElement.getBoundingClientRect();
    const viewport = this.camera.getViewport();

    pointerVector.x =  ((pointer.clientX - rect.left) / rect.width * 2 - 1) / viewport.width;
    pointerVector.y = -((pointer.clientY - rect.top) / rect.height * 2 - 1) / viewport.height;
    ray.setFromCamera(pointerVector, this.camera.threeCamera);

    const intersections = ray.intersectObjects(objects, true);
    return intersections[0];
  }
}
