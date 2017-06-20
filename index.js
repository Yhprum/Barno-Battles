var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require("path");

var calculator = require("./calculator");

var usernames = {}; // change to array? why tf am I using an object
var moves = [];
var activeCard = [];
var hp = {};

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', function(socket) {
    //io.emit("login");
    if (Object.keys(usernames).length == 2) {
        io.emit('room full');
        io.emit('user list', usernames);
    }

    socket.on('login', function(name) {
        if (Object.keys(usernames).length == 2) {
            io.emit('room full');
            io.emit('user list', usernames);
        } else {
            socket.username = name;
            usernames[name] = name;
            console.log(name + ' has connected');
            if (Object.keys(usernames).length == 2) {
                //make a button visible or some shit
                io.emit('start', usernames);
            }
        }
    });

    socket.on('set hp', function(name, vals) {
        hp[[name]] = vals;
    });
    // socket.on('get hp', function(name, vals, fn) {
    //     hp[[name]] = vals;
    //     fn(hp);
    // });

    socket.on('use move', function(name, move, card, active) {
        moves.push({'username': name, 'move': move, 'card': card});
        activeCard.push(active);

        io.emit('update history', name, move, card);

        if (moves.length == 2) {
            var damages = calculator.calculate(moves);
            hp[[moves[0].username]][[activeCard[0]]].hp -= damages[0];
            hp[[moves[1].username]][[activeCard[1]]].hp -= damages[1];

            moves = [];
            activeCard = [];
            io.emit('update', hp);
        }
    });

    socket.on('disconnect', function(){
        console.log(socket.username + ' has disconnected');
        delete usernames[socket.username];
        moves = [];
    });
});

http.listen(process.env.PORT || 3000, function(){
    console.log('listening on *:3000');
});
