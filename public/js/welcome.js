
var name;


$(document).ready(function() {
    var socket = io();
    var $login = $("#login");
    $login.on('click', function() {
        name = prompt("Pick a username");
        socket.emit('login', name);
        $login.off('click');
        $login.hide();
    });
    socket.on('users', function(usernames) {
        $("#online").empty();
        for (var username in usernames) {
            if (username != name) {
                $("#online").append("<li class='list-group-item'>" + username + "<button style='float: right'>Request</button></li>");
            } else {
                $("#online").append("<li class='list-group-item'>" + username + "</li>")
            }
        }
    });
});