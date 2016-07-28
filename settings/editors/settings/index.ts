import * as async from "async";

let data: {
  projectClient: SupClient.ProjectClient;
};

const socket = SupClient.connect(SupClient.query.project);

// NOTE: Listening for "welcome" rather than "connect"
// because SupCore.system.id is only set after "welcome"
socket.on("welcome", onWelcome);
socket.on("disconnect", SupClient.onDisconnected);

function onWelcome() {
  data = { projectClient: new SupClient.ProjectClient(socket) };
  loadPlugins();
}

function loadPlugins() {
  const i18nFiles: SupClient.i18n.File[] = [];

  SupClient.fetch(`/systems/${SupCore.system.id}/plugins.json`, "json", (err: Error, pluginsInfo: SupCore.PluginsInfo) => {
    for (const pluginName of pluginsInfo.list) {
      const root = `/systems/${SupCore.system.id}/plugins/${pluginName}`;
      i18nFiles.push({ root, name: "settingsEditors" });
    }

    async.parallel([
      (cb) => {
        SupClient.i18n.load(i18nFiles, cb);
      }, (cb) => {
        async.each(pluginsInfo.list, (pluginName, cb) => {
          const pluginPath = `/systems/${SupCore.system.id}/plugins/${pluginName}`;
          async.each(["data", "settingsEditors"], (name, cb) => {
            SupClient.loadScript(`${pluginPath}/bundles/${name}.js`, cb);
          }, cb);
        }, cb);
      }
    ], setupSettings);
  });
}

function setupSettings() {
  const mainElt = document.querySelector("main") as HTMLDivElement;

  const plugins = SupClient.getPlugins<SupClient.SettingsEditorPlugin>("settingsEditors");
  const sortedNames = Object.keys(plugins);
  sortedNames.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  const createSection = (namespace: string) => {
    const header = SupClient.html("header", { parent: mainElt, textContent: SupClient.i18n.t(`settingsEditors:namespaces.${namespace}`) });
    const root = SupClient.html("div", `namespace-${namespace}`, { parent: mainElt });

    return { header, root };
  };

  // Create general section first so we are sure it is displayed above
  const generalSection = createSection("general");

  for (const name of sortedNames) {
    const namespace = plugins[name].content.namespace;
    let sectionRootElt = mainElt.querySelector(`div.namespace-${namespace}`) as HTMLDivElement;
    if (sectionRootElt == null) sectionRootElt = createSection(namespace).root;

    const sectionElt = SupClient.html("section", { parent: sectionRootElt });

    const headerElt = SupClient.html("header", { parent: sectionElt });
    SupClient.html("a", { parent: headerElt, textContent: SupClient.i18n.t(`settingsEditors:${name}.label`), id: name });

    const editorContentElt = SupClient.html("div", { parent: sectionElt });

    const settingEditorClass = plugins[name].content.editor;
    new settingEditorClass(editorContentElt, data.projectClient);
  }

  // Remove general section if it's empty
  if (generalSection.root.children.length === 0) {
    mainElt.removeChild(generalSection.header);
    mainElt.removeChild(generalSection.root);
  }
}
