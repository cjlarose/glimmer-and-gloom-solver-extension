interface Inactive {
  "type": "INACTIVE";
}

interface Active {
  "type": "ACTIVE";
}

type UIState = Inactive | Active;

function render(state: UIState) {
    const root = document.querySelector<HTMLElement>('#content-root');
    if (!root) {
        return;
    }

    if (state.type === "INACTIVE") {
        root.appendChild(document.createTextNode("Not enabled"))
        return;
    }

    root.appendChild(document.createTextNode("Enabled"))
}

window.addEventListener('DOMContentLoaded', async () => {
    let tabData = await chrome.tabs.query({ active: true, currentWindow: true });
    let tabId = tabData[0].id;
    if (!tabId) {
        return;
    }

    chrome.tabs.sendMessage(tabId, {
        'message': 'isSupported'
    }, (isSupported) => {
        const state: UIState = isSupported ? { type: "ACTIVE" } : { type: "INACTIVE" };
        render(state);
    })
})
