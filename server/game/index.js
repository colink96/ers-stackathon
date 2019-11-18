/* eslint-disable no-extend-native */
/* eslint-disable complexity */
function Card(value, suit) {
  this.value = value
  this.suit = suit
  this.owner = null
}

function hash(str) {
  return str.split('').reduce(function(hash, char) {
    return hash + char.charCodeAt(0)
  }, 0)
}

function Player(socketId) {
  this.socketId = socketId
  this.hand = []
}

function buildDeck() {
  //1 is A, 11 is J, 12 is Q, K is 13
  let values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
  //1 is Diamonds, 2 is Clubs, 3 is Hearts, 4 is Spades
  let suits = ['Diamonds', 'Clubs', 'Hearts', 'Spades']
  let deck = []
  for (let v = 0; v < values.length; v++) {
    for (let s = 0; s < suits.length; s++) {
      deck.push(new Card(values[v], suits[s]))
    }
  }
  return deck
}

function shuffle(deck) {
  deck.sort(() => Math.random() - 0.5)
}

function isFace(stack) {
  if (stack.length - 1 < 0) {
    return undefined
  }
  return (
    stack[stack.length - 1].value === 11 ||
    stack[stack.length - 1].value === 12 ||
    stack[stack.length - 1].value === 13 ||
    stack[stack.length - 1].value === 1
  )
}

function isFaceCard(card) {
  return (
    card.value === 1 ||
    card.value === 11 ||
    card.value === 12 ||
    card.value === 13
  )
}

class Game {
  constructor() {
    this.players = []
    this.stack = []
    this.burn = []
    this.counter = 1
    this.turnQueue = []
    this.started = false
    this.msgLog = []
  }

  checkWinner() {
    if (isFace(this.stack)) {
      return undefined
    } else if (
      this.stack.length - 2 >= 0 &&
      this.stack[this.stack.length - 2].value === 11
    ) {
      return this.stack[this.stack.length - 2].owner
    } else if (
      this.stack.length - 3 >= 0 &&
      this.stack[this.stack.length - 3].value === 12 &&
      !isFaceCard(this.stack[this.stack.length - 2])
    ) {
      return this.stack[this.stack.length - 3].owner
    } else if (
      this.stack.length - 4 >= 0 &&
      this.stack[this.stack.length - 4].value === 13 &&
      !isFaceCard(this.stack[this.stack.length - 2]) &&
      !isFaceCard(this.stack[this.stack.length - 3])
    ) {
      return this.stack[this.stack.length - 4].owner
    } else if (
      this.stack.length - 5 >= 0 &&
      this.stack[this.stack.length - 5].value === 1 &&
      !isFaceCard(this.stack[this.stack.length - 2]) &&
      !isFaceCard(this.stack[this.stack.length - 3]) &&
      !isFaceCard(this.stack[this.stack.length - 4])
    ) {
      return this.stack[this.stack.length - 5].owner
    } else {
      return undefined
    }
  }

  addPlayer(player) {
    this.players.push(player)
  }

  removePlayer(socketId) {
    let removed = this.getPlayer(socketId)
    this.burn.push(...removed.hand)
    this.log(
      `Player ${socketId} has left the game. Their hand has been burned.`
    )
    this.dequeue(socketId)
    this.players = this.players.filter(player => player.socketId !== socketId)
    if (this.players.length < 2) {
      this.log('Not enough players.')
      this.end()
    }
  }

  isValidSlap() {
    let topCard = this.stack[this.stack.length - 1]
    if (!this.stack[this.stack.length - 2]) {
      return false
    } else if (topCard.value === this.stack[this.stack.length - 2].value) {
      return true
    } else if (this.stack[this.stack.length - 3]) {
      if (topCard.value === this.stack[this.stack.length - 3].value) {
        return true
      }
    } else {
      return false
    }
  }

  slap(player) {
    this.log(`Player ${player.socketId} slaps`)
    if (this.isValidSlap()) {
      this.stack = this.stack.map(card => {
        card.owner = player.socketId
        return card
      })
      this.log(`Player ${player.socketId} wins this round.`)
      this.stack.push(...this.burn)
      this.burn = []
      while (this.stack.length) {
        player.hand.unshift(this.stack.pop())
      }
    } else {
      let burnCard = player.hand.pop()
      this.log(`Player ${player.socketId} burns a card: ${burnCard.value}`)
      this.burn.push(burnCard)
    }
  }

  awardWinner() {
    if (this.checkWinner()) {
      let winner = this.players.filter(user => {
        return this.checkWinner() === user.socketId
      })[0]
      this.stack = this.stack.map(card => {
        card.owner = this.checkWinner()
        return card
      })
      this.log(`Player ${winner.socketId} wins this round.`)
      this.stack.push(...this.burn)
      this.burn = []
      winner.hand.push(...this.stack)
      this.stack = []
    }
    this.players.forEach(player => {
      if (player.hand.length === 52) {
        this.log(`${player.socketId} wins the game!`)
        this.end()
      }
    })
  }

  dealHands() {
    let deck = buildDeck()
    shuffle(deck)
    let playerIdx = 0
    let currentCard
    while (deck.length) {
      if (playerIdx > this.players.length - 1) {
        playerIdx = 0
      }
      currentCard = deck.pop()
      currentCard.owner = this.players[playerIdx].socketId
      this.players[playerIdx].hand.push(currentCard)
      playerIdx += 1
    }
  }

  start() {
    if (!this.started) {
      this.started = true
      this.players.forEach(player => {
        player.hand = []
        if (
          !this.turnQueue.map(user => user.socketId).includes(player.socketId)
        ) {
          this.queue(player)
        }
      })
      this.log(`Starting game...`)
      this.log(
        `Current players: ${this.players.map(player => {
          return player.socketId
        })}`
      )
      this.log(`Turn Queue: ${this.turnQueue.map(player => player.socketId)}`)
      this.log('Dealing hands...')
      this.dealHands()
    }
  }

  end() {
    this.started = false
    this.turnQueue = []
    this.stack = []
    this.burn = []
    this.counter = 1
    this.players.forEach(player => {
      player.hand = []
    })
    this.log('Game has ended. Please restart the game.')
  }

  getPlayer(id) {
    return this.players.filter(player => {
      return player.socketId === id
    })[0]
  }

  currentPlayer() {
    return this.turnQueue[this.turnQueue.length - 1]
  }

  queue(player) {
    this.turnQueue.unshift(player)
  }

  dequeue(playerId) {
    this.turnQueue = this.turnQueue.filter(curPlayer => {
      return curPlayer.socketId !== playerId
    })
  }

  validateQueue() {
    if (isFace(this.stack)) {
      let currentPlayerId = this.currentPlayer().socketId
      this.dequeue(currentPlayerId)
      this.queue(this.getPlayer(currentPlayerId))
      let nextPlayer = this.currentPlayer()
      switch (this.stack[this.stack.length - 1].value) {
        case 12:
          this.turnQueue.push(nextPlayer)
          break
        case 13:
          this.turnQueue.push(nextPlayer)
          this.turnQueue.push(nextPlayer)
          break
        case 1:
          this.turnQueue.push(nextPlayer)
          this.turnQueue.push(nextPlayer)
          this.turnQueue.push(nextPlayer)
          break
        default:
      }
    } else {
      let currentPlayer = this.turnQueue.pop()
      if (currentPlayer.socketId !== this.currentPlayer().socketId) {
        this.queue(currentPlayer)
      }
    }
  }

  playCard() {
    this.stack.push(this.currentPlayer().hand.pop())
    this.log(
      `Player ${this.currentPlayer().socketId} plays a ${
        this.stack[this.stack.length - 1].value
      } of ${this.stack[this.stack.length - 1].suit}`
    )
    this.validateQueue()
    this.awardWinner()
  }

  log(msg) {
    this.msgLog.push({message: msg, id: hash(msg)})
    if (this.msgLog.length > 30) {
      this.msgLog = this.msgLog.slice(1)
    }
  }
}

module.exports = {
  Game,
  Player,
  Card,
  buildDeck,
  shuffle,
  isFace,
  isFaceCard
}
