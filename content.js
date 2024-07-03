if (typeof browser === "undefined") {
  var browser = chrome;
}

browser.runtime.onMessage.addListener(loadPrompt);

// Approach #1 - identify prompt on page
// (function () {
//     function checkForPromptLinks() {
//         const elements = document.querySelectorAll("[href]");
//         let found = false;

//         elements.forEach((element) => {
//             const href = element.getAttribute("href");
//             if (href.startsWith("prompt://")) {
//                 console.log(
//                     'Found element with href starting with "prompt://":',
//                     element
//                 );
//                 found = true;
//             }
//         });

//         if (found) {
//             const event = new CustomEvent("ekalvia-prompt-available", {
//                 detail: 'A tag with href starting with "prompt://" was found',
//             });
//             window.dispatchEvent(event);
//         }
//     }

//     // Run the initial check
//     checkForPromptLinks();

//     // Create a MutationObserver to watch for changes in the DOM
//     const observer = new MutationObserver((mutations) => {
//         mutations.forEach((mutation) => {
//             if (
//                 mutation.type === "childList" ||
//                 mutation.type === "attributes"
//             ) {
//                 checkForPromptLinks();
//             }
//         });
//     });

//     // Start observing the document body for changes
//     observer.observe(document.body, {
//         // childList: true, // Watch for added or removed child nodes
//         // attributes: true, // Watch for attribute changes
//         subtree: true, // Watch the entire subtree of the document body
//     });
// })();

// Approach #2 - - identify prompt on page
// window.addEventListener("load", (event) => {
//     console.log("window loaded");
// });

// // Check if there is any element on page with prompt
// document.addEventListener("DOMContentLoaded", (e) => {
//     console.log("DOM loaded", e);
//     // Get all elements with an href attribute
//     const elements = document.querySelectorAll("[href]");

//     // Loop through the elements and check the href value
//     if (
//         elements.some((element) =>
//             element.getAttribute("href").startsWith("prompt://")
//         )
//     ) {
//         // broadcast a message
//         browser.runtime.sendMessage({ type: "ekalvia-prompt-available" });
//     }
// });

// Approach #3 - identify prompt on page
// let promptLinkFound = false;

// // Function to check for prompt:// links
// function checkForPromptLinks() {
//     if (promptLinkFound) return;

//     const links = document.querySelectorAll('a[href^="prompt://"]');
//     if (links.length > 0) {
//         const event = new CustomEvent("ekalvia-prompt-available", { detail: links });
//         window.dispatchEvent(event);
//         promptLinkFound = true;
//     }
// }

// // Initial check when the content script is loaded
// checkForPromptLinks();

// // Observe for changes in the DOM (useful for React-based routing)
// const observer = new MutationObserver((mutations) => {
//     if (!promptLinkFound) {
//         for (const mutation of mutations) {
//             if (mutation.addedNodes.length > 0) {
//                 checkForPromptLinks();
//                 break;
//             }
//         }
//     }
// });

// // Start observing the body for changes
// observer.observe(document.body, { childList: true, subtree: true });

// // Handle React Router changes
// const originalPushState = history.pushState;
// const originalReplaceState = history.replaceState;

// history.pushState = function (...args) {
//     originalPushState.apply(this, args);
//     console.log('resetting promptLinkFound pushState')
//     promptLinkFound = false; // Reset flag on route change
//     checkForPromptLinks();
// };

// history.replaceState = function (...args) {
//     originalReplaceState.apply(this, args);
//     console.log('resetting promptLinkFound replaceState')
//     promptLinkFound = false; // Reset flag on route change
//     checkForPromptLinks();
// };

// // Also listen for the popstate event
// window.addEventListener("popstate", () => {
//   console.log('resetting promptLinkFound popstate')
//     promptLinkFound = false; // Reset flag on route change
//     checkForPromptLinks();
// });

let handler = document.addEventListener("click", e => {
  const origin = e.target.closest(`a`);
  if (origin && origin.href && origin.href.startsWith("prompt://")) {
    e.preventDefault();
    console.log("Should open prompt for " + decodeURIComponent(origin.href.slice(9)));
    browser.runtime.sendMessage({prompt: decodeURIComponent(origin.href.slice(9)), type: "open"}, function(e) {
            console.log("Received ", e);
    })
  }
});


function makeToast(text, toastcolor = '#f0f4f9') {
  const smileyDiv = document.createElement('div');
  smileyDiv.style.position = 'absolute';
  smileyDiv.style.top = '10px'; // Set top to 0 for top of the screen
  smileyDiv.style.left = '50%';
  smileyDiv.style.transform = 'translate(-50%, 0)'; // Adjust for horizontal centering
  smileyDiv.style.backgroundColor = toastcolor;
  smileyDiv.style.borderRadius = '15px';
  smileyDiv.style.padding = '10px';
  smileyDiv.style.zIndex = 9999;
  smileyDiv.style["font-family"] = "sans-serif";
  // Add smiley text
  smileyDiv.textContent = text;
  document.body.appendChild(smileyDiv);
  return smileyDiv;
}

window.makeToast = makeToast;

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setLogoText(text = "Learn ++") {
  //gemini
  if (window.location.hostname == "gemini.google.com") {
    let logoTextEl = document.querySelector(".logoText")
    if (!logoTextEl) {
      document.querySelector(".logo").innerHTML += '<span class="logoText"></span>'
      logoTextEl = document.querySelector(".logoText") 
    }
    logoTextEl.innerHTML = text;
    return
  } else if (window.location.hostname == "chatgpt.com") {
    //chatgpt
    await timeout(5000)
    let logoTextEl = document.querySelector(".logoText") 
    if (!logoTextEl) {
      document.querySelector("span.text-token-text-secondary").parentElement.innerHTML += '<span class="logoText"></span>'
      logoTextEl = document.querySelector(".logoText") 
    }
    logoTextEl.innerHTML = text;
  }
}

async function loadPrompt(message) {
  console.log(message);
  await timeout(1000)
  if (message.type == "injectprompt") {
    let icon = makeToast('Injecting..');
    let inject = injectTextToEditor(message.prompt)
    if (!inject) {
      console.log("unsupported site, or injecting prompt is broken. report an issue!")
      return false;
    }
    await timeout(500);
    setLogoText(" 🏹 Learn with Ekalviya")
    icon.remove();
    return true;
  }
}

async function injectTextToEditor(text) {
  if (window.location.hostname == "gemini.google.com") {
    const editorElement = document.getElementsByClassName("ql-editor")[0];
    let htmltext = text.split('\n').map(t=>`<p>${t}</p>`).join("")
    // Check if element exists before proceeding
    if (!editorElement) {
      let t = makeToast("! Error in prompting automation. Try it again, or report an issue !", "#ffcccc");
      await timeout(3000);
      t.remove();
      return false;
    }
    // Inject the text into the editor
    let fill = text
    editorElement.innerHTML = fill;
    await timeout(100);
    document.getElementsByClassName("send-button")[0].click();
    await timeout(1000)
    return true;
  } else if (window.location.hostname == "chatgpt.com") {
    await(1000);
    const textElement = document.getElementById("prompt-textarea")
    await timeout(1000);
    if (textElement) {
      try {
        textElement.focus();
        document.execCommand('insertText', false, text);
        await(200);
        textElement.parentElement.parentElement.querySelector("button").click();
      } catch {
        let t = makeToast("! Error in prompting automation. Try it again, or report an issue!", "#ffcccc");
        await timeout(3000);
        t.remove();
        return false;  
      }
      return true;
    }
    let t = makeToast("! Error in prompting automation. Try it again, or report an issue!", "#ffcccc");
    await timeout(3000);
    t.remove();
    return false;
  } else {
    return false;
  }
}

console.log("content script loaded")