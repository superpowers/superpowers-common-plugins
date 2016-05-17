import * as async from "async";
import * as marked from "marked";

let data: {
  projectClient: SupClient.ProjectClient;
};

const socket = SupClient.connect(SupClient.query.project);
socket.on("welcome", onWelcome);
socket.on("disconnect", SupClient.onDisconnected);

let loaded = false;
let initialSection: string;
window.addEventListener("message", (event: any) => {
  if (event.data.type === "setState") {
    if (!loaded) initialSection = event.data.state.section;
    else openDocumentation(event.data.state.section);
  }
});

function onWelcome() {
  data = { projectClient: new SupClient.ProjectClient(socket), };

  loadPlugins();
}

function loadPlugins() {
  SupClient.fetch(`/systems/${SupCore.system.id}/plugins.json`, "json", (err: Error, pluginsInfo: SupCore.PluginsInfo) => {
    async.each(pluginsInfo.list, (pluginName, pluginCallback) => {
      const pluginPath = `/systems/${SupCore.system.id}/plugins/${pluginName}`;
      const documentationScript = document.createElement("script") as HTMLScriptElement;
      documentationScript.addEventListener("load", () => { pluginCallback(); } );
      documentationScript.addEventListener("error", () => { pluginCallback(); } );
      documentationScript.src = `${pluginPath}/bundles/documentation.js`;
      document.body.appendChild(documentationScript);
    }, (err) => { setupDocs(); });
  });
}

const navListElt = document.querySelector("nav ul");
const mainElt =  document.querySelector("main");

if (SupApp != null) {
  mainElt.addEventListener("click", (event) => {
    const target = event.target as HTMLAnchorElement;
    if (target.tagName !== "A") return;

    event.preventDefault();
    SupApp.openLink(target.href);
  });
}

function openDocumentation(name: string) {
  (navListElt.querySelector("li a.active") as HTMLAnchorElement).classList.remove("active");
  (mainElt.querySelector("article.active") as HTMLElement).classList.remove("active");
  navListElt.querySelector(`[data-name=${name}]`).classList.add("active");
  document.getElementById(`documentation-${name}`).classList.add("active");
}

function setupDocs() {
  const docs = SupClient.getPlugins<SupClient.DocumentationPlugin>("documentation");
  if (docs == null) {
    mainElt.textContent = "This system doesn't have any documentation included.";
    return;
  }

  const languageCode = SupClient.cookies.get("supLanguage");
  const liEltsByTranslatedName: { [translatedName: string]: HTMLLIElement } = {};

  async.each(Object.keys(docs), (name, cb) => {
    const liElt = document.createElement("li");
    const anchorElt = document.createElement("a");
    anchorElt.dataset["name"] = name;
    anchorElt.href = `#${name}`;
    liElt.appendChild(anchorElt);

    const articleElt = document.createElement("article");
    articleElt.id = `documentation-${name}`;
    mainElt.appendChild(articleElt);

    function onDocumentationLoaded(content: string) {
      articleElt.innerHTML = marked(content);

      const translatedName = articleElt.firstElementChild.textContent;
      anchorElt.textContent = translatedName;

      if (docs[name].content.isFirstSection) navListElt.appendChild(liElt);
      else liEltsByTranslatedName[translatedName] = liElt;

      if (SupApp == null) {
        const linkElts = articleElt.querySelectorAll("a") as any as HTMLAnchorElement[];
        for (const linkElt of linkElts) linkElt.target = "_blank";
      }
      cb(null);
    }

    const pluginPath = SupClient.getPlugins<SupClient.DocumentationPlugin>("documentation")[name].path;
    SupClient.fetch(`${pluginPath}/documentation/${name}.${languageCode}.md`, "text", (err, data) => {
      if (err != null) {
        SupClient.fetch(`${pluginPath}/documentation/${name}.en.md`, "text", (err, data) => {
          onDocumentationLoaded(data);
        });
        return;
      }
      onDocumentationLoaded(data);
    });
  }, () => {
    const sortedNames = Object.keys(liEltsByTranslatedName).sort((a, b) => { return (a.toLowerCase() < b.toLowerCase()) ? -1 : 1; });
    for (const name of sortedNames) navListElt.appendChild(liEltsByTranslatedName[name]);

    navListElt.addEventListener("click", (event: any) => {
      if (event.target.tagName !== "A") return;
      openDocumentation(event.target.dataset["name"]);
    });

    (<HTMLAnchorElement>navListElt.querySelector("li a")).classList.add("active");
    (<HTMLElement>mainElt.querySelector("article")).classList.add("active");
    loaded = true;
    if (initialSection != null) openDocumentation(initialSection);
  });
}
