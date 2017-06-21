var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require("path");

var calculator = require("./calculator");

var usernames = {};
var moves = [];
var activeCard = [];
var hp = {};
var history = '';
var turn = 1;

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/welcome.html');
});

app.get('/rules', function(req, res) {
    res.sendFile(__dirname + '/rules.html');
});

app.get('/game', function(req, res) {
    res.sendFile(__dirname + '/index.html');
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
    });

    socket.on('join room', function(roomname) {
        socket.join(roomname);
        io.to(roomname).emit('start game');
    });

    socket.on('set hp', function(name, vals) {
        hp[[name]] = vals;
    });

    socket.on('use move', function(name, move, card, active) {
        moves.push({'username': name, 'move': move, 'card': card});
        activeCard.push(active);
        history += '<b>' + name + ':</b> ' + active + ' used ' + move + "<br>";

        if (moves.length == 2) {
            var damages = calculator.calculate(moves);
            hp[[moves[0].username]][[activeCard[0]]].hp -= damages[0];
            hp[[moves[1].username]][[activeCard[1]]].hp -= damages[1];

            moves = [];
            activeCard = [];
            io.emit('update', hp, history, turn++);
            history = "";
        }
    });

    socket.on('disconnect', function(){
        console.log(socket.username + ' has disconnected');
        delete usernames[socket.username];
        moves = [];
        activeCard = [];
        hp = {};
        history = '';
        turn = 1;
        io.emit('users', usernames);
    });
});

http.listen(process.env.PORT || 3000, function(){
    console.log('listening on *:3000');
});
