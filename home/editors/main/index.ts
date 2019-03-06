import * as path from "path";
import "./links";

let data: { room: SupCore.Data.Room; };
let socket: SocketIOClient.Socket;

const ui = {
  chatHistoryContainer: <HTMLDivElement>document.querySelector(".chat"),
  chatHistory: <HTMLOListElement>document.querySelector(".chat ol"),
  roomUsers: <HTMLUListElement>document.querySelector(".members ul")
};

function start() {
  socket = SupClient.connect(SupClient.query.project);
  socket.on("connect", onConnected);
  socket.on("disconnect", SupClient.onDisconnected);

  // Chat
  document.querySelector(".chat-input textarea").addEventListener("keydown", onChatInputKeyDown);
  document.querySelector(".chat").addEventListener("click", onLinkClicked);
}

function onConnected() {
  data = <any>{};
  // FIXME Add support in ProjectClient?
  socket.emit("sub", "rooms", "home", onRoomReceived);
  socket.on("edit:rooms", onRoomEdited);
}

function onRoomReceived(err: string, room: any) {
  data.room = new SupCore.Data.Room(room);

  for (const roomUser of data.room.pub.users) appendRoomUser(roomUser);

  for (const entry of data.room.pub.history) appendHistoryEntry(entry);
  scrollToBottom();
}

let onRoomCommands: any = {};
function onRoomEdited(id: string, command: string, ...args: any[]) {
  Object.getPrototypeOf(data.room)[`client_${command}`].apply(data.room, args);
  if (onRoomCommands[command] != null) onRoomCommands[command].apply(data.room, args);
}

function scrollToBottom() {
  setTimeout(() => { ui.chatHistoryContainer.scrollTop = ui.chatHistoryContainer.scrollHeight; }, 0);
}

// Firefox 41 loses the scroll position when going back to the tab
// so we'll manually restore it when the tab is activated
let savedScrollTop = 0;

ui.chatHistoryContainer.addEventListener("scroll", (event) => {
  savedScrollTop = ui.chatHistoryContainer.scrollTop;
});

window.addEventListener("message", (event) => {
  if (event.data.type === "activate") {
    setTimeout(() => { ui.chatHistoryContainer.scrollTop = savedScrollTop; }, 0);
  }
});

const appendDaySeparator = (date: Date) => {
  const separatorElt = document.createElement("li");
  separatorElt.className = "day-separator";

  separatorElt.appendChild(document.createElement("hr"));

  const dateDiv = document.createElement("div");
  separatorElt.appendChild(dateDiv);

  const dateInnerDiv = document.createElement("div");
  dateInnerDiv.textContent = date.toDateString();
  dateDiv.appendChild(dateInnerDiv);

  ui.chatHistory.appendChild(separatorElt);
};

let previousDay: string;
interface Entry {
  author: string;
  text: string;
  timestamp: number;
}

const addressRegex = new RegExp("^(http[s]?:\\/\\/(www\\.)?|ftp:\\/\\/(www\\.)?|www\\.){1}([0-9A-Za-z-\\.@:%_\+~#=]+)+((\\.[a-zA-Z]{2,3})+)(/(.)*)?(\\?(.)*)?");
function appendHistoryEntry(entry: Entry) {
  const date = new Date(entry.timestamp);
  const day = date.toDateString();
  if (previousDay !== day) {
    appendDaySeparator(date);
    previousDay = day;
  }

  const entryElt = document.createElement("li");

  const timestampSpan = document.createElement("span");
  timestampSpan.className = "timestamp";
  const time = `00${date.getHours()}`.slice(-2) + ":" + `00${date.getMinutes()}`.slice(-2);
  timestampSpan.textContent = time;
  entryElt.appendChild(timestampSpan);

  const authorSpan = document.createElement("span");
  authorSpan.className = "author";
  authorSpan.textContent = entry.author;
  entryElt.appendChild(authorSpan);

  const addressTest = addressRegex.exec(entry.text);
  if (addressTest != null) {
    const beforeAddress = entry.text.slice(0, addressTest.index);
    const beforeTextSpan = document.createElement("span");
    beforeTextSpan.className = "text";
    beforeTextSpan.textContent = `: ${beforeAddress}`;
    entryElt.appendChild(beforeTextSpan);

    const addressTextLink = document.createElement("a");
    addressTextLink.className = "text";
    addressTextLink.textContent = addressTest[0];
    addressTextLink.href = addressTest[0];
    entryElt.appendChild(addressTextLink);

    const afterAddress = entry.text.slice(addressTest.index + addressTest[0].length);
    const afterTextSpan = document.createElement("span");
    afterTextSpan.className = "text";
    afterTextSpan.textContent = afterAddress;
    entryElt.appendChild(afterTextSpan);

  } else {
    const textSpan = document.createElement("span");
    textSpan.className = "text";
    textSpan.textContent = `: ${entry.text}`;
    entryElt.appendChild(textSpan);
  }

  ui.chatHistory.appendChild(entryElt);
}

onRoomCommands.appendMessage = (entry: Entry) => {
  if (window.parent != null) window.parent.postMessage({ type: "chat", content: `${entry.author}: ${entry.text}` }, window.location.origin);
  appendHistoryEntry(entry);
  scrollToBottom();
};

function appendRoomUser(roomUser: { id: string; connectionCount: number; }) {
  const roomUserElt = document.createElement("li");
  roomUserElt.dataset["userId"] = roomUser.id;
  roomUserElt.textContent = roomUser.id;
  ui.roomUsers.appendChild(roomUserElt);
}

onRoomCommands.join = (roomUser: { id: string; connectionCount: number; }) => {
  if (roomUser.connectionCount === 1) appendRoomUser(roomUser);
};

onRoomCommands.leave = (roomUserId: string) => {
  if (data.room.users.byId[roomUserId] == null) {
    const roomUserElt = <HTMLLIElement>ui.roomUsers.querySelector(`li[data-user-id=${roomUserId}]`);
    roomUserElt.parentElement.removeChild(roomUserElt);
  }
};

function onChatInputKeyDown(event: any) {
  if (event.keyCode !== 13 || event.shiftKey) return;
  event.preventDefault();
  if (!socket.connected) return;

  socket.emit("edit:rooms", "home", "appendMessage", this.value, (err: string) => {
    if (err != null) { new SupClient.Dialogs.InfoDialog(err); return; }
  });

  this.value = "";
}

function onLinkClicked(event: MouseEvent) {
  const anchorElt = event.target as HTMLAnchorElement;
  if (anchorElt.tagName === "A") {
    event.preventDefault();

    if (SupApp != null) SupApp.openLink(anchorElt.href);
    else window.open(anchorElt.href, "_blank");
  }
}

SupClient.i18n.load([{ root: path.join(window.location.pathname, "../.."), name: "home" }], start);
