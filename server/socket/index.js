const {
  Game,
  Player,
  Card,
  buildDeck,
  shuffle,
  isFace,
  isFaceCard
} = require('../game')

const game = new Game()

function updateInfo(io) {
  io.emit('gameinfo', {
    started: game.started,
    players: game.players,
    currentPlayer: game.currentPlayer(),
    topCard: game.stack.length && game.stack[game.stack.length - 1],
    messages: game.msgLog,
    stack: game.stack,
    burned: game.burn.length,
    slappable: game.isValidSlap()
  })
}

module.exports = io => {
  io.on('connection', socket => {
    console.log(`A socket connection to the server has been made: ${socket.id}`)
    if (!game.players.map(player => player.socketId).includes(socket.id)) {
      game.addPlayer(new Player(socket.id))
    }
    io.to(`${socket.id}`).emit('user', {
      id: socket.id,
      alias: game.getPlayer(socket.id).alias
    })
    updateInfo(io)
    console.log(`${game.players.length} players in the house!`)

    socket.on('playcard', () => {
      game.playCard()
      updateInfo(io)
    })

    socket.on('slap', () => {
      game.slap(game.getPlayer(socket.id))
      updateInfo(io)
    })

    socket.on('start', () => {
      if (game.players.length >= 2) {
        game.start()
        updateInfo(io)
      } else {
        console.log('Not enough players.')
      }
    })

    socket.on('disconnect', () => {
      console.log(`Connection ${socket.id} has left the building`)
      game.removePlayer(socket.id)
      updateInfo(io)
      console.log(`${game.players.length} players in the house!`)
    })
  })
}
