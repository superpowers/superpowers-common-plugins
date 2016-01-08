import * as async from "async";

let data: {
  projectClient: SupClient.ProjectClient;
};

let socket = SupClient.connect(SupClient.query.project);
socket.on("welcome", onWelcome);
socket.on("disconnect", SupClient.onDisconnected);
SupClient.setupHotkeys();

function onWelcome() {
  data = { projectClient: new SupClient.ProjectClient(socket), };
  loadPlugins();
}

function loadPlugins() {
  let i18nFiles: SupClient.i18n.File[] = [];

  SupClient.fetch(`/systems/${SupCore.system.name}/plugins.json`, "json", (err: Error, pluginsInfo: SupCore.PluginsInfo) => {
    for (let pluginName of pluginsInfo.list) {
      let root = `/systems/${SupCore.system.name}/plugins/${pluginName}`;
      i18nFiles.push({ root, name: "settingsEditors" });
    }

    async.parallel([
      (cb) => {
        SupClient.i18n.load(i18nFiles, cb);
      }, (cb) => {
        async.each(pluginsInfo.list, (pluginName, pluginCallback) => {
          let pluginPath = `/systems/${SupCore.system.name}/plugins/${pluginName}`;
          async.each(["data", "settingsEditors"], (name, cb) => {
            let script = document.createElement("script");
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
  let mainElt = document.querySelector("main");

  let sortedNames = Object.keys(SupClient.plugins["settingsEditors"]);
  sortedNames.sort((a, b) => { return (a.toLowerCase() < b.toLowerCase()) ? -1 : 1; });

  let createSection = (namespace: string) => {
    let sectionHeaderElt = document.createElement("header");
    sectionHeaderElt.textContent = SupClient.i18n.t(`settingsEditors:namespaces.${namespace}`);
    mainElt.appendChild(sectionHeaderElt);
    let sectionRootElt = document.createElement("div");
    sectionRootElt.classList.add(`namespace-${namespace}`);
    mainElt.appendChild(sectionRootElt);

    return sectionRootElt;
  };

  // Create general section first so we are sure it is displayed above
  createSection("general");

  for (let name of sortedNames) {
    let namespace = SupClient.plugins["settingsEditors"][name].content.namespace;
    let sectionRootElt = mainElt.querySelector(`div.namespace-${namespace}`) as HTMLDivElement;
    if (sectionRootElt == null) sectionRootElt = createSection(namespace);

    let sectionElt = document.createElement("section");
    sectionElt.id = `settings-${name}`;
    sectionRootElt.appendChild(sectionElt);

    let headerElt = document.createElement("header");
    let sectionAnchorElt = document.createElement("a");
    sectionAnchorElt.name = name;
    sectionAnchorElt.textContent = SupClient.i18n.t(`settingsEditors:${name}.label`);
    headerElt.appendChild(sectionAnchorElt);
    sectionElt.appendChild(headerElt);

    let divElt = document.createElement("div");
    sectionElt.appendChild(divElt);

    let settingEditorClass = SupClient.plugins["settingsEditors"][name].content.editor;
    /* tslint:disable:no-unused-expression */
    new settingEditorClass(divElt, data.projectClient);
    /* tslint:enable:no-unused-expression */
  }
}
