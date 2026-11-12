const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

function createDeck() {
    const colors = ['red', 'blue', 'green', 'yellow'];
    const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    let deck = [];

    for (let color of colors) {
        for (let num of numbers) {
            deck.push({ color, type: 'number', value: num, id: `${color}-${num}-${Math.random()}` });
            if (num !== 0) {
                deck.push({ color, type: 'number', value: num, id: `${color}-${num}-${Math.random()}-2` });
            }
        }
        const actions = ['skip', 'reverse', 'draw2'];
        for (let action of actions) {
            deck.push({ color, type: 'action', value: action, id: `${color}-${action}-${Math.random()}` });
            deck.push({ color, type: 'action', value: action, id: `${color}-${action}-${Math.random()}-2` });
        }
    }

    for (let i = 0; i < 4; i++) {
        deck.push({ color: 'wild', type: 'wild', value: 'wild', id: `wild-${Math.random()}` });
    }

    for (let i = 0; i < 4; i++) {
        deck.push({ color: 'wild', type: 'wild_draw4', value: 'wild_draw4', id: `wild_draw4-${Math.random()}` });
    }

    return deck.sort(() => Math.random() - 0.5);
}

const rooms = {};

function getOrCreateRoom(roomId, isStackEnabled = true) {
    if (!rooms[roomId]) {
        const deck = createDeck();
        let topCard = deck.pop();
        while (topCard.type !== 'number') {
            deck.unshift(topCard);
            topCard = deck.pop();
        }

        rooms[roomId] = {
            deck: deck,
            discardPile: [topCard],
            players: [],
            turn: 0,
            direction: 1,
            pendingDrawCount: 0,
            isStackEnabled: isStackEnabled
        };
    }
    return rooms[roomId];
}

function updateGameState(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    if (room.players.length > 0) {
        room.turn = (room.turn + room.players.length) % room.players.length;
    } else {
        room.turn = 0;
    }

    io.to(roomId).emit('gameState', {
        players: room.players.map(p => ({ 
            id: p.id, 
            name: p.name, 
            handCount: p.hand.length,
            hasCalledUno: p.hasCalledUno 
        })),
        topCard: room.discardPile[room.discardPile.length - 1],
        currentTurnId: room.players[room.turn] ? room.players[room.turn].id : null,
        pendingDrawCount: room.pendingDrawCount
    });

    room.players.forEach(p => {
        io.to(p.id).emit('yourHand', p.hand);
    });
}

io.on('connection', (socket) => {
    let playerRoomId = null;

    socket.on('joinRoom', ({ roomId, name, isStackEnabled }) => {
        playerRoomId = roomId;
        socket.join(roomId);

        const room = getOrCreateRoom(roomId, isStackEnabled);

        if (room.deck.length < 7) {
            room.deck = createDeck();
        }

        const playerHand = room.deck.splice(0, 7);
        const player = {
            id: socket.id,
            name: name || `Player ${room.players.length + 1}`,
            hand: playerHand,
            hasCalledUno: false
        };
        room.players.push(player);

        socket.emit('joinedRoom', roomId);
        updateGameState(roomId);
    });

    socket.on('callUno', ({ roomId }) => {
        const room = rooms[roomId];
        if (!room) return;
        const player = room.players.find(p => p.id === socket.id);
        if (player && player.hand.length === 1 && !player.hasCalledUno) {
            player.hasCalledUno = true;
            // テロップ演出用イベントをルーム全員に送信
            io.to(roomId).emit('unoDeclared', {
                playerId: player.id,
                playerName: player.name
            });
            updateGameState(roomId);
        }
    });

    socket.on('reportUnoFailure', ({ roomId, targetPlayerId }) => {
        const room = rooms[roomId];
        if (!room) return;
        const targetPlayer = room.players.find(p => p.id === targetPlayerId);
        
        if (targetPlayer && targetPlayer.hand.length === 1 && !targetPlayer.hasCalledUno) {
            for (let i = 0; i < 2; i++) {
                if (room.deck.length === 0) room.deck = createDeck();
                targetPlayer.hand.push(room.deck.pop());
            }
            targetPlayer.hasCalledUno = false;
            io.to(roomId).emit('announce', `⚠️ ${targetPlayer.name} はUNO宣言を忘れていたためペナルティ！(2枚ドロー)`);
            updateGameState(roomId);
        }
    });

    socket.on('playCard', ({ roomId, cardIndex, chosenColor }) => {
        const room = rooms[roomId];
        if (!room || room.players.length === 0) return;
        if (room.players[room.turn].id !== socket.id) return;

        const player = room.players[room.turn];
        if (cardIndex < 0 || cardIndex >= player.hand.length) return;

        const card = player.hand[cardIndex];
        const topCard = room.discardPile[room.discardPile.length - 1];

        if (room.isStackEnabled && room.pendingDrawCount > 0) {
            if (topCard.value === 'draw2') {
                const isCanStack = (card.value === 'draw2' || card.value === 'wild_draw4');
                if (!isCanStack) return;
            } else if (topCard.value === 'wild_draw4') {
                const isCanStack = (card.value === 'wild_draw4');
                if (!isCanStack) return;
            }
        }

        let isPlayable = false;
        if (card.color === 'wild') {
            isPlayable = true;
        } else if (topCard.color === 'wild') {
            isPlayable = (card.color === topCard.designatedColor);
        } else {
            const isSameColor = card.color === topCard.color;
            const isSameValue = (card.value === topCard.value);
            isPlayable = isSameColor || isSameValue;
        }

        if (isPlayable) {
            let playedCard = player.hand.splice(cardIndex, 1)[0];

            if (playedCard.color === 'wild') {
                playedCard.designatedColor = chosenColor || 'red';
            }

            room.discardPile.push(playedCard);

            if (player.hand.length > 1) {
                player.hasCalledUno = false;
            }

            if (player.hand.length === 0) {
                io.to(roomId).emit('gameOver', `${player.name} の勝利です！`);
                delete rooms[roomId];
                return;
            }

            let skipNext = false;
            if (playedCard.type === 'action' || playedCard.color === 'wild') {
                if (playedCard.value === 'skip') {
                    skipNext = true;
                } else if (playedCard.value === 'reverse') {
                    room.direction *= -1;
                    if (room.players.length === 2) skipNext = true;
                } else if (playedCard.value === 'draw2') {
                    if (room.isStackEnabled) {
                        room.pendingDrawCount += 2;
                    } else {
                        const nextTurnIndex = (room.turn + room.direction + room.players.length) % room.players.length;
                        const nextPlayer = room.players[nextTurnIndex];
                        for (let i = 0; i < 2; i++) {
                            if (room.deck.length === 0) room.deck = createDeck();
                            nextPlayer.hand.push(room.deck.pop());
                        }
                        nextPlayer.hasCalledUno = false;
                        skipNext = true;
                    }
                } else if (playedCard.value === 'wild_draw4') {
                    if (room.isStackEnabled) {
                        room.pendingDrawCount += 4;
                    } else {
                        const nextTurnIndex = (room.turn + room.direction + room.players.length) % room.players.length;
                        const nextPlayer = room.players[nextTurnIndex];
                        for (let i = 0; i < 4; i++) {
                            if (room.deck.length === 0) room.deck = createDeck();
                            nextPlayer.hand.push(room.deck.pop());
                        }
                        nextPlayer.hasCalledUno = false;
                        skipNext = true;
                    }
                }
            }

            room.turn += room.direction;
            if (skipNext) room.turn += room.direction;

            updateGameState(roomId);
        }
    });

    socket.on('drawCard', ({ roomId }) => {
        const room = rooms[roomId];
        if (!room || room.players.length === 0) return;
        if (room.players[room.turn].id !== socket.id) return;

        const player = room.players[room.turn];

        if (room.isStackEnabled && room.pendingDrawCount > 0) {
            for (let i = 0; i < room.pendingDrawCount; i++) {
                if (room.deck.length === 0) room.deck = createDeck();
                player.hand.push(room.deck.pop());
            }
            io.to(roomId).emit('announce', `💥 ${player.name} は累積ペナルティで ${room.pendingDrawCount}枚 引かされました！`);
            room.pendingDrawCount = 0;
        } else {
            if (room.deck.length === 0) room.deck = createDeck();
            player.hand.push(room.deck.pop());
            player.hasCalledUno = false;
        }

        room.turn += room.direction;
        updateGameState(roomId);
    });

    socket.on('disconnect', () => {
        if (!playerRoomId || !rooms[playerRoomId]) return;
        const room = rooms[playerRoomId];
        const index = room.players.findIndex(p => p.id === socket.id);
        if (index !== -1) room.players.splice(index, 1);

        if (room.players.length === 0) {
            delete rooms[playerRoomId];
        } else {
            if (room.turn >= room.players.length) room.turn = 0;
            updateGameState(playerRoomId);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server runs on port ${PORT}`);
});