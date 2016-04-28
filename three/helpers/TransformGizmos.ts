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

export abstract class TransformGizmo extends THREE.Object3D {
  protected handlesRoot: THREE.Object3D;
  pickersRoot: THREE.Object3D;
  private planesRoot: THREE.Object3D;

  protected planes: { [name: string]: THREE.Mesh } = {};
  activePlane: THREE.Mesh;

  constructor() {
    super();

    this.handlesRoot = new THREE.Object3D();
    this.pickersRoot = new THREE.Object3D();
    this.planesRoot = new THREE.Object3D();

    this.add(this.handlesRoot);
    this.add(this.pickersRoot);
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
    this.initGizmos();

    // Reset Transformations
    this.traverse((child) => {
      child.channels.set(1);

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

  setupGizmo(name: string, object: THREE.Object3D, parent: THREE.Object3D, position?: [number, number, number], rotation?: [number, number, number]) {
    object.name = name;

    if (position != null) object.position.set(position[0], position[1], position[2]);
    if (rotation != null) object.rotation.set(rotation[0], rotation[1], rotation[2]);

    parent.add(object);
  }

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

  abstract initGizmos(): void;
  abstract setActivePlane(axis: string, eye: THREE.Vector3): void;
}

export class TransformGizmoTranslate extends TransformGizmo {
  initGizmos() {
    // Handles
    const geometry = new THREE.CylinderGeometry(0, 0.05, 0.2, 12, 1, false);
    const mesh = new THREE.Mesh(geometry);
    mesh.position.y = 0.5;
    mesh.updateMatrix();

    const arrowGeometry = new THREE.Geometry();
    arrowGeometry.merge(geometry, mesh.matrix);

    const lineXGeometry = new THREE.BufferGeometry();
    lineXGeometry.addAttribute("position", new THREE.Float32Attribute([ 0, 0, 0, 1, 0, 0 ], 3));
    this.setupGizmo("X", new THREE.Mesh(arrowGeometry, new GizmoMaterial({ color: 0xff0000 })), this.handlesRoot, [ 0.5, 0, 0 ], [ 0, 0, - Math.PI / 2 ]);
    this.setupGizmo("X", new THREE.Line(lineXGeometry, new GizmoLineMaterial({ color: 0xff0000 })), this.handlesRoot);

    const lineYGeometry = new THREE.BufferGeometry();
    lineYGeometry.addAttribute("position", new THREE.Float32Attribute([ 0, 0, 0, 0, 1, 0 ], 3));
    this.setupGizmo("Y", new THREE.Mesh(arrowGeometry, new GizmoMaterial({ color: 0x00ff00 })), this.handlesRoot, [ 0, 0.5, 0 ]);
    this.setupGizmo("Y", new THREE.Line(lineYGeometry, new GizmoLineMaterial({ color: 0x00ff00 })), this.handlesRoot);

    const lineZGeometry = new THREE.BufferGeometry();
    lineZGeometry.addAttribute("position", new THREE.Float32Attribute([ 0, 0, 0, 0, 0, 1 ], 3));
    this.setupGizmo("Z", new THREE.Mesh(arrowGeometry, new GizmoMaterial({ color: 0x0000ff })), this.handlesRoot, [ 0, 0, 0.5 ], [ Math.PI / 2, 0, 0 ]);
    this.setupGizmo("Z", new THREE.Line(lineZGeometry, new GizmoLineMaterial({ color: 0x0000ff })), this.handlesRoot);

    const handlePlaneGeometry = new THREE.PlaneBufferGeometry(0.29, 0.29);
    this.setupGizmo("XY", new THREE.Mesh(handlePlaneGeometry, new GizmoMaterial({ color: 0xffff00, opacity: 0.25 })), this.handlesRoot, [ 0.15, 0.15, 0 ]);
    this.setupGizmo("YZ", new THREE.Mesh(handlePlaneGeometry, new GizmoMaterial({ color: 0x00ffff, opacity: 0.25 })), this.handlesRoot, [ 0, 0.15, 0.15 ], [ 0, Math.PI / 2, 0 ]);
    this.setupGizmo("XZ", new THREE.Mesh(handlePlaneGeometry, new GizmoMaterial({ color: 0xff00ff, opacity: 0.25 })), this.handlesRoot, [ 0.15, 0, 0.15 ], [ - Math.PI / 2, 0, 0 ]);

    this.setupGizmo("XYZ", new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), new GizmoMaterial({ color: 0xffffff, opacity: 0.25 })), this.handlesRoot, [ 0, 0, 0 ], [ 0, 0, 0 ]);

    // Pickers
    this.setupGizmo("X", new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), pickerMaterial), this.pickersRoot, [ 0.6, 0, 0 ], [ 0, 0, - Math.PI / 2 ]);
    this.setupGizmo("Y", new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), pickerMaterial), this.pickersRoot, [ 0, 0.6, 0 ]);
    this.setupGizmo("Z", new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), pickerMaterial), this.pickersRoot, [ 0, 0, 0.6 ], [ Math.PI / 2, 0, 0 ]);

    this.setupGizmo("XY", new THREE.Mesh(new THREE.PlaneBufferGeometry(0.4, 0.4), pickerMaterial), this.pickersRoot, [ 0.2, 0.2, 0 ]);
    this.setupGizmo("YZ", new THREE.Mesh(new THREE.PlaneBufferGeometry(0.4, 0.4), pickerMaterial), this.pickersRoot, [ 0, 0.2, 0.2 ], [ 0, Math.PI / 2, 0 ]);
    this.setupGizmo("XZ", new THREE.Mesh(new THREE.PlaneBufferGeometry(0.4, 0.4), pickerMaterial), this.pickersRoot, [ 0.2, 0, 0.2 ], [ - Math.PI / 2, 0, 0 ]);

    this.setupGizmo("XYZ", new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), pickerMaterial), this.pickersRoot);
  }

  setActivePlane(axis: string, eye: THREE.Vector3) {
    const tempMatrix = new THREE.Matrix4();
    eye.applyMatrix4(tempMatrix.getInverse(tempMatrix.extractRotation(this.planes["XY"].matrixWorld)) );

    switch (axis) {
      case "X":
        if (Math.abs(eye.y) > Math.abs(eye.z)) this.activePlane = this.planes["XZ"];
        else this.activePlane = this.planes["XY"];
        break;
      case "Y":
        if (Math.abs(eye.x) > Math.abs(eye.z)) this.activePlane = this.planes["YZ"];
        else this.activePlane = this.planes["XY"];
        break;
      case "Z":
        if (Math.abs(eye.x) > Math.abs(eye.y)) this.activePlane = this.planes["YZ"];
        else this.activePlane = this.planes["XZ"];
        break;
      case "XYZ":
        this.activePlane = this.planes["XYZE"];
        break;
      case "XY":
      case "YZ":
      case "XZ":
        this.activePlane = this.planes[axis];
        break;
    }
  };
}

export class TransformGizmoRotate extends TransformGizmo {
  initGizmos() {
    // Handles
    const createCircleGeometry = (radius: number, facing: string, arc: number) => {
      const geometry = new THREE.BufferGeometry();
      const vertices: number[] = [];

      for (let i = 0; i <= 64 * arc; ++ i) {
        if (facing === "X") vertices.push(0, Math.cos(i / 32 * Math.PI) * radius, Math.sin(i / 32 * Math.PI) * radius);
        if (facing === "Y") vertices.push(Math.cos(i / 32 * Math.PI) * radius, 0, Math.sin(i / 32 * Math.PI) * radius);
        if (facing === "Z") vertices.push(Math.sin(i / 32 * Math.PI) * radius, Math.cos(i / 32 * Math.PI) * radius, 0);
      }

      geometry.addAttribute("position", new THREE.Float32Attribute(vertices, 3));
      return geometry;
    };

    this.setupGizmo("X", new THREE.Line(createCircleGeometry(1, "X", 0.5), new GizmoLineMaterial({ color: 0xff0000 })), this.handlesRoot);
    this.setupGizmo("Y", new THREE.Line(createCircleGeometry(1, "Y", 0.5), new GizmoLineMaterial({ color: 0x00ff00 })), this.handlesRoot);
    this.setupGizmo("Z", new THREE.Line(createCircleGeometry(1, "Z", 0.5), new GizmoLineMaterial({ color: 0x0000ff })), this.handlesRoot);
    this.setupGizmo("E", new THREE.Line(createCircleGeometry(1.25, "Z", 1), new GizmoLineMaterial({ color: 0xcccc00 })), this.handlesRoot);
    this.setupGizmo("XYZE", new THREE.Line(createCircleGeometry(1, "Z", 1), new GizmoLineMaterial({ color: 0x787878 })), this.handlesRoot);

    // Pickers
    const torusGeometry = new THREE.TorusGeometry(1, 0.12, 4, 12, Math.PI);
    this.setupGizmo("X", new THREE.Mesh(torusGeometry, pickerMaterial), this.pickersRoot, [ 0, 0, 0 ], [ 0, - Math.PI / 2, - Math.PI / 2 ]);
    this.setupGizmo("Y", new THREE.Mesh(torusGeometry, pickerMaterial), this.pickersRoot, [ 0, 0, 0 ], [ Math.PI / 2, 0, 0 ]);
    this.setupGizmo("Z", new THREE.Mesh(torusGeometry, pickerMaterial), this.pickersRoot, [ 0, 0, 0 ], [ 0, 0, - Math.PI / 2 ]);

    this.setupGizmo("E", new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.12, 2, 24), pickerMaterial), this.pickersRoot);
    // TODO
    this.setupGizmo("XYZE", new THREE.Mesh(new THREE.Geometry()), this.pickersRoot);
  }

  setActivePlane(axis: string) {
    if (axis === "X") this.activePlane = this.planes["YZ"];
    else if (axis === "Y") this.activePlane = this.planes["XZ"];
    else if (axis === "Z") this.activePlane = this.planes["XY"];
    else if (axis === "E") this.activePlane = this.planes["XYZE"];
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

export class TransformGizmoScale extends TransformGizmo {
  initGizmos() {
    // Handles
    const geometry = new THREE.BoxGeometry(0.125, 0.125, 0.125);
    const mesh = new THREE.Mesh(geometry);
    mesh.position.y = 0.5;
    mesh.updateMatrix();

    const arrowGeometry = new THREE.Geometry();
    arrowGeometry.merge(geometry, mesh.matrix);

    const lineXGeometry = new THREE.BufferGeometry();
    lineXGeometry.addAttribute("position", new THREE.Float32Attribute([ 0, 0, 0, 1, 0, 0 ], 3));
    this.setupGizmo("X", new THREE.Mesh(arrowGeometry, new GizmoMaterial({ color: 0xff0000 })), this.handlesRoot, [ 0.5, 0, 0 ], [ 0, 0, - Math.PI / 2 ]);
    this.setupGizmo("X", new THREE.Line(lineXGeometry, new GizmoLineMaterial({ color: 0xff0000 })), this.handlesRoot);

    const lineYGeometry = new THREE.BufferGeometry();
    lineYGeometry.addAttribute("position", new THREE.Float32Attribute([ 0, 0, 0, 0, 1, 0 ], 3));
    this.setupGizmo("Y", new THREE.Mesh(arrowGeometry, new GizmoMaterial({ color: 0x00ff00 })), this.handlesRoot, [ 0, 0.5, 0 ]);
    this.setupGizmo("Y", new THREE.Line(lineYGeometry, new GizmoLineMaterial({ color: 0x00ff00 })), this.handlesRoot);

    const lineZGeometry = new THREE.BufferGeometry();
    lineZGeometry.addAttribute("position", new THREE.Float32Attribute([ 0, 0, 0, 0, 0, 1 ], 3));
    this.setupGizmo("Z", new THREE.Mesh(arrowGeometry, new GizmoMaterial({ color: 0x0000ff })), this.handlesRoot, [ 0, 0, 0.5 ], [ Math.PI / 2, 0, 0 ]);
    this.setupGizmo("Z", new THREE.Line(lineZGeometry, new GizmoLineMaterial({ color: 0x0000ff })), this.handlesRoot);

    this.setupGizmo("XYZ", new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), new GizmoMaterial({ color: 0xffffff, opacity: 0.25 })), this.handlesRoot, [ 0, 0, 0 ], [ 0, 0, 0 ]);

    // Pickers
    this.setupGizmo("X", new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), pickerMaterial), this.pickersRoot, [ 0.6, 0, 0 ], [ 0, 0, - Math.PI / 2 ]);
    this.setupGizmo("Y", new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), pickerMaterial), this.pickersRoot, [ 0, 0.6, 0 ]);
    this.setupGizmo("Z", new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), pickerMaterial), this.pickersRoot, [ 0, 0, 0.6 ], [ Math.PI / 2, 0, 0 ]);

    this.setupGizmo("XYZ", new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), pickerMaterial), this.pickersRoot);
  }

  setActivePlane(axis: string, eye: THREE.Vector3) {
    const tempMatrix = new THREE.Matrix4();
    eye.applyMatrix4(tempMatrix.getInverse(tempMatrix.extractRotation(this.planes["XY"].matrixWorld)));

    if (axis === "X") {
      if (Math.abs(eye.y) > Math.abs(eye.z)) this.activePlane = this.planes["XZ"];
      else this.activePlane = this.planes["XY"];

    } else if (axis === "Y") {
      if (Math.abs(eye.x) > Math.abs(eye.z)) this.activePlane = this.planes["YZ"];
      else this.activePlane = this.planes["XY"];

    } else if (axis === "Z") {
      if (Math.abs(eye.x) > Math.abs(eye.y)) this.activePlane = this.planes["YZ"];
      else this.activePlane = this.planes["XZ"];

    } else if (axis === "XYZ") this.activePlane = this.planes["XYZE"];
  }
}
