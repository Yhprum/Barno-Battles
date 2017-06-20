//add game functions here

try {
    var socket = io();
}
catch (e) {
    alert("Unable to connect with server");
}

var name;
var opponentName;
var activeCard;

$(document).ready(function() {
    
    var selection = DEFAULT_SELECTION;
    var canvas = document.getElementById("timer");
    var c = canvas.getContext('2d')

    var grd = c.createLinearGradient(-100,0,200,0);
    grd.addColorStop(0,"white");
    grd.addColorStop(1,"red");;
    c.fillStyle = grd;

    var width = canvas.width;
    var height = canvas.height;
    var i = width;
    var timer;

    name = prompt("Pick a username");
    socket.emit('login', name);

    $("#selections .panel").on("click", function(e) {
        if (e.target.classList.contains("card")) {
            selection = e.target.id;
            $("#nextMove")[0].innerText = "Switch to " + e.target.innerText;
        } else {
            selection = e.target.id;
            $("#nextMove")[0].innerText = "Use " + e.target.innerText;
        }
    });

    socket.on('start', function(names) {
        if (Object.keys(names)[0] != name) {
            opponentName = Object.keys(names)[0];
        } else {
            opponentName = Object.keys(names)[1];
        }
        startGame();
    });

    function startGame() {
        var hpValues = {};
        $(".cards .card").each(function() {
            hpValues[[this.innerText]] = {"hp": cards[this.innerText].hp};
        });

        socket.emit('set hp', name, hpValues);

        activeCard = $("#activePlayer")[0].innerText;
        opponentCard = $("#activeOpponent")[0].innerText;
        $("#playerHP")[0].innerText = cards[[activeCard]].hp;
        $("#opponentHP")[0].innerText = cards[[opponentCard]].hp;
        timer = window.setInterval(updateTimer, TIMER_SPEED);
    }

    function updateTimer() {
        c.clearRect(0, 0, width, height);
        c.fillRect(width - i, 0, i--, height);
        if (i < 0) { // timer runs out
            console.log(selection);
            window.clearInterval(timer);

            var card = cards[activeCard];

            socket.emit('use move', name, selection, card, activeCard);

            selection = DEFAULT_SELECTION;
            i = width;
            $("#nextMove")[0].innerText = "Your next move is...";
        }
    }

    socket.on('update history', function(user, move, card) {
        var row = document.createElement("tr");
        var text = document.createElement("td");
        text.innerText = user + ' used ' + move + ' with ' + card;
        row.appendChild(text);
        $("#history")[0].appendChild(row);
    });

    socket.on('update', function(hp) {
        $("#playerHP")[0].innerText = hp[[name]][[activeCard]].hp;
        $("#opponentHP")[0].innerText = hp[[opponentName]][[opponentCard]].hp;
        if (hp[[name]][[activeCard]].hp > 0 && hp[[opponentName]][[opponentCard]].hp > 0) {
            nextTurn();
        }
    });

    function nextTurn() {
        timer = window.setInterval(updateTimer, TIMER_SPEED);
    }
});
