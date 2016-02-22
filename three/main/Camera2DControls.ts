import Camera from "./Camera";

// let tmpVector3 = new THREE.Vector3();

export default class Camera2DControls {
  private mousePosition = new THREE.Vector3(0, 0, 0);
  private options: SupTHREE.Camera2DControlsOptions;
  private multiplier = 1;
  private isMoving = false;

  constructor(private camera: Camera, private canvas: HTMLCanvasElement, options?: SupTHREE.Camera2DControlsOptions, private zoomCallback?: Function) {
    this.options = options != null ? options : { zoomSpeed: 1.5, zoomMin: 0.1, zoomMax: 10000 };

    canvas.addEventListener("mousedown", this.onMouseDown);
    document.addEventListener("mouseup", this.onMouseUp);
    canvas.addEventListener("mousemove", this.onMouseMove);
    canvas.addEventListener("wheel", this.onWheel);
    canvas.addEventListener("keypress", this.onKeyPress);
    canvas.addEventListener("contextmenu", (event) => { event.preventDefault(); });
  }

  setMultiplier(newMultiplier: number) {
    this.multiplier = newMultiplier;
    const newOrthographicScale = this.camera.orthographicScale * this.multiplier;
    this.changeOrthographicScale(newOrthographicScale);
  }

  private onMouseDown = (event: MouseEvent) => {
    if (event.button === 1 || (event.button === 0 && event.altKey)) this.isMoving = true;
  };

  private onMouseUp = (event: MouseEvent) => {
    if (event.button === 0 || event.button === 1) this.isMoving = false;
  };

  private onMouseMove = (event: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.mousePosition.x = (event.clientX - rect.left) / this.canvas.clientWidth * 2 - 1;
    this.mousePosition.y = -((event.clientY - rect.top) / this.canvas.clientHeight * 2 - 1);

    if (this.isMoving) {
      const cameraZ = this.camera.threeCamera.position.z;
      this.camera.threeCamera.position
        .set(-event.movementX / this.canvas.clientWidth * 2, event.movementY / this.canvas.clientHeight * 2, 0)
        .unproject(this.camera.threeCamera)
        .z = cameraZ;
      this.camera.threeCamera.updateMatrixWorld(false);
    }
  };

  private onWheel = (event: WheelEvent) => {
    let newOrthographicScale: number;
    if (event.deltaY > 0) newOrthographicScale = Math.min(this.options.zoomMax, this.camera.orthographicScale * this.multiplier * this.options.zoomSpeed);
    else if (event.deltaY < 0) newOrthographicScale = Math.max(this.options.zoomMin, this.camera.orthographicScale * this.multiplier / this.options.zoomSpeed);

    this.changeOrthographicScale(newOrthographicScale, this.mousePosition);
  };

  private onKeyPress = (event: KeyboardEvent) => {
    if (SupClient.Dialogs.BaseDialog.activeDialog != null) return;

    console.log(event.keyCode);
    if (event.keyCode === 43 /* Ctrl+Numpad+ */) {
      const newOrthographicScale = Math.max(this.options.zoomMin, this.camera.orthographicScale * this.multiplier / this.options.zoomSpeed);
      this.changeOrthographicScale(newOrthographicScale);
    }
    if (event.keyCode === 45 /* Ctrl+Numpad- */) {
      const newOrthographicScale = Math.min(this.options.zoomMax, this.camera.orthographicScale * this.multiplier * this.options.zoomSpeed);
      this.changeOrthographicScale(newOrthographicScale);
    }
  };

  private changeOrthographicScale(newOrthographicScale: number, mousePosition = { x: 0, y: 0 }) {
    const startPosition = new THREE.Vector3(mousePosition.x, mousePosition.y, 0).unproject(this.camera.threeCamera);
    this.camera.setOrthographicScale(newOrthographicScale / this.multiplier);
    const endPosition = new THREE.Vector3(mousePosition.x, mousePosition.y, 0).unproject(this.camera.threeCamera);

    this.camera.threeCamera.position.x += startPosition.x - endPosition.x;
    this.camera.threeCamera.position.y += startPosition.y - endPosition.y;
    this.camera.threeCamera.updateMatrixWorld(false);
    if (this.zoomCallback != null) this.zoomCallback();
  }
}
