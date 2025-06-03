function parseProps(str) {
  const result = {};
  if (!str) return result;
  const parts = str.split(/,(?![^\"]*\")/);
  for (let part of parts) {
    part = part.trim();
    const idx = part.indexOf(":");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    let value = part.slice(idx + 1).trim();
    if (value.startsWith("\"") && value.endsWith("\"")) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function createButton(props, slot) {
  const label = props.label || "Send";
  const url = props.url;
  const message = props.message || "";
  if (!url) return;
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.addEventListener("click", async () => {
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });
      logseq.UI.showMsg(`Sent: ${message}`);
    } catch (e) {
      logseq.UI.showMsg(`Error: ${e.message}`);
    }
  });
  logseq.provideUI({ key: slot, slot, template: btn.outerHTML });
}

function main() {
  logseq.App.onMacroRendererSlotted(({ slot, payload }) => {
    const [type, args] = payload.arguments;
    if (type !== "ajax-button") return;
    const props = parseProps(args);
    createButton(props, slot);
  });
}

logseq.ready(main).catch(console.error);
