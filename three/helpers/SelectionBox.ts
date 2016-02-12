export default class SelectionBox {
  private line: THREE.LineSegments;
  private geometry: THREE.Geometry;
  private target: THREE.Object3D;

  constructor(root: THREE.Object3D) {
    this.geometry = new THREE.Geometry();
    for (let i = 0; i < 24; i++) this.geometry.vertices.push(new THREE.Vector3(0, 0, 0));
    this.line = new THREE.LineSegments(this.geometry, new THREE.LineBasicMaterial({ color: 0x00ffff, opacity: 1, depthTest: false, depthWrite: false, transparent: true }));
    this.line.channels.set(1);
    root.add(this.line);
    this.line.updateMatrixWorld(false);
  }

  setTarget(target: THREE.Object3D) {
    this.target = target;
    this.line.visible = true;
    this.move();
    this.resize();
    return this;
  }

  move() {
    this.line.position.copy(this.target.getWorldPosition());
    this.line.quaternion.copy(this.target.getWorldQuaternion());
    this.line.updateMatrixWorld(false);
    return this;
  }

  resize() {
    const vec = new THREE.Vector3();
    const box = new THREE.Box3();
    const inverseTargetMatrixWorld = new THREE.Matrix4().compose(this.target.getWorldPosition(), this.target.getWorldQuaternion(), <THREE.Vector3>{ x: 1, y: 1, z: 1 });

    inverseTargetMatrixWorld.getInverse(inverseTargetMatrixWorld);

    this.target.traverse((node) => {
      const geometry: THREE.Geometry|THREE.BufferGeometry = (node as any).geometry;

      if (geometry != null) {
        node.updateMatrixWorld(false);

        if (geometry instanceof THREE.Geometry) {
          const vertices = geometry.vertices;

          for (let i = 0, il = vertices.length; i < il; i++) {
            vec.copy(vertices[i]).applyMatrix4(node.matrixWorld).applyMatrix4(inverseTargetMatrixWorld);
            box.expandByPoint(vec);
          }

        } else if (geometry instanceof THREE.BufferGeometry && (geometry.attributes as any)["position"] != null) {
          const positions: Float32Array = (geometry.attributes as any)["position"].array;

          for (let i = 0, il = positions.length; i < il; i += 3) {
            vec.set(positions[i], positions[i + 1], positions[i + 2]);
            vec.applyMatrix4(node.matrixWorld).applyMatrix4(inverseTargetMatrixWorld);
            box.expandByPoint(vec);
          }
        }
      }
    });

    const min = box.min;
    const max = box.max;

    // Front
    this.geometry.vertices[0].set(max.x, min.y, min.z);
    this.geometry.vertices[1].set(min.x, min.y, min.z);
    this.geometry.vertices[2].set(min.x, min.y, min.z);
    this.geometry.vertices[3].set(min.x, max.y, min.z);
    this.geometry.vertices[4].set(min.x, max.y, min.z);
    this.geometry.vertices[5].set(max.x, max.y, min.z);
    this.geometry.vertices[6].set(max.x, max.y, min.z);
    this.geometry.vertices[7].set(max.x, min.y, min.z);

    // Back
    this.geometry.vertices[8].set( min.x, max.y, max.z);
    this.geometry.vertices[9].set( max.x, max.y, max.z);
    this.geometry.vertices[10].set(max.x, max.y, max.z);
    this.geometry.vertices[11].set(max.x, min.y, max.z);
    this.geometry.vertices[12].set(max.x, min.y, max.z);
    this.geometry.vertices[13].set(min.x, min.y, max.z);
    this.geometry.vertices[14].set(min.x, min.y, max.z);
    this.geometry.vertices[15].set(min.x, max.y, max.z);

    // Lines
    this.geometry.vertices[16].set(max.x, min.y, min.z);
    this.geometry.vertices[17].set(max.x, min.y, max.z);
    this.geometry.vertices[18].set(max.x, max.y, min.z);
    this.geometry.vertices[19].set(max.x, max.y, max.z);
    this.geometry.vertices[20].set(min.x, max.y, min.z);
    this.geometry.vertices[21].set(min.x, max.y, max.z);
    this.geometry.vertices[22].set(min.x, min.y, min.z);
    this.geometry.vertices[23].set(min.x, min.y, max.z);

    this.geometry.verticesNeedUpdate = true;
    return this;
  }

  hide() {
    this.line.visible = false;
    return this;
  }
}
