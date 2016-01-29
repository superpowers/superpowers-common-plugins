import TextEditorSettingsResource from "../data/TextEditorSettingsResource";

export default class TextEditorSettingsEditor {
  resource: TextEditorSettingsResource;

  tabSizeField: HTMLInputElement;
  softTabField: HTMLInputElement;
  themeField: HTMLSelectElement;

  themeDictionary: {[key: string]: string} = {
    "default": "Default",
    "3024-day": "3024 Day",
    "3024-night": "3024 Night",
    "abcdef":" Abcdef",
    "base16-dark": "Base16 Dark",
    "base16-light": "Base16 Light",
    "bespin": "Bespin",
    "blackboard":"Blackboard",
    "colorforth": "Colorforth",
    "dracula": "Dracula",
    "eclipse": "Eclipse",
    "elegant": "Elegant",
    "cobalt": "Cobalt",
    "erlang-dark": "Erlang Dark",
    "hopscotch": "Hopscotch",
    "icecoder": "Icecoder",
    "isotope": "Isotope",
    "lesser-dark": "Lesser Dark",
    "liquibyte": "Liquibyte",
    "material": "Material",
    "mbo": "Mbo",
    "mdn-like": "Mdn Like",
    "midnight": "Midnight",
    "monokai": "Monokai",
    "neat": "Neat",
    "neo": "Neo",
    "night": "Night",
    "paraiso-dark": "Paraiso Dark",
    "paraiso-light": "Paraiso Light",
    "pastel-on-dark": "Pastel on Dark",
    "railscasts": "Railscasts",
    "rubyblue": "Rubyblue",
    "seti": "Seti",
    "solarized": "Solarized",
    "the-matrix": "The Matrix",
    "tomorrow-night-bright": "Tomorrow Night Bright",
    "tomorrow-night-eighties": "Tomorrow Night Eighties",
    "ttcn": "Ttcn",
    "twilight": "Twilight",
    "vibrant-ink": "Vibrant Ink",
    "xq-dark": "Xq Dark",
    "xq-light": "Xq Light",
    "yeti": "Yeti",
    "zenburn": "Zenburn"
  }

  constructor(container: HTMLDivElement, projectClient: SupClient.ProjectClient) {
    let { tbody } = SupClient.table.createTable(container);

    let tabSizeRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("settingsEditors:TextEditor.tabSize"));
    this.tabSizeField = SupClient.table.appendNumberField(tabSizeRow.valueCell, "", { min: 1 });
    this.tabSizeField.addEventListener("change", (event: any) => {
      projectClient.socket.emit("edit:resources", "textEditorSettings", "setProperty", "tabSize", parseInt(event.target.value, 10), (err: string) => {
        if (err != null) new SupClient.dialogs.InfoDialog(err, SupClient.i18n.t("common:actions.close"));
      });
    });

    let softTabRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("settingsEditors:TextEditor.useSoftTab"));
    this.softTabField = SupClient.table.appendBooleanField(softTabRow.valueCell, true);
    this.softTabField.addEventListener("change", (event: any) => {
      projectClient.socket.emit("edit:resources", "textEditorSettings", "setProperty", "softTab", event.target.checked, (err: string) => {
        if (err != null) new SupClient.dialogs.InfoDialog(err, SupClient.i18n.t("common:actions.close"));
      });
    });

    let themeRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("settingsEditors:TextEditor.theme"));
    this.themeField = SupClient.table.appendSelectBox(themeRow.valueCell, this.themeDictionary, "");
    this.themeField.addEventListener("change", (event: any) => {
      projectClient.socket.emit("edit:resources", "textEditorSettings", "setProperty", "theme", event.target.value.trim(), (err: string) => {
        if (err != null) new SupClient.dialogs.InfoDialog(err, SupClient.i18n.t("common:actions.close")); });
    });

    projectClient.subResource("textEditorSettings", this);
  }

  onResourceReceived = (resourceId: string, resource: TextEditorSettingsResource) => {
    this.resource = resource;

    this.tabSizeField.value = resource.pub.tabSize.toString();
    this.softTabField.checked = resource.pub.softTab;
    this.themeField.value = resource.pub.theme;
  };

  onResourceEdited = (resourceId: string, command: string, propertyName: string) => {
    switch(propertyName) {
      case "tabSize": this.tabSizeField.value = this.resource.pub.tabSize.toString(); break;
      case "softTab": this.softTabField.checked = this.resource.pub.softTab; break;
    }
  };
}
