import * as path from "path";

let data: {};
let socket: SocketIOClient.Socket;

const ui = {
};

function start() {
  socket = SupClient.connect(SupClient.query.project);
  socket.on("connect", onConnected);
  socket.on("disconnect", SupClient.onDisconnected);

  // UI
}

function onConnected() {
  data = {};

  // FIXME: Request list of trashed assets for restoration... can we know where they were in the hierarchy? or would that require some changes?
  // socket.emit("sub", ...);
}

SupClient.i18n.load([{ root: path.join(window.location.pathname, "../.."), name: "recycleBin" }], start);
