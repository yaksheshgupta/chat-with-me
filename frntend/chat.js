export let ws;
export let username;  // Ensure username is exported for other functions
let currentGroup;
const userColors = {};
const colors = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4'];

// Function to set username from external sources, if needed
export function setUsername(user) {
    username = user;
}

export function joinChat() {
    const groupNameInput = document.getElementById('groupName');
    currentGroup = groupNameInput.value.trim();

    if (!username) {
        console.error('Username is not set');
        return;
    }

    if (!currentGroup) {
        alert('Please enter a group name.');
        return;
    }

    ws = new WebSocket('ws://localhost:8080');

    ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'setName', data: username }));
        ws.send(JSON.stringify({ type: 'createGroup', data: currentGroup }));
        ws.send(JSON.stringify({ type: 'joinGroup', data: currentGroup }));
    };

    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        switch (message.type) {
            case 'message':
                if (message.userName !== username) {
                    const userColor = getUserColor(message.userName);
                    updateChat(`${formatUsername(message.userName, userColor)}: ${message.data}`);
                }
                break;
            case 'participants':
                updateChat(`Participants: ${message.data.join(', ')}`);
                break;
            case 'error':
                alert(`Error: ${message.data}`);
                break;
            default:
                console.error('Unknown message type:', message.type);
        }
    };

    ws.onclose = () => updateChat('Disconnected from chat');
}

function formatUsername(userName, color) {
    return `<span style="color: ${color}">${userName}</span>`;
}

function getUserColor(userName) {
    if (!userColors[userName]) {
        userColors[userName] = colors[Object.keys(userColors).length % colors.length];
    }
    return userColors[userName];
}

export function updateChat(htmlText) {
    const chatBox = document.getElementById('chat');
    chatBox.innerHTML += `<div>${htmlText}</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
}

export function sendMessage(event) {
    if (event.key === 'Enter' && ws && ws.readyState === WebSocket.OPEN) {
        const messageInput = document.getElementById('message');
        const messageText = messageInput.value.trim();

        if (messageText) {
            ws.send(JSON.stringify({ type: 'message', group: currentGroup, data: messageText }));
            updateChat(`You: ${messageText}`);
            messageInput.value = '';
        }
    }
}