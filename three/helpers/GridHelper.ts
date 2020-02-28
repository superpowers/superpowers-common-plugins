export default class GridHelper {
  private gridHelper: THREE.GridHelper;

  constructor(private root: THREE.Object3D, size: number, step: number, opacity: number = 0.25) {
    this.setup(size, step, opacity);
  }

  setup(size: number, step: number, opacity: number) {
    if (this.gridHelper != null) {
      this.root.remove(this.gridHelper);
      this.gridHelper.geometry.dispose();
      this.gridHelper.material.dispose();
    }

    const divisions = Math.ceil(size / step);
    const actualSize = divisions * step;

    this.gridHelper = new THREE.GridHelper(actualSize, divisions, 0xffffff, 0xffffff);
    this.gridHelper.material.transparent = true;
    this.gridHelper.material.opacity = opacity;

    this.root.add(this.gridHelper);
    this.gridHelper.updateMatrixWorld(false);

    return this;
  }

  setVisible(visible: boolean) {
    this.gridHelper.visible = visible;
    return this;
  }
}
