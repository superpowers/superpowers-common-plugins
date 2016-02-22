export default class SelectionRectangleRenderer {
  private line: THREE.Line;
  private geometry: THREE.Geometry;

  constructor(root: THREE.Object3D) {
    this.geometry = new THREE.Geometry();
    for (let i = 0; i < 5; i++) this.geometry.vertices.push(new THREE.Vector3(0, 0, 0));
    const material = new THREE.LineBasicMaterial({ color: 0x000000, opacity: 1, depthTest: false, depthWrite: false, transparent: true });
    this.line = new THREE.Line(this.geometry, material);
    this.line.channels.set(1);
    root.add(this.line);
    this.line.updateMatrixWorld(false);
  }

  setSize(width: number, height: number) {
    this.geometry.vertices[0].set(-width / 2, -height / 2, 0);
    this.geometry.vertices[1].set( width / 2, -height / 2, 0);
    this.geometry.vertices[2].set( width / 2,  height / 2, 0);
    this.geometry.vertices[3].set(-width / 2,  height / 2, 0);
    this.geometry.vertices[4].set(-width / 2, -height / 2, 0);
    this.geometry.verticesNeedUpdate = true;
    this.line.visible = true;
    return this;
  }

  setPosition(x: number, y: number) {
    this.line.position.set(x, y, 0);
    this.line.updateMatrixWorld(false);
    return this;
  }

  hide() {
    this.line.visible = false;
    return this;
  }
}
