export default class SelectionBoxRenderer {
  private mesh: THREE.Mesh;
  private target: THREE.Object3D;

  constructor(root: THREE.Object3D) {
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.BackSide }));
    root.add(this.mesh);
  }

  setTarget(target: THREE.Object3D) {
    this.target = target;
    this.mesh.visible = true;
    this.move();
    this.resize();
    return this;
  }

  move() {
    this.mesh.position.copy(this.target.getWorldPosition());
    this.mesh.quaternion.copy(this.target.getWorldQuaternion());
    this.mesh.updateMatrixWorld(false);
    return this;
  }

  resize() {
    const vec = new THREE.Vector3();
    const box = new THREE.Box3();
    const inverseTargetMatrixWorld = new THREE.Matrix4().compose(this.target.getWorldPosition(), this.target.getWorldQuaternion(), { x: 1, y: 1, z: 1 } as THREE.Vector3);

    inverseTargetMatrixWorld.getInverse(inverseTargetMatrixWorld);

    this.target.traverse((node: THREE.Mesh) => {
      const geometry = node.geometry;

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

    const size = box.size();
    const thickness = 0.15;
    this.mesh.scale.copy(size).add(new THREE.Vector3(thickness, thickness, thickness));
    this.mesh.updateMatrixWorld(false);
    return this;
  }

  hide() {
    this.mesh.visible = false;
    return this;
  }
}
