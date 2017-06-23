$(document).ready(function() {
    var name, opponent;
    var roomname;
    var socket;
    var $login = $("#login");
    var $usernameInput = $("#username");
    var selection = DEFAULT_SELECTION;

    // default deck for testing
    var deck = ["Yhprum", "Klinestife", "Jloysnenph", "MDao", "Synchron", "Wumpa"];
    var activeCard, opponentCard, timer;
    var $activeCard;

    var canvas, c, grd;

    var width, height, i;

    $("#open").on('click', function() {
        document.getElementById("loginMenu").classList.toggle("show");
        $usernameInput.focus();
    });
    $login.on('click', function() {
        verify();
    });
    $usernameInput.on('keyup', function (e) {
        if (e.keyCode === 13) {
            verify();
        }
    });

    function verify() {
        name = $usernameInput.val().trim();
        if (name) {
            $("#loginDropdown").remove();
            login();
        }
    }

    function login() {
        socket = io();
        socket.emit('login', name);

        socket.on('users', function(usernames) {
            $("#online").empty();
            for (var username in usernames) {
                if (usernames.hasOwnProperty(username)) {
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
            }
        });

        socket.on('battles', function(rooms) {
            $("#battles").empty();
            for (var room in rooms) {
                if (rooms.hasOwnProperty(room)) {
                    var battleTitle = rooms[[room]].players[0] + " vs. " + rooms[[room]].players[1];
                    $("#battles").append("<li class='list-group-item'>" + battleTitle + "<button id='batl" + room + "' style='float: right'>Spectate</button></li>");
                    $("#batl" + room).on('click', function() {
                        // spectate
                    });
                }
            }
        });

        socket.on('challenge', function(opponentName) {
            $("#challenges").append("<li class='list-group-item'>" + opponentName + "<button id=ac" + opponentName + " style='float: right'>Accept</button></li>");
            $("#ac" + opponentName).on('click', function() {
                roomname = this.id.substring(2, this.id.length);
                opponent = opponentName;
                socket.emit('accept', roomname, name, opponent);
                socket.emit('join room', roomname);

            });
        });

        socket.on('accepted challenge', function() {
            socket.emit('join room', name);
            roomname = name;
        });

        socket.on('start game', function() {
            $("#body").load("game.html", function() {
                // Instantiate game screen vars
                $activeCard = $("#activePlayer")[0];
                canvas = document.getElementById("timer");
                c = canvas.getContext('2d');
                grd = c.createLinearGradient(-100,0,200,0);
                grd.addColorStop(0,"white");
                grd.addColorStop(1,"red");
                c.fillStyle = grd;
                width = canvas.width;
                height = canvas.height;
                i = width;

                for (let i = 0; i < 6; i++) { // populate your cards
                    document.getElementById("card" + i).innerText = deck[i];
                }

                $("#selections .panel").on("click", function(e) {
                    if (e.target.classList.contains("card")) {
                        if (e.target.innerText == activeCard) {
                            $("#nextMove")[0].innerText = e.target.innerText + " is already in battle!";
                        } else {
                            //selection = "no damage";
                            selection = e.target.id;
                            $("#nextMove")[0].innerText = "Switch to " + e.target.innerText;
                        }
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
                if (selection.includes("card")) { // Switch cards
                    activeCard = $("#" + selection)[0].innerText;
                    //$activeCard.innerText = activeCard;
                }

                var card = cards[activeCard];

                socket.emit('use move', name, selection, card, activeCard, roomname);

                selection = DEFAULT_SELECTION;
                i = width;
                $("#nextMove")[0].innerText = "Your next move is...";
            }
        }

        socket.on('update', function(hp, history, turn) {
            let row = document.createElement("tr");
            let text = document.createElement("td");
            text.innerHTML = '<p><b class="turn">Turn ' + turn + '<b></p>';
            row.appendChild(text);
            $("#history")[0].appendChild(row);

            row = document.createElement("tr");
            text = document.createElement("td");
            text.innerHTML = history;
            row.appendChild(text);

            $("#history")[0].appendChild(row);

            $("#playerHP")[0].innerText = hp[[name]][[activeCard]].hp;
            $("#opponentHP")[0].innerText = hp[[opponent]][[opponentCard]].hp;
            if (hp[[name]][[activeCard]].hp > 0 && hp[[opponent]][[opponentCard]].hp > 0) {
                timer = window.setInterval(updateTimer, TIMER_SPEED);
            }
        });

        socket.on('leave game', function() {
            $("#body").load("home.html", function() {
                socket.emit('update');
            });
        });
    }
});
