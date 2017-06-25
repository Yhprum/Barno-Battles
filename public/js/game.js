$(document).ready(function() {
    var name, opponent;
    var roomname;
    var socket;
    var $login = $("#login");
    var $usernameInput = $("#username");
    var selection = DEFAULT_SELECTION;

    // default deck for testing
    var deck = ["Yhprum", "Klinestife", "Jloysnenph", "MDao", "Synchron", "Wumpa"];
    var canSwitch = [1, 1, 1, 1, 1, 1]; // value is 0 if it has 0 hp, indexes correspond to deck
    var activeCard, activeOpponent, timer;
    var $activeCard, $activeOpponent;

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

        socket.on('users', function(usernames) { // update user list
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

        socket.on('battles', function(rooms) { // update ongoing battles list
            $("#battles").empty();
            for (var room in rooms) {
                if (rooms.hasOwnProperty(room)) {
                    var battleTitle = rooms[[room]].players[0] + " vs. " + rooms[[room]].players[1];
                    $("#battles").append("<li class='list-group-item'>" + battleTitle + "<button id='batl" + room + "' style='float: right'>Spectate</button></li>");
                    $("#batl" + room).on('click', function() {
                        // spectate
                        alert("Currently not supported");
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
                $activeCard = document.getElementById('activePlayer');
                $activeOpponent = document.getElementById('activeOpponent');
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
                    $("#card" + i).attr({
                        src: 'cards/' + deck[i] + '.png',
                        name: deck[i]
                    });
                }
                $("#activePlayer").attr({
                    src: 'cards/' + deck[0] + '.png',
                    name: deck[0]
                });
                $("#activeOpponent").attr({ // TODO: change to get from opponent on game start
                    src: 'cards/' + deck[0] + '.png',
                    name: deck[0]
                });

                $("#selections .panel").on("click", function(e) {
                    if (e.target.id.includes("card")) { // TODO: add text for defeated cards
                        if (e.target.name == activeCard) {
                            $("#nextMove")[0].innerText = e.target.name + " is already in battle!";
                        } else {
                            selection = e.target.id;
                            $("#nextMove")[0].innerText = "Switch to " + e.target.name;
                        }
                    } else {
                        selection = e.target.id;
                        $("#nextMove")[0].innerText = "Use " + e.target.innerText;
                    }
                });

                var hpValues = {};
                $(".cards .card img").each(function() {
                    hpValues[[this.name]] = {"hp": cards[this.name].hp};
                });
                socket.emit('set hp', name, hpValues, roomname);
                activeCard = $activeCard.name;
                activeOpponent = $activeOpponent.name;
                $("#playerHP")[0].innerText = cards[[activeCard]].hp;
                $("#opponentHP")[0].innerText = cards[[activeOpponent]].hp;
                timer = window.setInterval(updateTimer, TIMER_SPEED);
            });
        });

        function updateTimer() { // update to use room
            c.clearRect(0, 0, width, height);
            c.fillRect(width - i, 0, i--, height);
            if (i < 0) { // timer runs out
                window.clearInterval(timer);
                if (selection.includes("card")) { // Switch cards
                    activeCard = $("#" + selection)[0].name;
                }

                var card = cards[activeCard];

                socket.emit('use move', name, selection, card, activeCard, roomname);

                selection = DEFAULT_SELECTION;
                i = width;
                $("#nextMove")[0].innerText = "Your next move is...";
            }
        }

        socket.on('update', function(hp, history, turn, cardsByPlayer) {
            let row = document.createElement("tr");
            let text = document.createElement("td");
            text.innerHTML = '<b class="turn">Turn ' + turn + '</b>';
            row.appendChild(text);
            $("#history")[0].appendChild(row);

            row = document.createElement("tr");
            text = document.createElement("td");
            text.innerHTML = history;
            row.appendChild(text);

            $("#history")[0].appendChild(row);

            // populate active cards in game area
            activeOpponent = cardsByPlayer[[opponent]];
            $("#activePlayer").attr({
                src: 'cards/' + activeCard + '.png',
                name: activeCard
            });
            $("#activeOpponent").attr({
                src: 'cards/' + activeOpponent + '.png',
                name: activeOpponent
            });

            $("#playerHP")[0].innerText = hp[[name]][[activeCard]].hp;
            $("#opponentHP")[0].innerText = hp[[opponent]][[activeOpponent]].hp;
            if (hp[[name]][[activeCard]].hp > 0 && hp[[opponent]][[activeOpponent]].hp > 0) {
                timer = window.setInterval(updateTimer, TIMER_SPEED);
            } else { // card is defeated
                if (hp[[name]][[activeCard]].hp <= 0) { // it's the player's card that is defeated
                    // TODO: disable clicking on moves, create default selection
                    // also disble clicking on defeated cards
                    canSwitch[deck.indexOf(activeCard)] = 0;
                    if (canSwitch.indexOf(1) == -1) { // you lose!
                        socket.emit('game end', roomname, opponent); // TODO: broadcast to room?
                        alert("You lose!");
                        $("#body").load("home.html", function() { // TODO: both sockets need to leave the room
                            socket.emit('update');
                        });
                    } else {
                        $("#nextMove")[0].innerText = activeCard + " has been defeated!";
                        timer = window.setInterval(switchCardTimer, SWITCH_TIMER_SPEED);
                    }
                } else { // if it's the opponents card that is defeated, just wait
                    $("#nextMove")[0].innerText = "Waiting for opponent...";
                }
            }
        });

        socket.on('opponent switched', function(newActive, hp) {
            activeOpponent = newActive;
            $("#activeOpponent").attr({
                src: 'cards/' + activeOpponent + '.png',
                name: activeOpponent
            });
            $("#opponentHP")[0].innerText = hp[[opponent]][[activeOpponent]].hp;
            timer = window.setInterval(updateTimer, TIMER_SPEED);
        });

        function switchCardTimer() {
            c.clearRect(0, 0, width, height);
            c.fillRect(width - i, 0, i--, height);
            if (i < 0) { // timer runs out
                window.clearInterval(timer);
                if (!selection.includes("card")) { // If nothing selected, pick the 1st available
                    for (let j = 0; j < canSwitch.length; j++) {
                        if (canSwitch[j]) {
                            selection = "card" + j;
                            break;
                        }
                    }
                }
                // switch cards
                activeCard = $("#" + selection)[0].name;
                $("#activePlayer").attr({
                    src: 'cards/' + activeCard + '.png',
                    name: activeCard
                });

                socket.emit('switch card', roomname, opponent, activeCard, function(hp) {
                    $("#playerHP")[0].innerText = hp[[name]][[activeCard]].hp;
                });
                selection = DEFAULT_SELECTION;
                i = width;
                $("#nextMove")[0].innerText = "Your next move is...";
                timer = window.setInterval(updateTimer, TIMER_SPEED);
            }
        }

        socket.on('leave game', function(str) {
            alert(str);
            $("#body").load("home.html", function() {
                socket.emit('update');
            });
        });
    }
});
