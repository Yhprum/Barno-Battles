var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require("path");

var calculator = require("./calculator");

var usernames = {};
var rooms = {};

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/welcome.html');
});

app.get('/rules', function(req, res) {
    res.sendFile(__dirname + '/rules.html');
});

app.get('/gandalf', function(req, res) {
    res.sendFile(__dirname + '/gandalf.html');
});

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', function(socket) {

    socket.on('login', function(name) {
        socket.username = name;
        usernames[name] = socket.id;
        console.log(name + ' has connected');
        io.emit('users', usernames);
    });

    socket.on('challenge', function(opponentName, challenger) {
        io.to(usernames[[opponentName]]).emit('challenge', challenger);
    });

    socket.on('accept', function(opponentName) {
        io.to(usernames[[opponentName]]).emit('accepted challenge');
        rooms[[opponentName]] = {};
        rooms[[opponentName]]['hp'] = {};
        rooms[[opponentName]]['turn'] = 1;
        rooms[[opponentName]]['activeCards'] = [];
        rooms[[opponentName]]['moves'] = [];
        rooms[[opponentName]]['history'] = '';
    });

    socket.on('join room', function(roomname) {
        socket.join(roomname);
        rooms[[roomname]]['hp'][[socket.username]] = {};
        io.to(usernames[socket.username]).emit('start game');
    });

    socket.on('set hp', function(name, vals, roomname) {
        rooms[[roomname]]['hp'][[name]] = vals;
    });

    socket.on('use move', function(name, move, card, active, roomname) {
        rooms[[roomname]]['moves'].push({'username': name, 'move': move, 'card': card});
        rooms[[roomname]]['activeCards'].push(active);
        rooms[[roomname]].history += '<b>' + name + ':</b> ' + active + ' used ' + move + "<br>";

        if (rooms[[roomname]]['moves'].length == 2) {
            var damages = calculator.calculate(rooms[[roomname]]['moves']);
            var active0 = rooms[[roomname]]['activeCards'][0];
            var active1 = rooms[[roomname]]['activeCards'][1];
            var player0 = rooms[[roomname]]['moves'][0].username;
            var player1 = rooms[[roomname]]['moves'][1].username;

            rooms[[roomname]]['hp'][[player0]][[active0]].hp -= damages[0];
            rooms[[roomname]]['hp'][[player1]][[active1]].hp -= damages[1];

            rooms[[roomname]]['moves'] = [];
            rooms[[roomname]]['activeCards'] = [];
            io.to(roomname).emit('update', rooms[[roomname]]['hp'], rooms[[roomname]].history, rooms[[roomname]].turn);
            rooms[[roomname]].turn += 1;
            rooms[[roomname]].history = "";
        }
    });

    socket.on('disconnect', function(){
        console.log(socket.username + ' has disconnected');
        delete usernames[socket.username];
        io.emit('users', usernames);
    });
});

http.listen(process.env.PORT || 3000, function(){
    console.log('listening on *:3000');
});
