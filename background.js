if (typeof browser === 'undefined') {
    var browser = chrome
}

// Handling incoming messages
browser.runtime.onMessage.addListener(handleIncomingRequest)

function handleIncomingRequest(sentMesssage) {
    if (sentMesssage.type == 'open') openWithAI(sentMesssage.prompt)
    if (sentMesssage.type == 'updateContextMenu') {
        createContextMenu(sentMesssage.selection)
    }
    return true
}

async function openWithAI(prompt) {
    // Dispatch event for analytics
    sendMessageToWebsite({
        type: 'ekalvia-prompt-accessed',
        payload: {
            prompt,
        },
    })

    let data = await chrome.storage.local.get('provider')
    console.log(data)
    switch (data.provider) {
        case 'chatgpt':
            openChatGpt(prompt)
            break
        default:
            openGemini(prompt)
    }
}

async function openChatGpt(prompt) {
    let tab = await createTab('https://chatgpt.com')
    console.log(tab)
    chrome.tabs.sendMessage(tab.id, { type: 'injectprompt', prompt: prompt })
}

async function openGemini(prompt) {
    // chrome.tabs.create({'url': `https://gemini.google.com`}, function(tab) {
    //   console.log(tab);
    //   chrome.tabs.sendMessage(tab.id,{type:"showloader", prompt: prompt})
    // })
    let tab = await createTab('https://gemini.google.com')
    console.log(tab)
    chrome.tabs.sendMessage(tab.id, { type: 'injectprompt', prompt: prompt })
}

//helper for browser

function createTab(url) {
    return new Promise(resolve => {
        chrome.tabs.create({ url }, async tab => {
            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                if (info.status === 'complete' && tabId === tab.id) {
                    chrome.tabs.onUpdated.removeListener(listener)
                    resolve(tab)
                }
            })
        })
    })
}

// Context menus
browser.runtime.onInstalled.addListener(() => {
    createContextMenu()
})

// Assume bug as well:
//https://stackoverflow.com/questions/33834785/chrome-extension-context-menu-not-working-after-update

setTimeout(function () {
    // This .update() call does not change the context menu if it exists,
    // but sets chrome.runtime.lastError if the menu does not exist.
    browser.contextMenus.update('top', {}, function () {
        if (browser.runtime.lastError) {
            // Assume that crbug.com/388231 occured, manually call
            createContextMenu()
        }
    })
}, 222) // <-- Some short timeout.

function createContextMenu(text) {
    const contexts = ['selection']
    browser.contextMenus.removeAll()
    console.log('Updating with ', text)

    let parentId = browser.contextMenus.create({
        title: 'Ekalvia AI',
        id: 'top',
        contexts,
    })

    browser.contextMenus.create({
        title: `Learn '${text}' with AI`,
        id: 'learn',
        contexts,
        parentId,
    })
    browser.contextMenus.create({
        title: `Explain '${text}' with AI`,
        id: 'explain',
        contexts,
        parentId,
    })
    browser.contextMenus.create({
        title: `Quiz '${text}' with AI`,
        id: 'quiz',
        contexts,
        parentId,
    })
    browser.contextMenus.onClicked.addListener(handleSelection)
}

function handleSelection(info, tab) {
    console.log('incoming ' + info.selectionText)
    let selectedText = info.selectionText
    let pageTitle = tab.title
    let pageURL = tab.url

    let initialPrompt = `I was on the page (${pageURL})${pageTitle != pageURL ? ", with the page title '" + pageTitle + "'" : ''}`
    var prompt
    switch (info.menuItemId) {
        case 'learn':
            prompt = `${initialPrompt}. I would like to dive deeper into the following topic and the associated text I've encountered. As an expert tutor, please help me understand this concept thoroughly, focusing on its applications in computer science and related fields. Provide a comprehensive explanation, including real-world examples, case studies, and any relevant theories. Additionally, suggest further reading materials, online courses, or interactive tools that could help me explore this topic more deeply. Encourage my understanding and spark my curiosity through engaging questions and interactive exercises.\n\nTopic and text:\n${selectedText}`
            break
        case 'explain':
            prompt = `${initialPrompt}. I need help understanding the following topic and text I found on this page. Please provide a clear and detailed explanation that breaks down the topic from first principles, focusing on fundamental concepts and how they build up to the complete idea. Illustrate your explanation with examples, diagrams, or analogies if possible. Also, recommend additional resources such as articles, videos, or books for further learning. Help me grasp the core ideas and their broader implications.\n\nTopic and text:\n${selectedText}`
            break
        case 'quiz':
            prompt = `${initialPrompt}. I would like to take a 5-question multiple-choice quiz on the following topic and text. As an expert tutor, please create challenging and thought-provoking questions to test my understanding. Ask me one question at a time, and after each question, wait for my answer before moving on to the next. Provide detailed feedback after each question, explaining why the correct answer is right and why the other options are not. At the end, give an overall assessment of my performance and suggest areas for improvement. Use the topic and text as the context for your questions and employ your imagination to make the quiz engaging.
      \n\nTopic and text:\n${selectedText}`
            break
    }
    //console.log(prompt);
    openWithAI(prompt)
}

async function triggerPromptHandler() {
    let storedProvider = await chrome.storage.local.get('provider')
    storedProvider = storedProvider ? storedProvider.provider : 'gemini'
    console.log(storedProvider, aidata[storedProvider], {
        type: 'registerprompt',
        ...aidata[storedProvider],
    })
    await timeout(5000)
    let tab = await createTab(aidata[storedProvider].website)
    await timeout(2000)
    chrome.tabs.sendMessage(tab.id, {
        type: 'registerprompt',
        ...aidata[storedProvider],
    })
}

// Function to send a message to the website
function sendMessageToWebsite(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, message)
        }
    })
}

// Enable bing AI on chrome
// Ref: https://github.com/patrik-martinko/addon-bing-ai-for-chrome/blob/dbe86b16c9470df1ae3e5d32fde334ffa9b4e777/package/background.js
chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1],
    addRules: [
        {
            id: 1,
            priority: 1,
            action: {
                type: 'modifyHeaders',
                requestHeaders: [
                    {
                        operation: 'set',
                        header: 'user-agent',
                        value:
                            navigator.userAgent.split('AppleWebKit')[0] +
                            'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
                    },
                ],
            },
            condition: {
                resourceTypes: Object.values(
                    chrome.declarativeNetRequest.ResourceType
                ),
            },
        },
    ],
})
chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: 'https://chat.bing.com' })
})
chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') {
        chrome.tabs.create({ url: 'https://chat.bing.com' })
    }
})

// All set.

console.log('Background listener started')
