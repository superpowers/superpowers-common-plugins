export default class GridHelper {
  private gridHelper: THREE.GridHelper;

  constructor(private root: THREE.Object3D, size: number, step: number) {
    this.setup(size, step);
  }

  setup(size: number, step: number) {
    if (this.gridHelper != null) {
      this.root.remove(this.gridHelper);
      this.gridHelper.geometry.dispose();
      this.gridHelper.material.dispose();
    }

    const actualSize = Math.ceil(size / step) * step;

    this.gridHelper = new THREE.GridHelper(actualSize, step);
    this.gridHelper.color1.setRGB(1, 1, 1);
    this.gridHelper.color2.setRGB(1, 1, 1);
    this.gridHelper.material.transparent = true;
    this.gridHelper.material.opacity = 0.25;

    this.root.add(this.gridHelper);
    this.gridHelper.updateMatrixWorld(false);

    return this;
  }

  setVisible(visible: boolean) {
    this.gridHelper.visible = visible;
    return this;
  }
}
