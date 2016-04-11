if (SupApp != null) {
  document.querySelector(".sidebar .links").addEventListener("click", (event: any) => {
    if (event.target.tagName !== "A") return;

    event.preventDefault();
    SupApp.openLink(event.target.href);
  });
}
