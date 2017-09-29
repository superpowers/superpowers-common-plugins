import GridHelper from "./GridHelper";
import SelectionBoxRenderer from "./SelectionBoxRenderer";
import TransformControls from "./TransformControls";
import TransformMarker from "./TransformMarker";
import { GizmoMaterial } from "./TransformGizmos";

(global as any).SupTHREE.GridHelper = GridHelper;
(global as any).SupTHREE.SelectionBoxRenderer = SelectionBoxRenderer;
(global as any).SupTHREE.TransformControls = TransformControls;
(global as any).SupTHREE.TransformMarker = TransformMarker;
(global as any).SupTHREE.GizmoMaterial = GizmoMaterial;
