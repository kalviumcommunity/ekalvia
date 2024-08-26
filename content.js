if (typeof browser === 'undefined') {
    var browser = chrome
}

browser.runtime.onMessage.addListener(loadPrompt)

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    window.postMessage(message, '*')
})

let handler = document.addEventListener('click', e => {
    const origin = e.target.closest(`a`)
    if (origin && origin.href && origin.href.startsWith('prompt://')) {
        e.preventDefault()
        browser.runtime.sendMessage(
            { prompt: decodeURIComponent(origin.href.slice(9)), type: 'open' },
            function (e) {
                console.log('Received ', e)
            }
        )
    }
})

function makeToast(text, toastcolor = '#f0f4f9') {
    const smileyDiv = document.createElement('div')
    smileyDiv.style.position = 'absolute'
    smileyDiv.style.top = '10px' // Set top to 0 for top of the screen
    smileyDiv.style.left = '50%'
    smileyDiv.style.transform = 'translate(-50%, 0)' // Adjust for horizontal centering
    smileyDiv.style.backgroundColor = toastcolor
    smileyDiv.style.borderRadius = '15px'
    smileyDiv.style.padding = '10px'
    smileyDiv.style.zIndex = 9999
    smileyDiv.style['font-family'] = 'sans-serif'
    // Add smiley text
    smileyDiv.textContent = text
    document.body.appendChild(smileyDiv)
    return smileyDiv
}

window.makeToast = makeToast

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function setLogoText(text = 'Learn ++') {
    //gemini
    if (window.location.hostname == 'gemini.google.com') {
        let logoTextEl = document.querySelector('.logoText')
        if (!logoTextEl) {
            document.querySelector('.logo').innerHTML +=
                '<span class="logoText"></span>'
            logoTextEl = document.querySelector('.logoText')
        }
        logoTextEl.innerHTML = text
        return
    } else if (window.location.hostname == 'chatgpt.com') {
        //chatgpt
        await timeout(5000)
        let logoTextEl = document.querySelector('.logoText')
        if (!logoTextEl) {
            document.querySelector(
                'span.text-token-text-secondary'
            ).parentElement.innerHTML += '<span class="logoText"></span>'
            logoTextEl = document.querySelector('.logoText')
        }
        logoTextEl.innerHTML = text
    }
}

async function loadPrompt(message) {
    await timeout(1000)
    if (message.type == 'injectprompt') {
        let icon = makeToast('Injecting..')
        let inject = injectTextToEditor(message.prompt)
        if (!inject) {
            console.log(
                'unsupported site, or injecting prompt is broken. report an issue!'
            )
            return false
        }
        await timeout(500)
        setLogoText(' 🏹 Learn with Ekalviya')
        icon.remove()
        return true
    }
}

async function injectTextToEditor(text) {
    if (window.location.hostname == 'gemini.google.com') {
        const editorElement = document.getElementsByClassName('ql-editor')[0]
        let htmltext = text
            .split('\n')
            .map(t => `<p>${t}</p>`)
            .join('')
        // Check if element exists before proceeding
        if (!editorElement) {
            let t = makeToast(
                '! Error in prompting automation. Try it again, or report an issue !',
                '#ffcccc'
            )
            await timeout(3000)
            t.remove()
            return false
        }
        // Inject the text into the editor
        let fill = text
        editorElement.innerHTML = fill
        await timeout(100)
        document.getElementsByClassName('send-button')[0].click()
        await timeout(1000)
        return true
    } else if (window.location.hostname == 'chatgpt.com') {
        await 1000
        const textElement = document.getElementById('prompt-textarea')
        await timeout(1000)
        if (textElement) {
            try {
                textElement.focus()
                document.execCommand('insertText', false, text)
                await 200
                const button = document.querySelector(
                    'button[data-testid="send-button"]'
                )
                if (button) {
                    button.click()
                    return
                } else {
                    const enterKeyEvent = new KeyboardEvent('keydown', {
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13,
                        bubbles: true,
                        cancelable: true,
                    })
                    document.dispatchEvent(enterKeyEvent)
                }
            } catch {
                let t = makeToast(
                    '! Error in prompting automation. Try it again, or report an issue!',
                    '#ffcccc'
                )
                await timeout(3000)
                t.remove()
                return false
            }
            return true
        }
        let t = makeToast(
            '! Error in prompting automation. Try it again, or report an issue!',
            '#ffcccc'
        )
        await timeout(3000)
        t.remove()
        return false
    } else {
        return false
    }
}

document.addEventListener('selectionchange', function () {
    var selection = window.getSelection().toString().trim()
    browser.runtime.sendMessage({
        type: 'updateContextMenu',
        selection:
            selection.substring(0, 10) + (selection.length > 10 ? '...' : ''),
    })
})

console.log('content script loaded')
