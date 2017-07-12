var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require("path");

var calculator = require("./calculator");

var usernames = {};
var rooms = {};
var gameNumber = 0;

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
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
        io.emit('battles', rooms);
    });

    socket.on('challenge', function(opponentName, challenger) {
        io.to(usernames[[opponentName]]).emit('challenge', challenger);
    });

    socket.on('cancel', function(opponentName, name) {
        io.to(usernames[[opponentName]]).emit('cancelled challenge', name);
    });

    socket.on('accept', function(opponentName, name) {
        io.to(usernames[[opponentName]]).emit('accepted challenge', name);
        rooms[[opponentName]] = {};
        rooms[[opponentName]]['hp'] = {};
        rooms[[opponentName]]['turn'] = 1;
        rooms[[opponentName]]['activeCards'] = [];
        rooms[[opponentName]]['moves'] = [];
        rooms[[opponentName]]['history'] = '';
        rooms[[opponentName]]['players'] = [opponentName, name];
        rooms[[opponentName]]["gameNumber"] = gameNumber++;
    });

    socket.on('join room', function(roomname) {
        socket.join(roomname);
        rooms[[roomname]]['hp'][[socket.username]] = {};
        io.to(usernames[socket.username]).emit('start game', rooms[[roomname]].gameNumber);
        io.emit('battles', rooms);
    });

    socket.on('set hp', function(name, vals, roomname) {
        rooms[[roomname]]['hp'][[name]] = vals;
    });

    socket.on('use move', function(name, opponentName, move, card, active, roomname) {
        var cur = rooms[[roomname]];
        if(cur) {
            cur['moves'].push({'username': name, 'move': move, 'card': card});
            cur['activeCards'].push(active);
            if (move.includes("card")) {
                cur.history += "<b>" + name + ":</b> Switched to " + active + "<br>";
            } else {
                cur.history += "<b>" + name + ":</b> " + active + " used " + move + "<br>";
            }

            if (rooms[[roomname]]['moves'].length == 2) {
                let damages = calculator.calculate(rooms[[roomname]]['moves']);
                let active0 = cur['activeCards'][0];
                let active1 = cur['activeCards'][1];
                let player0 = cur['moves'][0].username;
                let player1 = cur['moves'][1].username;
                let cardsByPlayer = {
                    [cur['moves'][0].username]: cur['activeCards'][0],
                    [cur['moves'][1].username]: cur['activeCards'][1]
                }

                cur['hp'][[player0]][[active0]].hp -= damages[0];
                cur['hp'][[player1]][[active1]].hp -= damages[1];

                cur['moves'] = [];
                cur['activeCards'] = [];
                io.to(roomname).emit('update', cur['hp'], cur.history, cur.turn, cardsByPlayer);
                cur.turn += 1;
                cur.history = '';
            }
        } else {
            let str = opponentName + " has disconnected.<br>" + name + " is the winner!";
            io.to(roomname).emit('game end', str);
            socket.leave(roomname);
        }
    });

    socket.on('switch card', function(roomname, name, opponentName, newActive, fn) {
        if (rooms[[roomname]]) {
            fn(rooms[[roomname]]['hp']);
            io.to(usernames[[opponentName]]).emit('opponent switched', newActive, rooms[[roomname]]['hp']);
        } else {
            let str = opponentName + " has disconnected.<br>" + name + " is the winner!";
            io.to(roomname).emit('game end', str);
            socket.leave(roomname);
        }
    });

    socket.on('chat message', function (msg, name, roomname) {
        msg = name + ": " + msg;
        io.to(roomname).emit('chat message', msg);
    });

    socket.on('game end', function(roomname, winner) { // TODO: only delete room once everyone leaves?
        let str = winner + " is the winner!";
        io.to(roomname).emit('game end', str);
        delete rooms[roomname];
        io.emit('users', usernames);
        io.emit('battles', rooms);
    });

    socket.on('leave room', function(roomname) {
        socket.leave(roomname);
        if(rooms[roomname]) delete rooms[roomname];
        io.emit('users', usernames);
        io.emit('battles', rooms);
    });

    socket.on('disconnect', function(){
        console.log(socket.username + ' has disconnected');
        delete usernames[socket.username];
        for (var room in rooms) {
            if (rooms.hasOwnProperty(room)) {
                if (socket.username == rooms[[room]].players[0] || socket.username == rooms[[room]].players[1]) {
                    delete rooms[room];
                    break;
                }
            }
        }
        io.emit('users', usernames);
        io.emit('battles', rooms);
    });
});

http.listen(process.env.PORT || 3000, function(){
    console.log('listening on *:3000');
});
