/* eslint-disable no-extend-native */
/* eslint-disable complexity */

const genAlias = require('../../utils')

function Card(value, suit) {
  this.value = value
  this.suit = suit
  this.owner = null
  this.img = ''
}

function getImg(card) {
  let finalStr = ''
  let suit = card.suit.toLowerCase()
  if (card.value === 'Jack') {
    finalStr = `jack_of_${suit}2`
  } else if (card.value === 'Queen') {
    finalStr = `queen_of_${suit}2`
  } else if (card.value === 'King') {
    finalStr = `king_of_${suit}2`
  } else if (card.value === 'Ace') {
    finalStr = `ace_of_${suit}`
  } else {
    finalStr = `${card.value}_of_${suit}`
  }
  return finalStr
}

function hash(str) {
  return str.split('').reduce(function(acc, char) {
    return acc + char.charCodeAt(0)
  }, 0)
}

function Player(socketId) {
  this.socketId = socketId
  this.hand = []
  this.alias = genAlias()
}

function buildDeck() {
  //1 is A, 11 is J, 12 is Q, K is 13
  let values = ['Ace', 2, 3, 4, 5, 6, 7, 8, 9, 10, 'Jack', 'Queen', 'King']
  //1 is Diamonds, 2 is Clubs, 3 is Hearts, 4 is Spades
  let suits = ['Diamonds', 'Clubs', 'Hearts', 'Spades']
  let deck = []
  for (let v = 0; v < values.length; v++) {
    for (let s = 0; s < suits.length; s++) {
      let newCard = new Card(values[v], suits[s])
      newCard.img = getImg(newCard)
      deck.push(newCard)
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
    stack[stack.length - 1].value === 'Jack' ||
    stack[stack.length - 1].value === 'Queen' ||
    stack[stack.length - 1].value === 'King' ||
    stack[stack.length - 1].value === 'Ace'
  )
}

function isFaceCard(card) {
  return (
    card.value === 'Jack' ||
    card.value === 'Queen' ||
    card.value === 'King' ||
    card.value === 'Ace'
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
      this.stack[this.stack.length - 2].value === 'Jack'
    ) {
      return this.stack[this.stack.length - 2].owner
    } else if (
      this.stack.length - 3 >= 0 &&
      this.stack[this.stack.length - 3].value === 'Queen' &&
      !isFaceCard(this.stack[this.stack.length - 2])
    ) {
      return this.stack[this.stack.length - 3].owner
    } else if (
      this.stack.length - 4 >= 0 &&
      this.stack[this.stack.length - 4].value === 'King' &&
      !isFaceCard(this.stack[this.stack.length - 2]) &&
      !isFaceCard(this.stack[this.stack.length - 3])
    ) {
      return this.stack[this.stack.length - 4].owner
    } else if (
      this.stack.length - 5 >= 0 &&
      this.stack[this.stack.length - 5].value === 'Ace' &&
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
      `${
        this.getPlayer(socketId).alias
      } has left the game. Their hand has been burned.`
    )
    this.dequeue(socketId)
    this.players = this.players.filter(player => player.socketId !== socketId)
    if (this.players.length < 2) {
      this.log('Not enough players.')
      this.end()
    }
  }

  isValidSlap(player) {
    this.log(`${player.alias} slaps!`)
    let topCard = this.stack[this.stack.length - 1]
    if (!this.stack[this.stack.length - 2]) {
      this.log(`Invalid sandwich.`)
      return false
    } else if (topCard.value === this.stack[this.stack.length - 2].value) {
      this.log(
        `Valid sandwich: ${topCard.value}, ${
          this.stack[this.stack.length - 2].value
        }.`
      )
      return true
    } else if (this.stack[this.stack.length - 3]) {
      if (topCard.value === this.stack[this.stack.length - 3].value) {
        this.log(
          `Valid sandwich: ${topCard.value}, ${
            this.stack[this.stack.length - 2].value
          }, ${this.stack[this.stack.length - 3].value}.`
        )
        return true
      }
    } else {
      this.log(`Invalid sandwich.`)
      return false
    }
  }

  slap(player) {
    if (this.isValidSlap(player)) {
      this.stack = this.stack.map(card => {
        card.owner = player.socketId
        return card
      })
      this.log(`${player.alias} wins this round.`)
      this.stack.push(...this.burn)
      this.burn = []
      while (this.stack.length) {
        player.hand.unshift(this.stack.pop())
      }
      let current = this.currentPlayer().socketId
      this.dequeue(current)
      this.queue(this.getPlayer(current))
    } else if (player.hand.length) {
      let burnCard = player.hand.pop()
      this.log(
        `${this.getPlayer(player.socketId).alias} burns a card: ${
          burnCard.value
        }`
      )
      this.burn.push(burnCard)
    }
    if (!player.hand.length) {
      this.dequeue(player.socketId)
    }
    if (this.burn.length + this.stack.length === 52) {
      this.end()
    }
    if (!this.turnQueue.length) {
      this.end()
    }
    if (this.turnQueue.length === 1) {
      this.end()
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
      this.log(`${winner.alias} wins this round.`)
      this.stack.push(...this.burn)
      this.burn = []
      winner.hand.unshift(...this.stack)
      this.stack = []
    }
    this.players.forEach(player => {
      if (player.hand.length === 52) {
        this.log(`${player.alias} wins the game!`)
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
          return player.alias
        })}`
      )
      this.log('Dealing hands...')
      this.dealHands()
      this.log('GAME START!')
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
        case 'Jack':
          this.log(
            `Jack: ${nextPlayer.alias} has 1 chance to play a face card.`
          )
          break
        case 'Queen':
          this.log(
            `Queen: ${nextPlayer.alias} has 2 chances to play a face card.`
          )
          this.turnQueue.push(nextPlayer)
          break
        case 'King':
          this.log(
            `King: ${nextPlayer.alias} has 3 chances to play a face card.`
          )
          this.turnQueue.push(nextPlayer)
          this.turnQueue.push(nextPlayer)
          break
        case 'Ace':
          this.log(
            `Ace: ${nextPlayer.alias} has 4 chances to play a face card.`
          )
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
    this.players.forEach(player => {
      if (
        !this.turnQueue
          .map(queue => queue.socketId)
          .includes(player.socketId) &&
        player.hand.length > 0
      ) {
        this.queue(player)
      } else if (player.hand.length < 1) {
        this.dequeue(player.socketId)
      }
    })
    if (this.burn.length + this.stack.length === 52) {
      this.end()
    }
    if (!this.turnQueue.length) {
      this.end()
    }
    if (this.turnQueue.length === 1) {
      this.end()
    }
  }

  playCard() {
    this.stack.push(this.currentPlayer().hand.pop())
    this.log(
      `${this.currentPlayer().alias} plays a ${
        this.stack[this.stack.length - 1].value
      } of ${this.stack[this.stack.length - 1].suit}`
    )
    this.validateQueue()
    this.awardWinner()
  }

  log(msg) {
    this.msgLog.push({message: msg, id: Math.random() * 9999})
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
