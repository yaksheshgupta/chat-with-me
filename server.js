const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 9952 });
const groups = {}; // Fresh on each server run

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const parsedMessage = JSON.parse(message);

    switch (parsedMessage.type) {
      case 'setName':
        ws.username = parsedMessage.data;
        console.log(`Client connected with name: ${ws.username}`);
        break;

      case 'createGroup':
        if (!groups[parsedMessage.data]) {
          groups[parsedMessage.data] = [];
          console.log(`Group created: ${parsedMessage.data}`);
        }
        // No need to call joinGroup here, creation only sets up the group.
        break;

      case 'joinGroup':
        if (groups[parsedMessage.data]) {
          joinGroup(ws, parsedMessage.data);
        } else {
          ws.send(JSON.stringify({ type: 'error', data: `Group '${parsedMessage.data}' does not exist.` }));
        }
        break;

      case 'message':
        const { group, data } = parsedMessage;
        if (groups[group] && groups[group].includes(ws.username)) {
          sendMessageToGroup(group, { userName: ws.username, data });
        }
        break;
    }
  });

  ws.on('close', () => {
    console.log(`Client disconnected: ${ws.username || 'Unknown'}`);
    removeFromGroups(ws);
  });
});

console.log('Server is running on ws://localhost:9952');

function joinGroup(ws, groupName) {
  if (!groups[groupName].includes(ws.username)) {
    groups[groupName].push(ws.username);
    console.log(`${ws.username} joined group ${groupName}`);
    sendGroupParticipants(groupName);
  } else {
    console.log(`${ws.username} is already in group ${groupName}`);
    ws.send(JSON.stringify({ type: 'error', data: `You are already in the group '${groupName}'.` }));
  }
}

function sendMessageToGroup(groupName, message) {
  for (let client of wss.clients) {
    if (client.readyState === WebSocket.OPEN && groups[groupName].includes(client.username)) {
      client.send(JSON.stringify({ type: 'message', ...message }));
    }
  }
}

function sendGroupParticipants(groupName) {
  const participantNames = groups[groupName];
  for (let client of wss.clients) {
    if (client.readyState === WebSocket.OPEN && groups[groupName].includes(client.username)) {
      client.send(JSON.stringify({ type: 'participants', data: participantNames }));
    }
  }
}

function removeFromGroups(ws) {
  for (let groupName in groups) {
    const index = groups[groupName].indexOf(ws.username);
    if (index !== -1) {
      groups[groupName].splice(index, 1);
      console.log(`${ws.username} left group ${groupName}`);
      sendGroupParticipants(groupName);
    }
  }
}