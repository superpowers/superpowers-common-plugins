declare namespace SupClient {
  export interface SettingsEditor {
    new(container: HTMLDivElement, projectClient: SupClient.ProjectClient): any;
  }

  export interface SettingsEditorPlugin {
    namespace: string;
    editor: SettingsEditor;
  }
}
