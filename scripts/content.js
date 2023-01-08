
function getPageContent(type, elements) {
  const manifest = chrome.runtime.getManifest();
  if (!manifest || !manifest.content_scripts || !manifest.content_scripts.length) {
    console.log('c.getPageContent no manifest');
    return null;
  }

  const specs = manifest.content_scripts[0][type];
  if (!specs || !specs.classes || !specs.tags) {
    console.log('c.getPageContent', type, 'with classes and tags not found');
    return null;
  }

  let content = [];
  if (specs.classes && specs.classes.length) {
    for (let i = 0; i < specs.classes.length && content.length === 0; i += 1) {
      content = elements.getElementsByClassName(specs.classes[i]);
    }
  }
  if (specs.tags && specs.tags.length) {
    for (let i = 0; i < specs.tags.length && content.length === 0; i += 1) {
      content = elements.getElementsByTagName(specs.tags[i]);
    }
  }

  return content;
}

function getTitle() {
  const titles = getPageContent('title', document);
  return (titles && titles.length) ? titles[0].innerHTML : null;
}

function getCore() {
  const cores = getPageContent('core', document);
  return (cores && cores.length) ? cores : [];
}

function getPreview() {
  const preview = [];
  const divider = "__________________________________________"
                + "__________________________________________";

  const title = getTitle();
  if (title) {
    preview.push(title);
  }

  // display unique content only
  const alreadySeen = {};

  preview.push(divider);
  const cores = getCore();
  const clist = Array.prototype.slice.call(cores);
  clist.forEach(core => {
    const ps = getPageContent('details', core);
    if (ps && ps.length) {
      let pushed = 0;
      const plist = Array.prototype.slice.call(ps);
      plist.forEach(p => {
        const text = p.innerHTML;
        if (!alreadySeen[text]) {
          preview.push(text);
          alreadySeen[text] = true;
          pushed += 1;
        }
      });
      if (pushed > 1) preview.push(divider);
    }
  });

  return preview;
}

async function sendPagePreview() {
  if (!chrome || !chrome.runtime) {
    console.log('c.sendPagePreview no chrome.runtime');
    return false;
  } else {
    const preview = getPreview();
    const message = { id: "scriptSentPagePreview", preview };
    await chrome.runtime.sendMessage(message);
    return true;
  }
}

function addListener() {
  if (!chrome || !chrome.runtime) {
    console.log('c.addListener no chrome.runtime');
    return false;
  } else {
    chrome.runtime.onMessage.addListener(
      async function scriptListener(message) {
        console.log('c.scriptListener', message);
        const { id } = message;
        if (id === "userClickedRefresh") {
          await sendPagePreview();
        }
      }
    );
    return true;
  }
}

function contentMain() {
  setTimeout(() => {
    const added = addListener();
    if (!added) contentMain();
  }, 1000); 
}
contentMain();
