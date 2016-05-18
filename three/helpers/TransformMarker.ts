export default class TransformMarker {
  private line: THREE.LineSegments;

  constructor(root: THREE.Object3D) {
    const geometry = new THREE.Geometry();
    geometry.vertices.push(
      new THREE.Vector3( -0.25, 0, 0 ), new THREE.Vector3(  0.25, 0, 0 ),
      new THREE.Vector3( 0, -0.25, 0 ), new THREE.Vector3( 0,  0.25, 0 ),
      new THREE.Vector3( 0, 0, -0.25 ), new THREE.Vector3( 0, 0,  0.25 )
    );

    this.line = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.25, transparent: true }));
    this.line.layers.set(1);
    root.add(this.line);
    this.line.updateMatrixWorld(false);
  }

  move(target: THREE.Object3D) {
    this.line.visible = true;
    this.line.position.copy(target.getWorldPosition());
    this.line.quaternion.copy(target.getWorldQuaternion());
    this.line.updateMatrixWorld(false);
    return this;
  }

  hide() {
    this.line.visible = false;
    return this;
  }
}
