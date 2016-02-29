export default class Camera{
  fov = 45;
  orthographicScale = 10;

  threeCamera: THREE.OrthographicCamera|THREE.PerspectiveCamera;
  viewport = { x: 0, y: 0, width: 1, height: 1 };

  layers: number[] = [];
  depth = 0;
  nearClippingPlane = 0.1;
  farClippingPlane = 1000;

  cachedRatio: number;
  isOrthographic: boolean;
  projectionNeedsUpdate: boolean;

  constructor(root: THREE.Object3D, private canvas: HTMLCanvasElement) {
    this.setOrthographicMode(false);
    this.computeAspectRatio();
  }

  computeAspectRatio() {
    this.cachedRatio = (this.canvas.clientWidth * this.viewport.width) / (this.canvas.clientHeight * this.viewport.height);
    this.projectionNeedsUpdate = true;
    return this;
  };

  setOrthographicMode(isOrthographic: boolean) {
    this.isOrthographic = isOrthographic;

    if (this.isOrthographic) {
      this.threeCamera = new THREE.OrthographicCamera(-this.orthographicScale * this.cachedRatio / 2,
        this.orthographicScale * this.cachedRatio / 2,
        this.orthographicScale / 2, -this.orthographicScale / 2,
        this.nearClippingPlane, this.farClippingPlane);
    }
    else this.threeCamera = new THREE.PerspectiveCamera(this.fov, this.cachedRatio, this.nearClippingPlane, this.farClippingPlane);

    this.projectionNeedsUpdate = true;
    return this;
  }

  setFOV(fov: number) {
    this.fov = fov;
    if (!this.isOrthographic) this.projectionNeedsUpdate = true;
    return this;
  }

  setOrthographicScale(orthographicScale: number) {
    this.orthographicScale = orthographicScale;
    if (this.isOrthographic) {
      // NOTE: Apply immediately because it's used for ray calculation
      const orthographicCamera = this.threeCamera as THREE.OrthographicCamera;
      orthographicCamera.left = -this.orthographicScale * this.cachedRatio / 2;
      orthographicCamera.right = this.orthographicScale * this.cachedRatio / 2;
      orthographicCamera.top = this.orthographicScale / 2;
      orthographicCamera.bottom = -this.orthographicScale / 2;
      this.threeCamera.updateProjectionMatrix();
    }
    return this;
  }

  setViewport(x: number, y: number, width: number, height: number) {
    this.viewport.x = x;
    this.viewport.y = y;
    this.viewport.width = width;
    this.viewport.height = height;
    this.projectionNeedsUpdate = true;
    this.computeAspectRatio();
    return this;
  }

  setDepth(depth: number) {
    this.depth = depth;
    return this;
  }

  setNearClippingPlane(nearClippingPlane: number) {
    this.nearClippingPlane = nearClippingPlane;
    this.threeCamera.near = this.nearClippingPlane;
    this.projectionNeedsUpdate = true;
    return this;
  }

  setFarClippingPlane(farClippingPlane: number) {
    this.farClippingPlane = farClippingPlane;
    this.threeCamera.far = this.farClippingPlane;
    this.projectionNeedsUpdate = true;
    return this;
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, channels: number[]) {
    if (this.projectionNeedsUpdate) {
      this.projectionNeedsUpdate = false;

      if (this.isOrthographic) {
        let orthographicCamera = <THREE.OrthographicCamera>this.threeCamera;
        orthographicCamera.left = -this.orthographicScale * this.cachedRatio / 2;
        orthographicCamera.right = this.orthographicScale * this.cachedRatio / 2;
        orthographicCamera.top = this.orthographicScale / 2;
        orthographicCamera.bottom = -this.orthographicScale / 2;
      }
      else {
        let perspectiveCamera = <THREE.PerspectiveCamera>this.threeCamera;
        perspectiveCamera.fov = this.fov;
        perspectiveCamera.aspect = this.cachedRatio;
      }
      this.threeCamera.updateProjectionMatrix();
    }

    renderer.setViewport(
      this.viewport.x * this.canvas.width    , (1 - this.viewport.y - this.viewport.height) * this.canvas.height,
      this.viewport.width * this.canvas.width, this.viewport.height * this.canvas.height
    );

    for (let channel of channels) {
      renderer.clearDepth();
      this.threeCamera.channels.set(channel);
      renderer.render(scene, this.threeCamera);
    }
  }
}
