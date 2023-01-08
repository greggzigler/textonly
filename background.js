async function getCurrentTab() {
  const queryOptions = {
    active: true,
    lastFocusedWindow: true
  };
  if (!chrome || !chrome.tabs || !chrome.tabs.query) {
    console.log('b.getCurrentTab no chrome.tabs');
    return false;
  } else {
    const [tab] = await chrome.tabs.query(queryOptions);
    return tab;
  }
}

async function currentTabIsReadable() {
  const tab = await getCurrentTab();
  if (!tab || !tab.url) return false;

  const manifest = chrome.runtime.getManifest();
  if (!manifest || !manifest.content_scripts || !manifest.content_scripts.length) {
    console.log('b.currentTabIsReadable no manifest');
    return null;
  }

  const readableUrls = manifest.content_scripts[0].matches;
  if (!readableUrls || !Array.isArray(readableUrls)) {
    console.log('b.currentTabIsReadable array not found for matches');
    return null;
  }

  for (let i = 0; i < readableUrls.length; i += 1) {
    const readableUrl = readableUrls[i].replace(/\*/g, '.*');
    const readableRegex = new RegExp(readableUrl);
    if (readableRegex.test(tab.url)) {
      return true;
    }
  }
  return false;
}

async function setBadge() {
  const isReadable = await currentTabIsReadable();
  if (!chrome || !chrome.action || !chrome.action.setBadgeText) {
    console.log('b.setBadge no chrome.action');
    return false;
  }
  if (isReadable) {
    chrome.action.setBadgeText({ text: "T" });
    chrome.action.setBadgeBackgroundColor({ color: "#ff0000" });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
  return true;
}

async function requestRefresh(message = {}) {
  // forward to content.js
  const tab = await getCurrentTab();
  console.log('b.requestRefresh', message, tab);
  if (!chrome || !chrome.tabs || !chrome.tabs.sendMessage) {
    console.log('b.requestRefresh no chrome.tabs');
    return false;
  } else if (!tab || !tab.id) {
    console.log('b.requestRefresh no current tab');
    return false;
  } else {
    await chrome.tabs.sendMessage(tab.id, message);
    return true;
  }
}

async function setBadgeAndRefresh() {
  try {
    const badgeSet = await setBadge();
    if (!badgeSet) {
      console.log('b.setBadgeAndRefresh badge not set');
      return false;
    }
  } catch (error) {
    console.log('b.setBadgeAndRefresh badge not set', error);
    return false;
  }

  try {
    const refreshRequested = await requestRefresh({ id: "userClickedRefresh" });
    if (!refreshRequested) {
      console.log('b.setBadgeAndRefresh refresh not requested');
      return false;
    }
  } catch (error) {
    console.log('b.setBadgeAndRefresh refresh not requested', error);
    return false;
  }

  return true;
}

function addListeners() {
  console.log('b.addListeners begin');
  if (!chrome || !chrome.tabs) {
    console.log('b.addListeners no chrome.tabs');
    return false;
  } else {
    chrome.tabs.onActivated.addListener(setBadgeAndRefresh);
    chrome.tabs.onCreated.addListener(setBadgeAndRefresh);
    chrome.tabs.onUpdated.addListener(setBadgeAndRefresh);
  }

  if (!chrome || !chrome.runtime) {
    console.log('b.addListeners no chrome.runtime');
    return false;
  } else if (!chrome.storage || !chrome.storage.session) {
    console.log('b.addListeners no chrome.storage');
    return false;
  } else {
    chrome.runtime.onMessage.addListener(
      async function backgroundListener(message) {
        console.log('b.backgroundListener message', message);
        const { id } = message;
        if (id === "scriptSentPagePreview") {
          const { preview } = message;
          if (preview && preview.length) {
            await chrome.storage.session.clear();
            await chrome.storage.session.set({ preview });
          }
        } else if (id === "userClickedRefresh") {
          await requestRefresh(message);
        }
      }
    );
  }
  return true;
}

function backgroundMain() {
  setTimeout(() => {
    const added = addListeners();
    if (!added) backgroundMain();
  }, 1000); 
}
backgroundMain();
