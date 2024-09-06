import { ConnectionState } from './lib/connection';

interface Inactive {
  type: "INACTIVE";
}

interface Active {
  type: "ACTIVE";
  connectionState: ConnectionState;
}

type UIState = Inactive | Active;

const initialState: UIState = { type: "INACTIVE" };

function render(state: UIState) {
    const root = document.querySelector<HTMLElement>('#content-root');
    if (!root) {
        return;
    }

    while (root.firstChild) {
        root.removeChild(root.firstChild);
    }

    if (state.type === "INACTIVE") {
        root.appendChild(document.createTextNode("Not enabled"))
        return;
    }

    root.appendChild(document.createTextNode("Enabled"))
}

window.addEventListener('DOMContentLoaded', async () => {
    render(initialState);

    try {
        const port = chrome.runtime.connect({ name: "knockknock" });
        port.onMessage.addListener(function(connectionState: ConnectionState) {
            const newState: UIState = {
                type: "ACTIVE",
                connectionState,
            };
            render(newState);
        });
    } catch(e) {
        console.log(`[side-panel] Got error when trying to connect`);
    }
})
