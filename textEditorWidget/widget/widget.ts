import TextEditorSettingsResource from "../data/TextEditorSettingsResource";
import * as textEditorUserSettings from "../data/textEditorUserSettings";

import * as OT from "operational-transform";

/* tslint:disable */
(<any>window).CodeMirror = require("codemirror");
require("codemirror/addon/search/search");
require("codemirror/addon/search/searchcursor");
require("codemirror/addon/edit/closebrackets");
require("codemirror/addon/comment/comment");
require("codemirror/addon/hint/show-hint");
require("codemirror/addon/selection/active-line");
require("codemirror/addon/fold/foldcode");
require("codemirror/addon/fold/foldgutter");
require("codemirror/addon/fold/brace-fold");
require("codemirror/addon/fold/comment-fold");
require("codemirror/addon/fold/indent-fold");

require("codemirror/keymap/sublime");
require("codemirror/keymap/emacs");
require("codemirror/keymap/vim");
/* tslint:enable */

class TextEditorWidget {
  private textEditorResource: TextEditorSettingsResource;
  codeMirrorInstance: CodeMirror.EditorFromTextArea;

  private editCallback: EditCallback;
  private sendOperationCallback: SendOperationCallback;

  clientId: string;
  private tmpCodeMirrorDoc = new CodeMirror.Doc("");
  private texts: string[] = [];

  private undoTimeout: number;
  private undoStack: OT.TextOperation[] = [];
  private undoQuantityByAction: number[] = [];
  private redoStack: OT.TextOperation[] = [];
  private redoQuantityByAction: number[] = [];

  private sentOperation: OT.TextOperation;
  private pendingOperation: OT.TextOperation;

  private useSoftTab = true;

  private linkElt = SupClient.html("link", { parent: document.head, rel: "stylesheet" });

  constructor(projectClient: SupClient.ProjectClient, clientId: string, textArea: HTMLTextAreaElement, options: TextEditorWidgetOptions) {
    const extraKeys: { [name: string]: string|Function|boolean } = {
      "F9": () => { /* Disable line re-ordering */ },
      "Ctrl-T": false,
      "Tab": (cm: any) => {
        if (cm.getSelection() !== "") cm.execCommand("indentMore");
        else {
          if (this.useSoftTab) cm.execCommand("insertSoftTab");
          else cm.execCommand("insertTab");
        }
      },
      "Ctrl-Z": () => { this.undo(); },
      "Cmd-Z": () => { this.undo(); },
      "Shift-Ctrl-Z": () => { this.redo(); },
      "Shift-Cmd-Z": () => { this.redo(); },
      "Ctrl-Y": () => { this.redo(); },
      "Cmd-Y": () => { this.redo(); },
      "Alt-F": "findPersistent"
    };
    if (options.extraKeys != null) {
      for (const keyName in options.extraKeys) {
        extraKeys[keyName] = options.extraKeys[keyName];
      }
    }

    this.editCallback = options.editCallback;
    this.sendOperationCallback = options.sendOperationCallback;

    this.codeMirrorInstance = CodeMirror.fromTextArea(textArea, {
      lineNumbers: true,
      gutters: ["line-error-gutter", "CodeMirror-linenumbers", "CodeMirror-foldgutter"],
      indentWithTabs: false, indentUnit: 2, tabSize: 2,
      extraKeys: extraKeys,
      keyMap: textEditorUserSettings.pub.keyMap,
      viewportMargin: Infinity,
      mode: options.mode,
      readOnly: true
    });

    this.updateTheme();

    this.codeMirrorInstance.setOption("matchBrackets", true);
    this.codeMirrorInstance.setOption("styleActiveLine", true);
    this.codeMirrorInstance.setOption("autoCloseBrackets", true);
    this.codeMirrorInstance.setOption("foldGutter", true);

    this.codeMirrorInstance.on("changes", <any>this.edit);
    this.codeMirrorInstance.on("beforeChange", this.beforeChange);

    this.setupAppMenu();

    this.clientId = clientId;
    projectClient.subResource("textEditorSettings", this);

    textEditorUserSettings.emitter.addListener("keyMap", () => {
      this.codeMirrorInstance.setOption("keyMap", textEditorUserSettings.pub.keyMap);
    });

    textEditorUserSettings.emitter.addListener("theme", () => {
      this.updateTheme();
    });
  }

  private setupAppMenu() {
    if (SupApp == null) return;

    const menu = SupApp.createMenu();
    menu.append(SupApp.createMenuItem({
      label: SupClient.i18n.t("common:actions.cut"),
      accelerator: "CmdOrCtrl+X",
      click: () => { document.execCommand("cut"); }
    }));
    menu.append(SupApp.createMenuItem({
      label: SupClient.i18n.t("common:actions.copy"),
      accelerator: "CmdOrCtrl+C",
      click: () => { document.execCommand("copy"); }
    }));
    menu.append(SupApp.createMenuItem({
      label: SupClient.i18n.t("common:actions.paste"),
      accelerator: "CmdOrCtrl+V",
      click: () => { document.execCommand("paste"); }
    }));

    const win = SupApp.getCurrentWindow();

    this.codeMirrorInstance.getWrapperElement().addEventListener("contextmenu", (event) => {
      event.preventDefault();
      menu.popup(win);
      return false;
    });
  }

  private updateTheme() {
    if (textEditorUserSettings.pub.theme === "default") {
      this.linkElt.href = "";
      this.codeMirrorInstance.setOption("theme", textEditorUserSettings.pub.theme);
    } else {
      this.linkElt.href = `../../../../common/textEditorWidget/codemirror/theme/${textEditorUserSettings.pub.theme}.css`;
      this.codeMirrorInstance.setOption("theme", textEditorUserSettings.pub.theme);
    }
  }

  setText(text: string) {
    this.undoStack.length = 0;
    this.undoQuantityByAction.length = 0; this.undoQuantityByAction.push(0);
    this.redoStack.length = 0;
    this.redoQuantityByAction.length = 0; this.redoQuantityByAction.push(0);

    this.codeMirrorInstance.getDoc().setValue(text);
    this.codeMirrorInstance.setOption("readOnly", false);

    this.codeMirrorInstance.focus();
  }

  beforeChange = (instance: CodeMirror.Editor, change: any) => {
    if (change.origin === "setValue" || change.origin === "network") return;
    const lastText = instance.getDoc().getValue();
    if (lastText !== this.texts[this.texts.length - 1]) this.texts.push(lastText);
  };

  edit = (instance: CodeMirror.Editor, changes: CodeMirror.EditorChange[]) => {
    if (this.editCallback != null)
      this.editCallback(this.codeMirrorInstance.getDoc().getValue(), (<any>changes[0]).origin);

    let undoRedo = false;
    let operationToSend: OT.TextOperation;
    for (let changeIndex = 0; changeIndex < changes.length; changeIndex++) {
      const change = changes[changeIndex];

      // Modification from an other person
      if (change.origin === "setValue" || change.origin === "network") continue;

      this.tmpCodeMirrorDoc.setValue(this.texts[changeIndex]);

      const operation = new OT.TextOperation(this.clientId);
      for (let line = 0; line < change.from.line; line++) operation.retain(this.tmpCodeMirrorDoc.getLine(line).length + 1);
      operation.retain(change.from.ch);

      let offset = 0;
      if (change.removed.length !== 1 || change.removed[0] !== "") {
        for (let index = 0; index < change.removed.length; index++) {
          const text = change.removed[index];
          if (index !== 0) {
            operation.delete("\n");
            offset += 1;
          }

          operation.delete(text);
          offset += text.length;
        }
      }

      if (change.text.length !== 1 || change.text[0] !== "") {
        for (let index = 0; index < change.text.length; index++) {
          if (index !== 0) operation.insert("\n");
          operation.insert(change.text[index]);
        }
      }

      const beforeLength = (operation.ops[0].attributes.amount != null) ? operation.ops[0].attributes.amount : 0;
      operation.retain(this.tmpCodeMirrorDoc.getValue().length - beforeLength - offset);

      if (operationToSend == null) operationToSend = operation.clone();
      else operationToSend = operationToSend.compose(operation);

      if (change.origin === "undo" || change.origin === "redo") undoRedo = true;
    }

    this.texts.length = 0;
    if (operationToSend == null) return;

    if (!undoRedo) {
      if (this.undoTimeout != null) {
        clearTimeout(this.undoTimeout);
        this.undoTimeout = null;
      }

      this.undoStack.push(operationToSend.clone().invert());
      this.undoQuantityByAction[this.undoQuantityByAction.length - 1] += 1;
      if (this.undoQuantityByAction[this.undoQuantityByAction.length - 1] > 20) this.undoQuantityByAction.push(0);
      else {
        this.undoTimeout = window.setTimeout(() => {
          this.undoTimeout = null;
          this.undoQuantityByAction.push(0);
        }, 500);
      }

      this.redoStack.length = 0;
      this.redoQuantityByAction.length = 0;
    }

    if (this.sentOperation == null) {
      this.sendOperationCallback(operationToSend.serialize());

      this.sentOperation = operationToSend;
    } else {
      if (this.pendingOperation != null) this.pendingOperation = this.pendingOperation.compose(operationToSend);
      else this.pendingOperation = operationToSend;
    }
  };

  receiveEditText(operationData: OperationData) {
    if (this.clientId === operationData.userId) {
      if (this.pendingOperation != null) {
        this.sendOperationCallback(this.pendingOperation.serialize());

        this.sentOperation = this.pendingOperation;
        this.pendingOperation = null;
      } else this.sentOperation = null;
      return;
    }

    // Transform operation and local changes
    let operation = new OT.TextOperation();
    operation.deserialize(operationData);

    if (this.sentOperation != null) {
      [this.sentOperation, operation] = this.sentOperation.transform(operation);

      if (this.pendingOperation != null) [this.pendingOperation, operation] = this.pendingOperation.transform(operation);
    }
    this.undoStack = transformStack(this.undoStack, operation);
    this.redoStack = transformStack(this.redoStack, operation);

    this.applyOperation(operation.clone(), "network", false);
  }

  applyOperation(operation: OT.TextOperation, origin: string, moveCursor: boolean) {
    let cursorPosition = 0;
    let line = 0;
    for (const op of operation.ops) {
      switch (op.type) {
        case "retain": {
          while (true) {
            if (op.attributes.amount <= this.codeMirrorInstance.getDoc().getLine(line).length - cursorPosition) break;

            op.attributes.amount -= this.codeMirrorInstance.getDoc().getLine(line).length + 1 - cursorPosition;
            cursorPosition = 0;
            line++;
          }

          cursorPosition += op.attributes.amount;
        }
        break;

        case "insert": {
          const cursor = this.codeMirrorInstance.getDoc().getCursor();

          const texts = op.attributes.text.split("\n");
          for (let textIndex = 0; textIndex < texts.length; textIndex++) {
            let text = texts[textIndex];
            if (textIndex !== texts.length - 1) text += "\n";
            (<any>this.codeMirrorInstance).replaceRange(text, { line, ch: cursorPosition }, null, origin);
            cursorPosition += text.length;

            if (textIndex !== texts.length - 1) {
              cursorPosition = 0;
              line++;
            }
          }

          if (line === cursor.line && cursorPosition === cursor.ch) {
            if (!operation.gotPriority(this.clientId)) {
              for (let i = 0; i < op.attributes.text.length; i++) (<any>this.codeMirrorInstance).execCommand("goCharLeft");
            }
          }

          if (moveCursor) (<any>this.codeMirrorInstance).setCursor(line, cursorPosition);
          // use this way insted ? this.codeMirrorInstance.getDoc().setCursor({ line, ch: cursorPosition });
        }
        break;

        case "delete": {
          const texts = op.attributes.text.split("\n");

          for (let textIndex = 0; textIndex < texts.length; textIndex++) {
            const text = texts[textIndex];
            if (texts[textIndex + 1] != null) (<any>this.codeMirrorInstance).replaceRange("", { line, ch: cursorPosition }, { line: line + 1, ch: 0 }, origin);
            else (<any>this.codeMirrorInstance).replaceRange("", { line, ch: cursorPosition }, { line, ch: cursorPosition + text.length }, origin);

            if (moveCursor) (<any>this.codeMirrorInstance).setCursor(line, cursorPosition);
          }
          break;
        }
      }
    }
  }

  undo() {
    if (this.undoStack.length === 0) return;

    if (this.undoQuantityByAction[this.undoQuantityByAction.length - 1] === 0) this.undoQuantityByAction.pop();
    const undoQuantityByAction = this.undoQuantityByAction[this.undoQuantityByAction.length - 1];

    for (let i = 0; i < undoQuantityByAction; i++) {
      const operationToUndo = this.undoStack[this.undoStack.length - 1];
      this.applyOperation(operationToUndo.clone(), "undo", true);

      this.undoStack.pop();
      this.redoStack.push(operationToUndo.invert());
    }

    if (this.undoTimeout != null) {
      clearTimeout(this.undoTimeout);
      this.undoTimeout = null;
    }

    this.redoQuantityByAction.push(this.undoQuantityByAction[this.undoQuantityByAction.length - 1]);
    this.undoQuantityByAction[this.undoQuantityByAction.length - 1] = 0;
  }

  redo() {
    if (this.redoStack.length === 0) return;

    const redoQuantityByAction = this.redoQuantityByAction[this.redoQuantityByAction.length - 1];
    for (let i = 0; i < redoQuantityByAction; i++) {
      const operationToRedo = this.redoStack[this.redoStack.length - 1];
      this.applyOperation(operationToRedo.clone(), "undo", true);

      this.redoStack.pop();
      this.undoStack.push(operationToRedo.invert());
    }

    if (this.undoTimeout != null) {
      clearTimeout(this.undoTimeout);
      this.undoTimeout = null;

      this.undoQuantityByAction.push(this.redoQuantityByAction[this.redoQuantityByAction.length - 1]);
    }
    else this.undoQuantityByAction[this.undoQuantityByAction.length - 1] = this.redoQuantityByAction[this.redoQuantityByAction.length - 1];

    this.undoQuantityByAction.push(0);
    this.redoQuantityByAction.pop();
  }

  clear() {
    if (this.undoTimeout != null) clearTimeout(this.undoTimeout);
  }

  onResourceReceived = (resourceId: string, resource: TextEditorSettingsResource) => {
    this.textEditorResource = resource;

    this.codeMirrorInstance.setOption("tabSize", resource.pub.tabSize);
    this.codeMirrorInstance.setOption("indentUnit", resource.pub.tabSize);
    this.codeMirrorInstance.setOption("indentWithTabs", !resource.pub.softTab);
    this.useSoftTab = resource.pub.softTab;
  };

  onResourceEdited = (resourceId: string, command: string, propertyName: string) => {
    switch(propertyName) {
      case "tabSize":
        this.codeMirrorInstance.setOption("tabSize", this.textEditorResource.pub.tabSize);
        this.codeMirrorInstance.setOption("indentUnit", this.textEditorResource.pub.tabSize);
        break;
      case "softTab":
        this.useSoftTab = this.textEditorResource.pub.softTab;
        this.codeMirrorInstance.setOption("indentWithTabs", !this.textEditorResource.pub.softTab);
        break;
    }
  };
}
export = TextEditorWidget;

function transformStack(stack: OT.TextOperation[], operation: OT.TextOperation) {
  if (stack.length === 0) return stack;

  const newStack: OT.TextOperation[] = [];
  for (let i = stack.length - 1; i > 0; i--) {
    const pair = stack[i].transform(operation);
    newStack.push(pair[0]);
    operation = pair[1];
  }
  return newStack.reverse();
}
