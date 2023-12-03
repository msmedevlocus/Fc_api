const { createServer } = require("http");
const express = require('express');
const { Server } = require("socket.io");
const cors = require('cors');

const { addUser, removeUser, getUser, getUsersInRoom } = require('./users');

const router = require('./router');

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: {
  origin:["https://fast-chat.netlify.app",'http://localhost:3006'],
  credentials: true
},
maxHttpBufferSize: 1e7

});

app.use(router);

io.on('connect', (socket) => {
  socket.on('join', ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });

    if(error) return callback(error);

    socket.join(user.room);

    socket.emit('message', { user: 'admin', text: `${user.name}, welcome to room ${user.room}.`});
    socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${user.name} has joined!` });

    io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });

    callback();
  });

  socket.on('sendMessage', (message , callback) => {
    const user = getUser(socket.id);
    if(!user || !user.room) return callback('there is an error please restart.');
    if (message.type) {
    io.to(user.room).emit('message', {...message , user: user.name });
    }else{
      io.to(user.room).emit('message', { user: user.name, text: message });
    }
    callback();
  });

  // Listen typing events
  socket.on("start typing message", (data , callback) => {
    console.log(data);
        const user = getUser(socket.id);
       if(!user || !user.room) return callback('there is an error please restart.');
        io.to(user.room).emit("start typing message", data);
        callback();
  });

  socket.on("stop typing message", (data , callback) => {
        const user = getUser(socket.id);
        if(!user || !user.room) return callback('there is an error please restart.');
        io.to(user.room).emit("stop typing message", data);
        callback();
  });

  socket.on('disconnect', () => {
    const user = removeUser(socket.id);

    if(user) {
      io.to(user.room).emit('message', { user: 'Admin', text: `${user.name} has left.` });
      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room)});
    }
  })
});

server.listen(process.env.PORT || 5000, () => console.log(`Server has started.`));