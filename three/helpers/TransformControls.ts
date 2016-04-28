/**
 * https://github.com/mrdoob/three.js/blob/master/examples/js/controls/TransformControls.js
 * Rewritten in TypeScript and modified by bilou84
 */

class GizmoMaterial extends THREE.MeshBasicMaterial {
  private oldColor: THREE.Color;
  private oldOpacity: number;

  constructor(parameters: THREE.MeshBasicMaterialParameters) {
    super(parameters);

    this.depthTest = false;
    this.depthWrite = false;
    this.side = THREE.FrontSide;
    this.transparent = true;

    this.setValues(parameters);

    this.oldColor = this.color.clone();
    this.oldOpacity = this.opacity;
  }

  highlight(highlighted: boolean) {
    if (highlighted) {
      this.color.setRGB(1, 1, 0);
      this.opacity = 1;
    } else {
      this.color.copy(this.oldColor);
      this.opacity = this.oldOpacity;
    }
  }
}

class GizmoLineMaterial extends THREE.LineBasicMaterial {
  private oldColor: THREE.Color;
  private oldOpacity: number;

  constructor(parameters: THREE.LineBasicMaterialParameters) {
    super(parameters);

    this.depthTest = false;
    this.depthWrite = false;
    this.transparent = true;
    this.linewidth = 1;

    this.setValues(parameters);

    this.oldColor = this.color.clone();
    this.oldOpacity = this.opacity;
  }

  highlight(highlighted: boolean) {
    if (highlighted) {
      this.color.setRGB(1, 1, 0);
      this.opacity = 1;
    } else {
      this.color.copy(this.oldColor);
      this.opacity = this.oldOpacity;
    }
  };
};

const pickerMaterial = new GizmoMaterial({ visible: false, transparent: false });
type GizmoMap = { [name: string]: any[]; };

abstract class TransformGizmo extends THREE.Object3D {
  private handles: THREE.Object3D;
  protected handleGizmos: GizmoMap;

  pickers: THREE.Object3D;
  protected pickerGizmos: GizmoMap;

  private planesRoot: THREE.Object3D;
  protected planes: { [name: string]: THREE.Mesh } = {};
  activePlane: THREE.Mesh;

  init() {
    this.handles = new THREE.Object3D();
    this.pickers = new THREE.Object3D();
    this.planesRoot = new THREE.Object3D();

    this.add(this.handles);
    this.add(this.pickers);
    this.add(this.planesRoot);

    // Planes
    const planeGeometry = new THREE.PlaneBufferGeometry(50, 50, 2, 2);
    const planeMaterial = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });

    const planes: { [planeName: string]: THREE.Mesh; } = {
      "XY":   new THREE.Mesh(planeGeometry, planeMaterial),
      "YZ":   new THREE.Mesh(planeGeometry, planeMaterial),
      "XZ":   new THREE.Mesh(planeGeometry, planeMaterial),
      "XYZE": new THREE.Mesh(planeGeometry, planeMaterial)
    };

    this.activePlane = planes["XYZE"];

    planes["YZ"].rotation.set(0, Math.PI / 2, 0);
    planes["XZ"].rotation.set(- Math.PI / 2, 0, 0);

    for (const planeName in planes) {
      planes[planeName].name = planeName;
      this.planesRoot.add(planes[planeName]);
      this.planes[planeName] = planes[planeName];
    }

    // Handles and Pickers
    const setupGizmos = (gizmoMap: GizmoMap, parent: THREE.Object3D) => {
      for (const name in gizmoMap) {
        for (let i = gizmoMap[name].length; i > 0; i--) {

          const object = gizmoMap[name][i][0];
          const position = gizmoMap[name][i][1];
          const rotation = gizmoMap[name][i][2];

          object.name = name;

          if (position != null) object.position.set(position[0], position[1], position[2]);
          if (rotation != null) object.rotation.set(rotation[0], rotation[1], rotation[2]);

          parent.add(object);
        }
      }
    };

    setupGizmos(this.handleGizmos, this.handles);
    setupGizmos(this.pickerGizmos, this.pickers);

    // Reset Transformations
    this.traverse((child) => {
      if (child instanceof THREE.Mesh) {

        child.updateMatrix();

        const tempGeometry = child.geometry.clone();
        tempGeometry.applyMatrix(child.matrix);
        child.geometry = tempGeometry;

        child.position.set(0, 0, 0);
        child.rotation.set(0, 0, 0);
        child.scale.set(1, 1, 1);
      }
    });
  };

  highlight(axis: string) {
    this.traverse((child: any) => {
      if (child.material != null && child.material.highlight != null) {
        child.material.highlight(child.name === axis);
      }
    });
  };

  update(rotation: THREE.Euler, eye: THREE.Vector3) {
    const vec1 = new THREE.Vector3(0, 0, 0);
    const vec2 = new THREE.Vector3(0, 1, 0);
    const lookAtMatrix = new THREE.Matrix4();

    this.traverse(function(child) {
      if (child.name.search("E") !== - 1) {
        child.quaternion.setFromRotationMatrix(lookAtMatrix.lookAt(eye, vec1, vec2));
      } else if (child.name.search("X") !== - 1 || child.name.search("Y") !== - 1 || child.name.search("Z") !== - 1) {
        child.quaternion.setFromEuler(rotation);
      }
    });
  }

  abstract setActivePlane(axis: string, eye: THREE.Vector3): void;
}

class TransformGizmoTranslate extends TransformGizmo {
  constructor() {
    super();

    const geometry = new THREE.CylinderGeometry(0, 0.05, 0.2, 12, 1, false);
    const mesh = new THREE.Mesh(geometry);
    mesh.position.y = 0.5;
    mesh.updateMatrix();

    const arrowGeometry = new THREE.Geometry();
    arrowGeometry.merge(geometry, mesh.matrix);

    const lineXGeometry = new THREE.BufferGeometry();
    lineXGeometry.addAttribute("position", new THREE.Float32Attribute([ 0, 0, 0, 1, 0, 0 ], 3));

    const lineYGeometry = new THREE.BufferGeometry();
    lineYGeometry.addAttribute("position", new THREE.Float32Attribute([ 0, 0, 0, 0, 1, 0 ], 3));

    const lineZGeometry = new THREE.BufferGeometry();
    lineZGeometry.addAttribute("position", new THREE.Float32Attribute([ 0, 0, 0, 0, 0, 1 ], 3));

    this.handleGizmos = {
      X: [
        [ new THREE.Mesh(arrowGeometry, new GizmoMaterial({ color: 0xff0000 })), [ 0.5, 0, 0 ], [ 0, 0, - Math.PI / 2 ] ],
        [ new THREE.Line(lineXGeometry, new GizmoLineMaterial({ color: 0xff0000 })) ]
      ],
      Y: [
        [ new THREE.Mesh(arrowGeometry, new GizmoMaterial({ color: 0x00ff00 })), [ 0, 0.5, 0 ] ],
        [  new THREE.Line(lineYGeometry, new GizmoLineMaterial({ color: 0x00ff00 })) ]
      ],
      Z: [
        [ new THREE.Mesh(arrowGeometry, new GizmoMaterial({ color: 0x0000ff })), [ 0, 0, 0.5 ], [ Math.PI / 2, 0, 0 ] ],
        [ new THREE.Line(lineZGeometry, new GizmoLineMaterial({ color: 0x0000ff })) ]
      ],
      XYZ: [
        [ new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), new GizmoMaterial({ color: 0xffffff, opacity: 0.25 })), [ 0, 0, 0 ], [ 0, 0, 0 ] ]
      ],
      XY: [
        [ new THREE.Mesh(new THREE.PlaneBufferGeometry(0.29, 0.29), new GizmoMaterial({ color: 0xffff00, opacity: 0.25 })), [ 0.15, 0.15, 0 ] ]
      ],
      YZ: [
        [ new THREE.Mesh(new THREE.PlaneBufferGeometry(0.29, 0.29), new GizmoMaterial({ color: 0x00ffff, opacity: 0.25 })), [ 0, 0.15, 0.15 ], [ 0, Math.PI / 2, 0 ] ]
      ],
      XZ: [
        [ new THREE.Mesh(new THREE.PlaneBufferGeometry(0.29, 0.29), new GizmoMaterial({ color: 0xff00ff, opacity: 0.25 })), [ 0.15, 0, 0.15 ], [ - Math.PI / 2, 0, 0 ] ]
      ]
    };

    this.pickerGizmos = {
      X: [
        [ new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), pickerMaterial), [ 0.6, 0, 0 ], [ 0, 0, - Math.PI / 2 ] ]
      ],
      Y: [
        [ new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), pickerMaterial), [ 0, 0.6, 0 ] ]
      ],
      Z: [
        [ new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), pickerMaterial), [ 0, 0, 0.6 ], [ Math.PI / 2, 0, 0 ] ]
      ],
      XYZ: [
        [ new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), pickerMaterial) ]
      ],
      XY: [
        [ new THREE.Mesh(new THREE.PlaneBufferGeometry(0.4, 0.4), pickerMaterial), [ 0.2, 0.2, 0 ] ]
      ],
      YZ: [
        [ new THREE.Mesh(new THREE.PlaneBufferGeometry(0.4, 0.4), pickerMaterial), [ 0, 0.2, 0.2 ], [ 0, Math.PI / 2, 0 ] ]
      ],
      XZ: [
        [ new THREE.Mesh(new THREE.PlaneBufferGeometry(0.4, 0.4), pickerMaterial), [ 0.2, 0, 0.2 ], [ - Math.PI / 2, 0, 0 ] ]
      ]
    };

    this.init();
  }

  setActivePlane(axis: string, eye: THREE.Vector3) {
    const tempMatrix = new THREE.Matrix4();
    eye.applyMatrix4(tempMatrix.getInverse(tempMatrix.extractRotation(this.planes["XY"].matrixWorld)) );

    if (axis === "X") {
      this.activePlane = this.planes["XY"];
      if (Math.abs(eye.y) > Math.abs(eye.z)) this.activePlane = this.planes["XZ"];
    }

    if (axis === "Y") {
      this.activePlane = this.planes["XY"];
      if (Math.abs(eye.x) > Math.abs(eye.z)) this.activePlane = this.planes["YZ"];
    }

    if (axis === "Z") {
      this.activePlane = this.planes["XZ"];
      if (Math.abs(eye.x) > Math.abs(eye.y)) this.activePlane = this.planes["YZ"];
    }

    if (axis === "XYZ") this.activePlane = this.planes["XYZE"];
    if (axis === "XY") this.activePlane = this.planes["XY"];
    if (axis === "YZ") this.activePlane = this.planes["YZ"];
    if (axis === "XZ") this.activePlane = this.planes["XZ"];
  };
}

class TransformGizmoRotate extends TransformGizmo {
  constructor() {
    super();

    const createCircleGeometry = (radius: number, facing: string, arc: number) => {
      const geometry = new THREE.BufferGeometry();
      const vertices: number[] = [];
      arc = arc ? arc : 1;

      for (let i = 0; i <= 64 * arc; ++ i) {
        if (facing === "x") vertices.push(0, Math.cos(i / 32 * Math.PI) * radius, Math.sin(i / 32 * Math.PI) * radius);
        if (facing === "y") vertices.push(Math.cos(i / 32 * Math.PI) * radius, 0, Math.sin(i / 32 * Math.PI) * radius);
        if (facing === "z") vertices.push(Math.sin(i / 32 * Math.PI) * radius, Math.cos(i / 32 * Math.PI) * radius, 0);
      }

      geometry.addAttribute("position", new THREE.Float32Attribute(vertices, 3));
      return geometry;
    };

    this.handleGizmos = {
      X: [
        [ new THREE.Line(createCircleGeometry(1, "x", 0.5), new GizmoLineMaterial({ color: 0xff0000 })) ]
      ],
      Y: [
        [ new THREE.Line(createCircleGeometry(1, "y", 0.5), new GizmoLineMaterial({ color: 0x00ff00 })) ]
      ],
      Z: [
        [ new THREE.Line(createCircleGeometry(1, "z", 0.5), new GizmoLineMaterial({ color: 0x0000ff })) ]
      ],
      E: [
        [ new THREE.Line(createCircleGeometry(1.25, "z", 1), new GizmoLineMaterial({ color: 0xcccc00 })) ]
      ],
      XYZE: [
        [ new THREE.Line(createCircleGeometry(1, "z", 1), new GizmoLineMaterial({ color: 0x787878 })) ]
      ]
    };

    this.pickerGizmos = {
      X: [
        [ new THREE.Mesh(new THREE.TorusGeometry(1, 0.12, 4, 12, Math.PI), pickerMaterial), [ 0, 0, 0 ], [ 0, - Math.PI / 2, - Math.PI / 2 ] ]
      ],
      Y: [
        [ new THREE.Mesh(new THREE.TorusGeometry(1, 0.12, 4, 12, Math.PI), pickerMaterial), [ 0, 0, 0 ], [ Math.PI / 2, 0, 0 ] ]
      ],
      Z: [
        [ new THREE.Mesh(new THREE.TorusGeometry(1, 0.12, 4, 12, Math.PI), pickerMaterial), [ 0, 0, 0 ], [ 0, 0, - Math.PI / 2 ] ]
      ],
      E: [
        [ new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.12, 2, 24), pickerMaterial) ]
      ],
      XYZE: [
        [ new THREE.Mesh(new THREE.Geometry()) ]// TODO
      ]
    };

    this.init();
  }

  setActivePlane(axis: string) {
    if (axis === "E") this.activePlane = this.planes[ "XYZE" ];
    if (axis === "X") this.activePlane = this.planes[ "YZ" ];
    if (axis === "Y") this.activePlane = this.planes[ "XZ" ];
    if (axis === "Z") this.activePlane = this.planes[ "XY" ];
  }

  update(rotation: THREE.Euler, eye2: THREE.Vector3) {
    super.update(rotation, eye2);

    const tempMatrix = new THREE.Matrix4();
    const worldRotation = new THREE.Euler(0, 0, 1);
    const tempQuaternion = new THREE.Quaternion();
    const unitX = new THREE.Vector3(1, 0, 0);
    const unitY = new THREE.Vector3(0, 1, 0);
    const unitZ = new THREE.Vector3(0, 0, 1);
    const quaternionX = new THREE.Quaternion();
    const quaternionY = new THREE.Quaternion();
    const quaternionZ = new THREE.Quaternion();
    const eye = eye2.clone();

    worldRotation.copy(this.planes["XY"].rotation);
    tempQuaternion.setFromEuler(worldRotation);

    tempMatrix.makeRotationFromQuaternion(tempQuaternion).getInverse(tempMatrix);
    eye.applyMatrix4(tempMatrix);

    this.traverse((child) => {
      tempQuaternion.setFromEuler(worldRotation);

      if (child.name === "X") {
        quaternionX.setFromAxisAngle(unitX, Math.atan2(- eye.y, eye.z));
        tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionX);
        child.quaternion.copy(tempQuaternion);
      }

      if (child.name === "Y") {
        quaternionY.setFromAxisAngle(unitY, Math.atan2(eye.x, eye.z));
        tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionY);
        child.quaternion.copy(tempQuaternion);
      }

      if (child.name === "Z") {
        quaternionZ.setFromAxisAngle(unitZ, Math.atan2(eye.y, eye.x));
        tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionZ);
        child.quaternion.copy(tempQuaternion);
      }
    });
  }
}

class TransformGizmoScale extends TransformGizmo {
  constructor() {
    super();

    const geometry = new THREE.BoxGeometry(0.125, 0.125, 0.125);
    const mesh = new THREE.Mesh(geometry);
    mesh.position.y = 0.5;
    mesh.updateMatrix();

    const arrowGeometry = new THREE.Geometry();
    arrowGeometry.merge(geometry, mesh.matrix);

    const lineXGeometry = new THREE.BufferGeometry();
    lineXGeometry.addAttribute("position", new THREE.Float32Attribute([ 0, 0, 0,  1, 0, 0 ], 3));

    const lineYGeometry = new THREE.BufferGeometry();
    lineYGeometry.addAttribute("position", new THREE.Float32Attribute([ 0, 0, 0,  0, 1, 0 ], 3));

    const lineZGeometry = new THREE.BufferGeometry();
    lineZGeometry.addAttribute("position", new THREE.Float32Attribute([ 0, 0, 0,  0, 0, 1 ], 3));

    this.handleGizmos = {
      X: [
        [ new THREE.Mesh(arrowGeometry, new GizmoMaterial({ color: 0xff0000 })), [ 0.5, 0, 0 ], [ 0, 0, - Math.PI / 2 ] ],
        [ new THREE.Line(lineXGeometry, new GizmoLineMaterial({ color: 0xff0000 })) ]
      ],
      Y: [
        [ new THREE.Mesh(arrowGeometry, new GizmoMaterial({ color: 0x00ff00 })), [ 0, 0.5, 0 ] ],
        [ new THREE.Line(lineYGeometry, new GizmoLineMaterial({ color: 0x00ff00 })) ]
      ],
      Z: [
        [ new THREE.Mesh(arrowGeometry, new GizmoMaterial({ color: 0x0000ff })), [ 0, 0, 0.5 ], [ Math.PI / 2, 0, 0 ] ],
        [ new THREE.Line(lineZGeometry, new GizmoLineMaterial({ color: 0x0000ff })) ]
      ],
      XYZ: [
        [ new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.125, 0.125), new GizmoMaterial({ color: 0xffffff, opacity: 0.25 })) ]
      ]
    };

    this.pickerGizmos = {
      X: [
        [ new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), pickerMaterial), [ 0.6, 0, 0 ], [ 0, 0, - Math.PI / 2 ] ]
      ],
      Y: [
        [ new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), pickerMaterial), [ 0, 0.6, 0 ] ]
      ],
      Z: [
        [ new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), pickerMaterial), [ 0, 0, 0.6 ], [ Math.PI / 2, 0, 0 ] ]
      ],
      XYZ: [
        [ new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), pickerMaterial) ]
      ]

    };

    this.init();
  }

  setActivePlane(axis: string, eye: THREE.Vector3) {
    const tempMatrix = new THREE.Matrix4();
    eye.applyMatrix4(tempMatrix.getInverse(tempMatrix.extractRotation(this.planes["XY"].matrixWorld)) );

    if (axis === "X") {
      this.activePlane = this.planes["XY"];
      if (Math.abs(eye.y) > Math.abs(eye.z)) this.activePlane = this.planes["XZ"];
    }

    if (axis === "Y") {
      this.activePlane = this.planes["XY"];
      if (Math.abs(eye.x) > Math.abs(eye.z)) this.activePlane = this.planes["YZ"];
    }

    if (axis === "Z") {
      this.activePlane = this.planes["XZ"];
      if (Math.abs(eye.x) > Math.abs(eye.y)) this.activePlane = this.planes["YZ"];
    }

    if (axis === "XYZ") this.activePlane = this.planes["XYZE"];
  }
}

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
  private size = 1;
  private axis: string;

  private object: THREE.Object3D;
  private mode = "translate";
  private space = "world";
  private dragging = false;
  private gizmo: { [name: string]: TransformGizmo; } = {
    "translate": new TransformGizmoTranslate(),
    "rotate": new TransformGizmoRotate(),
    "scale": new TransformGizmoScale()
  };

  private changeEvent = { type: "change", target: null as any };
  private mouseDownEvent = { type: "mouseDown", target: null as any };
  private mouseUpEvent = { type: "mouseUp", mode: this.mode, target: null as any };
  private objectChangeEvent = { type: "objectChange", target: null as any };

  constructor(private camera: THREE.Camera, private domElement: HTMLElement) {
    super();

    for (const type in this.gizmo) {
      const gizmoObj = this.gizmo[type];
      gizmoObj.visible = (type === this.mode);
      this.add(gizmoObj);
    }

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
  }

  dispose() {
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
  }

  attach(object: THREE.Object3D) {
    this.object = object;
    this.visible = true;
    this.update();
  };

  detach() {
    this.object = null;
    this.visible = false;
    this.axis = null;
  };

  getMode() { return this.mode; };

  setMode(mode: string) {
    this.mode = mode;
    if (mode === "scale") this.space = "local";

    for (const type in this.gizmo) this.gizmo[type].visible = (type === mode);

    this.update();
    this.dispatchEvent(this.changeEvent);
  };

  setSize(size: number) {
    this.size = size;
    this.update();
    this.dispatchEvent(this.changeEvent);

  };

  setSpace(space: string) {
    this.space = space;
    this.update();
    this.dispatchEvent(this.changeEvent);

  };

update() {
    if (this.object === null) return;

    this.object.updateMatrixWorld(false);
    worldPosition.setFromMatrixPosition(this.object.matrixWorld);

    // NOTE: Workaround for negative scales messing with extracted rotation — elisee
    const scaleX = this.object.scale.x / Math.abs(this.object.scale.x);
    const scaleY = this.object.scale.y / Math.abs(this.object.scale.y);
    const scaleZ = this.object.scale.z / Math.abs(this.object.scale.z);
    const negativeScaleFixMatrix = new THREE.Matrix4().makeScale(scaleX, scaleY, scaleZ);
    worldRotation.setFromRotationMatrix(tempMatrix.extractRotation(this.object.matrixWorld).multiply(negativeScaleFixMatrix));

    this.camera.updateMatrixWorld(false);
    camPosition.setFromMatrixPosition(this.camera.matrixWorld);
    camRotation.setFromRotationMatrix(tempMatrix.extractRotation(this.camera.matrixWorld));

    const scale = worldPosition.distanceTo(camPosition) / 6 * this.size;
    this.position.copy(worldPosition);
    this.scale.set(scale, scale, scale);

    eye.copy(camPosition).sub(worldPosition).normalize();

    if (this.space === "local") this.gizmo[this.mode].update(worldRotation, eye);
    else if (this.space === "world") this.gizmo[this.mode].update(new THREE.Euler(), eye);

    this.gizmo[this.mode].highlight(this.axis);
  };

  onPointerDown = (event: MouseEvent|TouchEvent) => {
    if (this.object == null || this.dragging || ((event as MouseEvent).button != null && (event as MouseEvent).button !== 0)) return;

    const pointer: MouseEvent = (event as any).changedTouches ? (event as any).changedTouches[ 0 ] : event;

    if (pointer.button === 0 || pointer.button == null) {
      const intersect = this.intersectObjects(pointer, this.gizmo[this.mode].pickers.children);

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
          oldPosition.copy(this.object.position);
          oldScale.copy(this.object.scale);

          oldRotationMatrix.extractRotation(this.object.matrix);
          worldRotationMatrix.extractRotation(this.object.matrixWorld);

          parentRotationMatrix.extractRotation(this.object.parent.matrixWorld);
          parentScale.setFromMatrixScale(tempMatrix.getInverse(this.object.parent.matrixWorld));

          offset.copy(planeIntersect.point);
        }
      }
    }

    this.dragging = true;
  };

  onPointerHover = (event: MouseEvent|TouchEvent) => {
    if (this.object == null || this.dragging || ((event as MouseEvent).button != null && (event as MouseEvent).button !== 0)) return;

    const pointer: MouseEvent = (event as any).changedTouches ? (event as any).changedTouches[ 0 ] : event;

    let newAxis: string;
    const intersect = this.intersectObjects(pointer, this.gizmo[this.mode].pickers.children);

    if (intersect != null) {
      newAxis = intersect.object.name;
      event.preventDefault();
    }

    if (this.axis !== newAxis) {
      this.axis = newAxis;
      this.update();
      this.dispatchEvent(this.changeEvent);
    }
  };

  onPointerMove = (event: MouseEvent|TouchEvent) => {
    if (this.object == null || this.axis == null || !this.dragging || ((event as MouseEvent).button != null && (event as MouseEvent).button !== 0)) return;

    const pointer: MouseEvent = (event as any).changedTouches ? (event as any).changedTouches[ 0 ] : event;

    const planeIntersect = this.intersectObjects(pointer, [ this.gizmo[this.mode].activePlane ]);
    if (planeIntersect == null) return;

    event.preventDefault();
    event.stopPropagation();

    point.copy(planeIntersect.point);

    if (this.mode === "translate") {
      point.sub(offset);
      point.multiply(parentScale);

      if (this.space === "local") {
        point.applyMatrix4(tempMatrix.getInverse(worldRotationMatrix));

        if (this.axis.search("X") === - 1) point.x = 0;
        if (this.axis.search("Y") === - 1) point.y = 0;
        if (this.axis.search("Z") === - 1) point.z = 0;

        point.applyMatrix4(oldRotationMatrix);

        this.object.position.copy(oldPosition);
        this.object.position.add(point);
      }

      if (this.space === "world" || this.axis.search("XYZ") !== - 1) {
        if (this.axis.search("X") === - 1) point.x = 0;
        if (this.axis.search("Y") === - 1) point.y = 0;
        if (this.axis.search("Z") === - 1) point.z = 0;

        point.applyMatrix4(tempMatrix.getInverse(parentRotationMatrix));

        this.object.position.copy(oldPosition);
        this.object.position.add(point);
      }

      if (this.translationSnap !== null) {
        if (this.space === "local") this.object.position.applyMatrix4(tempMatrix.getInverse(worldRotationMatrix));

        if (this.axis.search("X") !== - 1) this.object.position.x = Math.round(this.object.position.x / this.translationSnap) * this.translationSnap;
        if (this.axis.search("Y") !== - 1) this.object.position.y = Math.round(this.object.position.y / this.translationSnap) * this.translationSnap;
        if (this.axis.search("Z") !== - 1) this.object.position.z = Math.round(this.object.position.z / this.translationSnap) * this.translationSnap;

        if (this.space === "local") this.object.position.applyMatrix4(worldRotationMatrix);
      }

    } else if (this.mode === "scale") {
      point.sub(offset);
      point.multiply(parentScale);

      if (this.space === "local") {
        if (this.axis === "XYZ") {
          const scale = 1 + ( (point.y) / Math.max(oldScale.x, oldScale.y, oldScale.z));

          this.object.scale.x = oldScale.x * scale;
          this.object.scale.y = oldScale.y * scale;
          this.object.scale.z = oldScale.z * scale;
        } else {
          point.applyMatrix4(tempMatrix.getInverse(worldRotationMatrix));

          if (this.axis === "X") this.object.scale.x = oldScale.x * (1 + point.x / oldScale.x);
          if (this.axis === "Y") this.object.scale.y = oldScale.y * (1 + point.y / oldScale.y);
          if (this.axis === "Z") this.object.scale.z = oldScale.z * (1 + point.z / oldScale.z);
        }
      }

    } else if (this.mode === "rotate") {
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

        this.object.quaternion.copy(tempQuaternion);

      } else if (this.axis === "XYZE") {
        quaternionE.setFromEuler(point.clone().cross(tempVector).normalize() as any); // rotation axis

        tempQuaternion.setFromRotationMatrix(tempMatrix.getInverse(parentRotationMatrix));
        quaternionX.setFromAxisAngle(quaternionE as any, - point.clone().angleTo(tempVector));
        quaternionXYZ.setFromRotationMatrix(worldRotationMatrix);

        tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionX);
        tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionXYZ);

        this.object.quaternion.copy(tempQuaternion);

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

        this.object.quaternion.copy(quaternionXYZ);

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

        this.object.quaternion.copy(tempQuaternion);
      }
    }

    this.update();
    this.dispatchEvent(this.changeEvent);
    this.dispatchEvent(this.objectChangeEvent);
  };

  onPointerUp = (event: MouseEvent) => {
    if (event.button != null && event.button !== 0) return;

    if (this.dragging && (this.axis !== null)) {
      this.mouseUpEvent.mode = this.mode;
      this.dispatchEvent(this.mouseUpEvent);
    }

    this.dragging = false;
    this.onPointerHover(event);
  };

  intersectObjects(pointer: MouseEvent, objects: THREE.Object3D[]) {
    const rect = this.domElement.getBoundingClientRect();
    const x = (pointer.clientX - rect.left) / rect.width;
    const y = (pointer.clientY - rect.top) / rect.height;

    pointerVector.set((x * 2) - 1, - (y * 2) + 1);
    ray.setFromCamera(pointerVector, this.camera);

    const intersections = ray.intersectObjects(objects, true);
    return intersections[0];
  }
}
