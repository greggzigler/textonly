const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
};

function updateButton(label, listener) {
  const popupButton = document.getElementById("refresh-button");
  popupButton.addEventListener("click", listener);
  popupButton.setAttribute("class", "popup-button");
  popupButton.innerHTML = label;
}

function updateRefreshButton() {
  updateButton("Refresh", async function refreshListener() {
    const message = { id: "userClickedRefresh" };
    chrome.runtime.sendMessage(message);
    await sleep(2000);
    await refreshPreview();
    console.log('p.refreshListener', message);
  });
}

const PREVIEW_CLASS = "preview-paragraph";

async function refreshPreview() {
  // remove previous preview
  while (document.getElementsByClassName(PREVIEW_CLASS).length) {
    document.getElementsByClassName(PREVIEW_CLASS)[0].remove();
  }

  // look for new preview
  const result = await chrome.storage.session.get(["preview"]);
  console.log('p.refreshPreview', result);
  if (!result || !result.preview || !result.preview.length) return false;

  // display preview text in popup
  const bottom = document.getElementById("preview_id");
  result.preview.forEach(text => {
    const p = document.createElement("p");
    p.setAttribute("class", PREVIEW_CLASS);
    p.innerHTML = text;
    bottom.append(p);
  });
  return true;
}

function popupMain() {
  console.log('p.popupMain');
  updateRefreshButton();
  setTimeout(async () => {
    const refreshed = await refreshPreview();
    if (!refreshed) popupMain();
  }, 1000); 
}
popupMain();
