const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = 3002;

const USERS_FILE = path.join(__dirname, 'users.json');
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '{}');

const loadUsers = () => JSON.parse(fs.readFileSync(USERS_FILE));
const saveUsers = (users) => fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

app.use(express.static(path.join(__dirname, 'public')));

// Redirection racine vers le login
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

io.on('connection', (socket) => {
  socket.on('register', ({ username, password }) => {
    const users = loadUsers();
    if (users[username]) {
      socket.emit('register error', 'Utilisateur déjà existant.');
    } else {
      users[username] = { password };
      saveUsers(users);
      socket.emit('register success');
    }
  });

  socket.on('login', ({ username, password }) => {
    const users = loadUsers();
    if (!users[username] || users[username].password !== password) {
      socket.emit('login error', 'Identifiants invalides.');
    } else {
      socket.username = username;
      socket.emit('login success', username);
      io.emit('chat message', `${username} a rejoint le chat.`);
    }
  });

  socket.on('reconnect username', (username) => {
    socket.username = username;
  });

  socket.on('chat message', (msg) => {
    if (socket.username) {
      io.emit('chat message', `${socket.username} : ${msg}`);
    } else {
      socket.emit('chat message', 'Veuillez vous connecter.');
    }
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      io.emit('chat message', `${socket.username} a quitté le chat.`);
    }
  });
});

server.listen(PORT, () => console.log(`Serveur en écoute sur http://localhost:${PORT}`));
