import TextEditorSettingsResource from "../data/TextEditorSettingsResource";

export default class TextEditorSettingsEditor {
  resource: TextEditorSettingsResource;

  tabSizeField: HTMLInputElement;
  softTabField: HTMLInputElement;

  constructor(container: HTMLDivElement, projectClient: SupClient.ProjectClient) {
    let { tbody } = SupClient.table.createTable(container);

    let tabSizeRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("settingsEditors:TextEditor.tabSize"));
    this.tabSizeField = SupClient.table.appendNumberField(tabSizeRow.valueCell, "", { min: 1 });
    this.tabSizeField.addEventListener("change", (event: any) => {
      projectClient.editResource("textEditorSettings", "setProperty", "tabSize", parseInt(event.target.value, 10));
    });

    let softTabRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("settingsEditors:TextEditor.useSoftTab"));
    this.softTabField = SupClient.table.appendBooleanField(softTabRow.valueCell, true);
    this.softTabField.addEventListener("change", (event: any) => {
      projectClient.editResource("textEditorSettings", "setProperty", "softTab", event.target.checked);
    });

    projectClient.subResource("textEditorSettings", this);
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
