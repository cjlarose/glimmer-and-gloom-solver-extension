// https://stackoverflow.com/a/74119151/1231384
async function setUI() {
    let tabData = await chrome.tabs.query({ active: true, currentWindow: true })
    let tabId = tabData[0].id // tabs.query returns an array, but we filtered to active tab within current window which yields only 1 object in the array

    chrome.tabs.sendMessage(tabId, {
        'message': 'isSupported'
    }, (response) => {
        // response will be true if the message was successfuly sent to the tab and "undefined" if the message was never received (i.e. not supported w/ your content script)
        if (response) return showActiveHTML()
        // else
        showInactiveHTML()
    })

}

function showActiveHTML() {
    document.querySelector('#active').style['display'] = ''
}

function showInactiveHTML() {
    document.querySelector('#inactive').style['display'] = ''
}

window.addEventListener('DOMContentLoaded', () => {
    setUI()
})
