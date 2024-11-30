const WebSocket = require('ws');
const readline = require('readline');

const ws = new WebSocket('ws://localhost:8080');
let userName;
let currentGroup;

// Define a set of colors
const colors = [
  '\x1b[31m', // Red
  '\x1b[32m', // Green
  '\x1b[33m', // Yellow
  '\x1b[34m', // Blue
  '\x1b[35m', // Magenta
  '\x1b[36m', // Cyan
];
const resetColor = '\x1b[0m';

const userColors = {};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

ws.on('open', () => {
  rl.question('Enter your name: ', (name) => {
    userName = name.trim();
    ws.send(JSON.stringify({ type: 'setName', data: userName }));
    console.log(`Welcome, ${userName}!`);
    showGroupOptions();
  });
});

function showGroupOptions() {
  console.log('\n1. Create a new group');
  console.log('2. Join an existing group');
  console.log('Choose an option: ');

  rl.question('', (option) => {
    rl.question('Enter group name: ', (group) => {
      currentGroup = group.trim();
      if (currentGroup.length === 0) {
        console.log("Group name cannot be empty.");
        return showGroupOptions();
      }
      if (option === '1') {
        ws.send(JSON.stringify({ type: 'createGroup', data: currentGroup }));
        startChatting();
      } else if (option === '2') {
        ws.send(JSON.stringify({ type: 'joinGroup', data: currentGroup }));
        startChatting();
      } else {
        console.log('Invalid option.');
        showGroupOptions();
      }
    });
  });
}

function startChatting() {
  console.log(`Joined group ${currentGroup}. You can start chatting now.`);
  rl.on('line', (line) => {
    if (line.trim().length > 0 && currentGroup) {
      ws.send(JSON.stringify({ type: 'message', group: currentGroup, data: line }));
    }
  });
  
  rl.on('SIGINT', () => {
    console.log("\nExiting chat...");
    ws.close();
    rl.close();
  });
}

ws.on('message', (data) => {
  const message = JSON.parse(data);
  if (message.type === 'message') {
    process.stdout.write('\r\x1b[K');  // clear the line
    if (!userColors[message.userName]) {
      const color = colors[Object.keys(userColors).length % colors.length];
      userColors[message.userName] = color;
    }
    const userColor = userColors[message.userName];
    console.log(`${userColor}${message.userName}${resetColor}: ${message.data}`);
    rl.prompt();
  } else if (message.type === 'participants') {
    console.log(`Participants in ${currentGroup}: ${message.data.join(', ')}`);
    rl.prompt();
  } else if (message.type === 'error') {
    console.log(`Error: ${message.data}`);
    showGroupOptions();
  }
});

ws.on('close', () => {
  console.log('Disconnected from the server');
  process.exit(0);
});
