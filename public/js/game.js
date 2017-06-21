$(document).ready(function() {
    var name, opponent;
    var roomname;
    var socket;
    var $login = $("#login");
    var selection = DEFAULT_SELECTION;

    var activeCard, opponentCard, timer;

    var canvas, c, grd;

    var width, height, i;

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
                        opponent = this.id.substring(4, this.id.length);
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
                roomname = this.id.substring(2, this.id.length);
                opponent = opponentName;
                socket.emit('accept', roomname, name);
                socket.emit('join room', roomname);

            });
        });

        socket.on('accepted challenge', function() {
            socket.emit('join room', name);
            roomname = name;
        });

        socket.on('start game', function() {
            $("#body").load("index.html", function() {
                // Instantiate game screen vars
                canvas = document.getElementById("timer");
                c = canvas.getContext('2d');
                grd = c.createLinearGradient(-100,0,200,0);
                grd.addColorStop(0,"white");
                grd.addColorStop(1,"red");
                c.fillStyle = grd;
                width = canvas.width;
                height = canvas.height;
                i = width;

                $("#selections .panel").on("click", function(e) {
                    if (e.target.classList.contains("card")) {
                        selection = e.target.id;
                        $("#nextMove")[0].innerText = "Switch to " + e.target.innerText;
                    } else {
                        selection = e.target.id;
                        $("#nextMove")[0].innerText = "Use " + e.target.innerText;
                    }
                });

                var hpValues = {};
                $(".cards .card").each(function() {
                    hpValues[[this.innerText]] = {"hp": cards[this.innerText].hp};
                });
                socket.emit('set hp', name, hpValues, roomname);
                activeCard = $("#activePlayer")[0].innerText;
                opponentCard = $("#activeOpponent")[0].innerText;
                $("#playerHP")[0].innerText = cards[[activeCard]].hp;
                $("#opponentHP")[0].innerText = cards[[opponentCard]].hp;
                timer = window.setInterval(updateTimer, TIMER_SPEED);
            });
        });

        function updateTimer() { // update to use room
            c.clearRect(0, 0, width, height);
            c.fillRect(width - i, 0, i--, height);
            if (i < 0) { // timer runs out
                window.clearInterval(timer);

                var card = cards[activeCard];

                socket.emit('use move', name, selection, card, activeCard, roomname);

                selection = DEFAULT_SELECTION;
                i = width;
                $("#nextMove")[0].innerText = "Your next move is...";
            }
        }

        socket.on('update', function(hp, history, turn) {
            var row = document.createElement("tr");
            var text = document.createElement("td");
            text.innerHTML = '<p><b class="turn">Turn ' + turn + '<b></p>';
            row.appendChild(text);
            $("#history")[0].appendChild(row);

            var row = document.createElement("tr");
            var text = document.createElement("td");
            text.innerHTML = history;
            row.appendChild(text);

            $("#history")[0].appendChild(row);

            $("#playerHP")[0].innerText = hp[[name]][[activeCard]].hp;
            $("#opponentHP")[0].innerText = hp[[opponent]][[opponentCard]].hp;
            if (hp[[name]][[activeCard]].hp > 0 && hp[[opponent]][[opponentCard]].hp > 0) {
                timer = window.setInterval(updateTimer, TIMER_SPEED);
            }
        });
    });
});
