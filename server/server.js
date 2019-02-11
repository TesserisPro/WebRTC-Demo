var express = require('express');
var app = express();

var fs = require('fs');

var http = require('http');

var users = 0;

var disconnectedUsers = 0;

var io = require('socket.io');

var openedSockets = [];

var server = http.createServer(app);

app.use(express.static(__dirname + '/../public/'));

exports.run = function (config) {
    server.listen(config.PORT);
    console.log('Listening on', config.PORT);

    var serverSocket = io.listen(server, { log: false });
    serverSocket.on('connection', function (socket) {

        console.info('peer connected');

        socket.on('init', function (data, fn) {
            var id = users++;
            fn(id);
            openedSockets.forEach(function (s) {
                s.emit('newPeer', { id: id, socketId: socket.id });
            })

            openedSockets.push(socket);
            if (users == 1 || users == disconnectedUsers) {
                socket.emit('init', true);
            }
        });

        socket.on('message', function (message) {
            console.log('message to: ' + message.to);
            console.log('message type: ' + message.type);

            var sock = openedSockets[parseInt(message.to, 10)];

            if (sock) {
                message.socketId = socket.id;
                sock.emit('message', message);
            }
        });

        socket.on('disconnect', function () {
            var id = socket.id;

            disconnectedUsers++;

            var index = openedSockets.indexOf(socket);
            if(index> 0){
                delete openedSockets[index];
            }

            openedSockets.forEach(function (s) {
                s.emit('disconnected', id);
                if (users == disconnectedUsers) {
                    s.emit('init', true);
                }
            })            

            console.log('peer disconnected');
        });
    })
}