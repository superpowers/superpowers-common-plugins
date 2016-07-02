import { EventEmitter } from "events";

const storageKey = "superpowers.common.textEditorWidget";

const item = window.localStorage.getItem(storageKey);
export let pub: {
  formatVersion: number;
  keyMap: string;
  theme: string;
  [key: string]: any;
} = item != null ? JSON.parse(item) : {
  formatVersion: 2,
  keyMap: "sublime",
  theme: "default"
};

if (pub.formatVersion === 1) {
  pub.formatVersion = 2;
  edit("theme", "default");
}

export const emitter = new EventEmitter();

window.addEventListener("storage", (event) => {
  if (event.key !== storageKey) return;

  const oldPub = pub;
  pub = JSON.parse(event.newValue);

  if (oldPub.keyMap !== pub.keyMap) emitter.emit("keyMap");
  if (oldPub.theme !== pub.theme) emitter.emit("theme");
});

export function edit(key: string, value: any) {
  pub[key] = value;
  window.localStorage.setItem(storageKey, JSON.stringify(pub));
}
