$(document).ready(function() {
    var name;
    var socket;
    var $login = $("#login");

    $login.on('click', function() {
        socket = io();
        name = prompt("Pick a username");
        socket.emit('login', name);
        $login.off('click');
        $login.hide();

        socket.on('users', function(usernames) {
            $("#online").empty();
            for (var username in usernames) {
                if (username != name) {
                    $("#online").append("<li class='list-group-item'>" + username + "<button id='chal" + username + "' style='float: right'>Request</button></li>");
                    $("#chal" + username).on('click', function() {
                        var opponent = this.id.substring(4, this.id.length);
                        socket.emit('challenge', opponent, name);
                        $("#chal" + opponent).hide();
                    });
                } else {
                    $("#online").append("<li class='list-group-item'>" + username + "</li>")
                }
            }
        });

        socket.on('challenge', function(opponentName) {
            $("#challenges").append("<li class='list-group-item'>" + opponentName + "<button id=ac" + opponentName + " style='float: right'>Accept</button></li>");
            $("#ac" + opponentName).on('click', function() {
                socket.emit('accept', this.id.substring(2, this.id.length), name);
                socket.emit('join room', this.id.substring(2, this.id.length));
            });
        });

        socket.on('accepted challenge', function() {
            socket.emit('join room', name);
        });

        socket.on('start game', function() {
            $("#body").load("index.html");
        });
    });
});

/*
room syntax
---
roomname = 'string'
socket.join(roomname);
socket.leave(roomname);

io.to(roomname).emit('event', args)
*/