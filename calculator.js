
function calculate(moves) {
    var move1 = moves[0];
    var move2 = moves[1];
    // move# = {'username': name, 'move': move, 'card': card}
    // move#.move can be: fast, slow, defend, anticipate, ability1, abililty2
    // move#.card = {'hp': hp, 'atk': atk, 'def': def}
    //var damages = [];
    var damageTo1, damageTo2;

    if (move1.move == 'fast') {
        if (move2.move == 'fast') {
            damageTo1 = move2.card.atk - move1.card.def;
            damageTo2 = move1.card.atk - move2.card.def;
        } else if (move2.move == 'slow') {
            damageTo1 = move2.card.atk;
            damageTo2 = move1.card.atk - move2.card.def;
        } else if (move2.move == 'defend') {
            if (move2.card.def * 2 > move1.card.atk) {
                damageTo1 = 1; // maybe change this value
                damageTo2 = 0;
            } else {
                damageTo1 = 0;
                damageTo2 = move1.card.atk - move2.card.def * 2;
            }
        } else if (move2.move == 'anticipate') {
            damageTo1 = 0;
            damageTo2 = move1.card.atk; // minus defense or no?
        }
    } else if (move1.move == 'slow') {
        if (move2.move == 'fast') {
            damageTo1 = move2.card.atk - move1.card.def;
            damageTo2 = move1.card.atk;
        } else if (move2.move == 'slow') {
            damageTo1 = move2.card.atk;
            damageTo2 = move1.card.atk;
        } else if (move2.move == 'defend') {
            damageTo1 = 0;
            damageTo2 = move1.card.atk;
        } else if (move2.move == 'anticipate') {
            damageTo1 = move1.card.atk; //move1 or move2? how to calculate anticipated damage
            damageTo2 = 0;
        }
    } else if (move1.move == 'defend') {
        if (move2.move == 'fast') {
            if (move1.card.def * 2 > move2.card.atk) {
                damageTo1 = 0;
                damageTo2 = 1; // maybe change this value
            } else {
                damageTo1 = move2.card.atk - move1.card.def * 2;
                damageTo2 = 0;
            }
        } else if (move2.move == 'slow') {
            damageTo1 = move2.card.atk;
            damageTo2 = 0;
        } else if (move2.move == 'defend') {
            damageTo1 = 0;
            damageTo2 = 0;
        } else if (move2.move == 'anticipate') {
            damageTo1 = 0;
            damageTo2 = 0;
        }
    } else if (move1.move == 'anticipate') {
        if (move2.move == 'fast') {
            damageTo1 = move2.card.atk;
            damageTo2 = 0;
        } else if (move2.move == 'slow') {
            damageTo1 = move1.card.atk; //move1 or move2? how to calculate anticipated damage
            damageTo2 = 0;
        } else if (move2.move == 'defend') {
            damageTo1 = 0;
            damageTo2 = 0;
        } else if (move2.move == 'anticipate') {
            damageTo1 = 0;
            damageTo2 = 0;
        }
    }
    if (damageTo1 < 0) damageTo1 == 0;
    if (damageTo2 < 0) damageTo2 == 0;
    // var damages = {
    //     [move1.username]: {
    //         damage: damageTo1
    //     },
    //     [move2.username]: {
    //         damage: damageTo2
    //     }
    // };
    var damages = [];
    damages[0] = damageTo1;
    damages[1] = damageTo2;
    return damages;
}

module.exports.calculate = calculate;