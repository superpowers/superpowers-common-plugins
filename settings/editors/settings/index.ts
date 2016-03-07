import * as async from "async";

let data: {
  projectClient: SupClient.ProjectClient;
};

const socket = SupClient.connect(SupClient.query.project);

// NOTE: Listening for "welcome" rather than "connect"
// because SupCore.system.id is only set after "welcome"
socket.on("welcome", onWelcome);
socket.on("disconnect", SupClient.onDisconnected);
SupClient.setupHotkeys();

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
        async.each(pluginsInfo.list, (pluginName, pluginCallback) => {
          const pluginPath = `/systems/${SupCore.system.id}/plugins/${pluginName}`;
          async.each(["data", "settingsEditors"], (name, cb) => {
            const script = document.createElement("script");
            script.src = `${pluginPath}/bundles/${name}.js`;
            script.addEventListener("load", () => { cb(null); } );
            script.addEventListener("error", () => { cb(null); } );
            document.body.appendChild(script);
          }, pluginCallback);
        }, cb);
      }
    ], setupSettings);
  });
}

function setupSettings() {
  const mainElt = document.querySelector("main");

  const plugins = SupClient.getPlugins<SupClient.SettingsEditorPlugin>("settingsEditors");
  const sortedNames = Object.keys(plugins);
  sortedNames.sort((a, b) => { return (a.toLowerCase() < b.toLowerCase()) ? -1 : 1; });

  const createSection = (namespace: string) => {
    const sectionHeaderElt = document.createElement("header");
    sectionHeaderElt.textContent = SupClient.i18n.t(`settingsEditors:namespaces.${namespace}`);
    mainElt.appendChild(sectionHeaderElt);
    const sectionRootElt = document.createElement("div");
    sectionRootElt.classList.add(`namespace-${namespace}`);
    mainElt.appendChild(sectionRootElt);

    return sectionRootElt;
  };

  // Create general section first so we are sure it is displayed above
  createSection("general");

  for (const name of sortedNames) {
    const namespace = plugins[name].content.namespace;
    let sectionRootElt = mainElt.querySelector(`div.namespace-${namespace}`) as HTMLDivElement;
    if (sectionRootElt == null) sectionRootElt = createSection(namespace);

    const sectionElt = document.createElement("section");
    sectionElt.id = `settings-${name}`;
    sectionRootElt.appendChild(sectionElt);

    const headerElt = document.createElement("header");
    const sectionAnchorElt = document.createElement("a");
    sectionAnchorElt.name = name;
    sectionAnchorElt.textContent = SupClient.i18n.t(`settingsEditors:${name}.label`);
    headerElt.appendChild(sectionAnchorElt);
    sectionElt.appendChild(headerElt);

    const divElt = document.createElement("div");
    sectionElt.appendChild(divElt);

    const settingEditorClass = plugins[name].content.editor;
    /* tslint:disable:no-unused-expression */
    new settingEditorClass(divElt, data.projectClient);
    /* tslint:enable:no-unused-expression */
  }
}
