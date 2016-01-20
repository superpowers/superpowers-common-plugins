/// <reference path="../../settings/settingsEditors/SettingsEditorPlugin.d.ts" />

import TextEditorSettingsEditor from "./TextEditorSettingsEditor";

SupClient.registerPlugin<SupClient.SettingsEditorPlugin>("settingsEditors", "TextEditor", {
  namespace: "editors",
  editor: TextEditorSettingsEditor
});
