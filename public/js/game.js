$(document).ready(function() {
    var name, opponent;
    var roomname;
    var socket;
    var chatroom = "Lobby";
    var $login = $("#login");
    var $usernameInput = $("#username");
    var selection = DEFAULT_SELECTION;

    var $chatForm = $("#chatForm");

    // default deck
    var deck = ["Yhprum", "Klinestife", "Jloysnenph", "MDao", "Synchron", "Wumpa"];
    var canSwitch = [1, 1, 1, 1, 1, 1]; // value is 0 if it has 0 hp, indexes correspond to deck
    var activeCard, activeOpponent, timer;
    var $activeCard, $activeOpponent;
    var hpPlayer, hpOpponent;
    var nextMove;

    var canvas, c, grd;

    var width, height, i;

    var hash = window.location.hash;
    hash && $('#tabList a[href="' + hash + '"]').tab('show');

    var drag = $("#draggableCards");
    drag.sortable({
        update: function() {
            $('#draggableCards img', drag).each(function(index, elem) {
                var $listItem = $(elem),
                    newIndex = $listItem.index();
            });
        }
    });

    var unread = {"Lobby": 0, "Suggestions": 0};

    $("#chatrooms>a").click(function (e) {
        e.preventDefault();
        chatroom = this.name;
        $(this).siblings('a.active').removeClass("active");
        $(this).tab('show');
        document.getElementById("chatroomName").innerText = chatroom;
    });

    $chatForm.on('submit', function() {return false});

    $("#loginDropdown").on('shown.bs.dropdown', function() {
        $usernameInput.focus();
    });
    $login.on('click', function() {
        verify();
    });
    $usernameInput.on('keyup', function (e) {
        if (e.keyCode === 13) {
            verify();
            $("#headerButton").dropdown("toggle");
        }
    });

    function verify() { // TODO: make sure names can only be letters/numbers (or create escaping method which I don't wanna do)
        name = $usernameInput.val().trim(); // or change all the places where I used the name as an id
        if (name && name.match(/[\w]+/)[0] === name) { // change to server-side?
            login();
        } else {
            // display error
            alert("Names currently can only consist of letters, numbers, and _");
        }
    }

    function login() {
        socket = io();
        socket.emit('login', name);
        let dropdownItems = '<a class="dropdown-item" href="#">Profile</a>';
        dropdownItems += '<a class="dropdown-item" href="#">Placeholder</a>';
        dropdownItems += '<a class="dropdown-item" href="#" data-toggle="modal" data-target="#deckbuilder">Build Deck</a>'
        document.getElementById("headerButton").innerHTML = name;
        document.getElementById("headerButton").classList = "dropdown-toggle";
        document.getElementById("headerDropdown").innerHTML = dropdownItems;
        document.getElementById("chatroomInput").disabled = false;
        document.getElementById("chatroomInput").placeholder = "Chat to " + chatroom;

        $("#deckbuilder").on("hidden.bs.modal", function () {
            let i = 0;
            $("#deckbuilder img").each(function() {
                deck[i++] = this.name;
            });
        });

        $("#chatrooms>a").click(function (e) {
            e.preventDefault();
            chatroom = this.name;
            $(this).siblings('a.active').removeClass("active");
            $(this).tab('show');
            document.getElementById("chatroomName").innerText = chatroom;
            document.getElementById("chatroomInput").placeholder = "Chat to " + chatroom;
            document.getElementById("badge" + chatroom).innerText = 0
            unread[[chatroom]] = 0;
        });

        socket.on('users', function(usernames) { // update user list
            $("#online").empty();
            for (var username in usernames) {
                if (usernames.hasOwnProperty(username)) {
                    if (username != name) {
                        $("#online").append("<li class='list-group-item'>" + username + "<button id='chal" + username + "' class='pos-right'>Request</button></li>");
                        $("#chal" + username).on('click', function() {
                            opponent = this.id.substring(4, this.id.length);
                            socket.emit('challenge', opponent, name);
                            $("#chal" + opponent).hide();
                            $("#challenges").append("<li class='list-group-item'>To: " + opponent + "<button id=cancel" + opponent + " class='pos-right'>Cancel</button></li>");
                            $("#cancel" + opponent).on('click', function() {
                                this.parentNode.remove();
                                $("#chal" + opponent).show();
                                socket.emit('cancel', opponent, name);
                            });
                        });
                    } else {
                        //$("#online").append("<li class='list-group-item'>" + username + "</li>")
                    }
                }
            }
        });

        socket.on('battles', function(rooms) { // update ongoing battles list
            $("#battles").empty();
            for (var room in rooms) {
                if (rooms.hasOwnProperty(room)) {
                    var battleTitle = rooms[[room]].players[0] + " vs. " + rooms[[room]].players[1];
                    $("#battles").append("<li class='list-group-item'>" + battleTitle + "<button id='batl" + room + "' class='pos-right'>Spectate</button></li>");
                    $("#batl" + room).on('click', function() {
                        alert("Currently not supported");
                    });
                }
            }
        });

        socket.on('challenge', function(opponentName) {
            $("#challenges").append("<li class='list-group-item'>" + opponentName + "<button id=ac" + opponentName + " class='pos-right'>Accept</button></li>");
            $("#ac" + opponentName).on('click', function() {
                this.parentNode.remove();
                roomname = this.id.substring(2, this.id.length);
                opponent = opponentName;
                socket.emit('accept', roomname, name, opponent);
                socket.emit('join room', roomname);
            });
        });

        socket.on('cancelled challenge', function(opponentName) {
            document.getElementById("ac" + opponentName).parentElement.remove();
        });

        socket.on('accepted challenge', function(opponentName) {
            opponent = opponentName;
            document.getElementById("cancel" + opponent).parentElement.remove()
            socket.emit('join room', name);
            roomname = name;
        });

        socket.on('start game', function(gameNumber) {
            var gameTab = document.createElement("li");
            gameTab.classList = "nav-item";
            gameTab.innerHTML = "<a class='nav-link' data-toggle='tab' href='#game-" + gameNumber + "'>vs. " + opponent + "<span class='close'>&times;</span></a>"
            document.getElementById("tabList").appendChild(gameTab);

            var gameHTML = document.createElement("div");
            gameHTML.id = "game-" + gameNumber;
            gameHTML.classList = "tab-pane fade";
            document.getElementById("tabContent").appendChild(gameHTML);

            $("#game-" + gameNumber).load("game.html", function() {
                $('#tabList a[href="#game-' + gameNumber + '"]').tab('show');
                // Instantiate game screen vars
                $activeCard = document.getElementById('activePlayer');
                $activeOpponent = document.getElementById('activeOpponent');
                hpPlayer = document.getElementById('hpPlayer');
                hpOpponent = document.getElementById('hpOpponent');
                nextMove = document.getElementById('nextMove');
                canvas = document.getElementById("timer");
                c = canvas.getContext('2d');
                grd = c.createLinearGradient(-100,0,200,0);
                grd.addColorStop(0,"white");
                grd.addColorStop(1,"red");
                c.fillStyle = grd;
                width = canvas.width;
                height = canvas.height;
                i = width;

                document.getElementById("chatName").innerText = name;
                for (let i = 0; i < 6; i++) { // populate your cards
                    $("#card" + i).attr({
                        src: 'cards/' + deck[i] + '.png',
                        name: deck[i]
                    });
                    document.getElementById('hp' + i).innerText = cards[deck[i]].hp;
                    document.getElementById('atk' + i).innerText = cards[deck[i]].atk;
                    document.getElementById('def' + i).innerText = cards[deck[i]].def;
                }

                $("#selections .action").on("click", function(e) {
                    if (e.target.id.includes("ability")) { // TODO: remove after implementing abilities
                        nextMove.innerText = "Currently not supported";
                    } else {
                        selection = e.target.id;
                        nextMove.innerText = "Use " + e.target.innerText;
                    }
                });

                $("#selections .barno").on("click", function(e) {
                    let target = e.target;
                    if (!target.id.includes("card")) {
                        target = target.parentElement.lastElementChild;
                    }
                    if (target.name == activeCard) {
                        nextMove.innerText = target.name + " is already in battle!";
                    } else if (!canSwitch[target.id.charAt(4)]) {
                        nextMove.innerText = target.name + " can no longer battle!"
                    } else {
                        selection = target.id;
                        nextMove.innerText = "Switch to " + target.name;
                    }
                });

                $("#chatInput").on('keyup', function (e) {
                    if (e.keyCode === 13) {
                        let msg = $("#chatInput").val().trim();
                        if (msg) {
                            socket.emit('chat message', msg, name, roomname);
                        }
                        $("#chatInput").val("");
                    }
                });

                $(".close").on("click", function() { // close the game tab
                    var tabContentId = $(this).parent().attr("href");
                    $(this).parent().parent().remove();
                    $(tabContentId).remove();
                    $('#tabList a[href="#home"]').tab('show');
                    window.clearInterval(timer);
                    socket.emit('leave room', roomname);
                });

                var hpValues = {};
                $("#game-" + gameNumber + " .cards .barno img").each(function() {
                    hpValues[[this.name]] = {"hp": cards[this.name].hp};
                });
                socket.emit('set hp', name, hpValues, roomname);
                nextMove.innerText = "Select card to lead";
                window.setTimeout(selectLead, 5000); // TODO: display notification of game start
            });
        });

        function selectLead() {
            if (!selection.includes("card")) { // If nothing selected, pick the 1st available
                selection = "card0";
            }
            activeCard = document.getElementById(selection).name;
            socket.emit('select lead', activeCard, roomname);
        }

        socket.on('start timer', function(activeCards) {
            debugger;
            activeOpponent = activeCards[0] != activeCard ? activeCards[0] : activeCards[1];
            $("#activePlayer").attr({
                src: 'cards/' + activeCard + '.png',
                name: activeCard
            });
            $("#activeOpponent").attr({ // TODO: change to get from opponent on game start
                src: 'cards/' + activeOpponent + '.png',
                name: activeOpponent
            });
            hpPlayer.innerText = cards[[activeCard]].hp;
            hpOpponent.innerText = cards[[activeOpponent]].hp;
            selection = DEFAULT_SELECTION;
            nextMove.innerText = "Your next move is...";
            timer = window.setInterval(updateTimer, TIMER_SPEED);
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

                socket.emit('use move', name, opponent, selection, card, activeCard, roomname);

                selection = DEFAULT_SELECTION;
                i = width;
                nextMove.innerText = "Your next move is...";
            }
        }

        socket.on('update', function(hp, history, turn, cardsByPlayer) {
            let row = document.createElement("tr");
            row.classList = "turn-row";
            let text = document.createElement("td");
            text.innerHTML = '<b class="turn">Turn ' + turn + '</b>';
            row.appendChild(text);
            $("#history")[0].appendChild(row); // TODO: Scroll history to bottom

            document.getElementById("turnNumber").innerText = "Turn " + (turn + 1);

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

            hpPlayer.innerText = hp[[name]][[activeCard]].hp;
            hpOpponent.innerText = hp[[opponent]][[activeOpponent]].hp;
            document.getElementById('hp' + deck.indexOf(activeCard)).innerText = hp[[name]][[activeCard]].hp;
            if (hp[[name]][[activeCard]].hp > 0 && hp[[opponent]][[activeOpponent]].hp > 0) {
                timer = window.setInterval(updateTimer, TIMER_SPEED);
            } else { // card is defeated TODO: check for both cards defeated at same time
                if (hp[[name]][[activeCard]].hp <= 0) { // it's the player's card that is defeated
                    // TODO: disable clicking on moves, create default selection
                    // also disble clicking on defeated cards/remove css stuff
                    canSwitch[deck.indexOf(activeCard)] = 0;
                    if (canSwitch.indexOf(1) == -1) { // you lose!
                        socket.emit('game end', roomname, opponent);
                    } else {
                        nextMove.innerText = activeCard + " has been defeated!";
                        timer = window.setInterval(switchCardTimer, SWITCH_TIMER_SPEED);
                    }
                } else { // if it's the opponents card that is defeated, just wait
                    nextMove.innerText = "Waiting for opponent...";
                }
            }
        });

        socket.on('opponent switched', function(newActive, hp) {
            activeOpponent = newActive;
            $("#activeOpponent").attr({
                src: 'cards/' + activeOpponent + '.png',
                name: activeOpponent
            });
            hpOpponent.innerText = hp[[opponent]][[activeOpponent]].hp;
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
                activeCard = document.getElementById(selection).name;
                $("#activePlayer").attr({
                    src: 'cards/' + activeCard + '.png',
                    name: activeCard
                });

                socket.emit('switch card', roomname, name, opponent, activeCard, function(hp) {
                    hpPlayer.innerText = hp[[name]][[activeCard]].hp;
                });
                selection = DEFAULT_SELECTION;
                i = width;
                nextMove.innerText = "Your next move is...";
                timer = window.setInterval(updateTimer, TIMER_SPEED);
            }
        }

        socket.on('chat message', function(msg) {
            let row = document.createElement("tr");
            let text = document.createElement("td");
            text.innerHTML = msg;
            row.appendChild(text);
            document.getElementById("history").appendChild(row);
        });

        $chatForm.on('submit', function() {
            let msg = document.getElementById("chatroomInput").value.trim();
            if (msg) {
                socket.emit('chatroom message', name, msg, chatroom);
                $chatForm[0].reset();
                return false;
            }
        });

        socket.on('chatroom message', function(msg, room) { // TODO: highlight user-sent messages/@usernames?
            var dt = new Date().toLocaleTimeString();
            dt = dt.substring(0, dt.length - 6);
            msg = "<small class='timestamp'>" + dt + " </small>" + msg; // TODO: user preferences for timestamps
            $("#messages" + room).append($("<li>").html(msg));
            if (room != chatroom) {
                document.getElementById("badge" + room).innerText = ++unread[[room]]
            }
            $("#scrollChat").stop ().animate ({
                scrollTop: $("#scrollChat")[0].scrollHeight
            });
        });

        socket.on('game end', function(str) {
            window.clearInterval(timer);
            let row = document.createElement("tr");
            let text = document.createElement("td");
            text.innerHTML = str;
            row.appendChild(text);
            document.getElementById("history").appendChild(row);
        });
    }
});
