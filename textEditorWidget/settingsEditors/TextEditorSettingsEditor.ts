import * as fs from "fs";
import * as path from "path";

import TextEditorSettingsResource from "../data/TextEditorSettingsResource";
import * as textEditorUserSettings from "../data/textEditorUserSettings";

const modes = fs.readdirSync(path.join(__dirname, "../node_modules/codemirror/theme"));

export default class TextEditorSettingsEditor {
  resource: TextEditorSettingsResource;

  tabSizeField: HTMLInputElement;
  softTabField: HTMLInputElement;
  keyMapField: HTMLSelectElement;
  themeField: HTMLSelectElement;

  constructor(container: HTMLDivElement, projectClient: SupClient.ProjectClient) {
    const { tbody } = SupClient.table.createTable(container);

    // Project settings
    const tabSizeRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("settingsEditors:TextEditor.tabSize"));
    this.tabSizeField = SupClient.table.appendNumberField(tabSizeRow.valueCell, "", { min: 1 });
    this.tabSizeField.addEventListener("change", (event: any) => {
      projectClient.editResource("textEditorSettings", "setProperty", "tabSize", parseInt(event.target.value, 10));
    });

    const softTabRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("settingsEditors:TextEditor.useSoftTab"));
    this.softTabField = SupClient.table.appendBooleanField(softTabRow.valueCell, true);
    this.softTabField.addEventListener("change", (event: any) => {
      projectClient.editResource("textEditorSettings", "setProperty", "softTab", event.target.checked);
    });

    projectClient.subResource("textEditorSettings", this);

    // User settings
    const keyMapRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("settingsEditors:TextEditor.keyMap"));
    this.keyMapField = SupClient.table.appendSelectBox(keyMapRow.valueCell, { "sublime": "Sublime", "emacs": "Emacs", "vim": "Vim" }, textEditorUserSettings.pub.keyMap);
    this.keyMapField.addEventListener("change", (event: any) => {
      textEditorUserSettings.edit("keyMap", event.target.value);
    });

    textEditorUserSettings.emitter.addListener("keyMap", () => {
      this.keyMapField.value = textEditorUserSettings.pub.keyMap;
    });

    const themeRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("settingsEditors:TextEditor.theme"));
    const themeValues: { [value: string]: string } = { "default": "default" };
    for (const mode of modes) {
      const modeNoExtension = mode.slice(0, mode.length - 4);
      themeValues[modeNoExtension] = modeNoExtension;
    }
    this.themeField = SupClient.table.appendSelectBox(themeRow.valueCell, themeValues, textEditorUserSettings.pub.theme);
    this.themeField.addEventListener("change", (event: any) => {
      textEditorUserSettings.edit("theme", event.target.value);
    });

    textEditorUserSettings.emitter.addListener("theme", () => {
      this.themeField.value = textEditorUserSettings.pub.theme;
    });
  }

  onResourceReceived = (resourceId: string, resource: TextEditorSettingsResource) => {
    this.resource = resource;

    this.tabSizeField.value = resource.pub.tabSize.toString();
    this.softTabField.checked = resource.pub.softTab;
  };

  onResourceEdited = (resourceId: string, command: string, propertyName: string) => {
    switch(propertyName) {
      case "tabSize": this.tabSizeField.value = this.resource.pub.tabSize.toString(); break;
      case "softTab": this.softTabField.checked = this.resource.pub.softTab; break;
    }
  };
}
