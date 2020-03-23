/* eslint-disable complexity */
import React from 'react'
import socket from '../socket'
import {runInThisContext} from 'vm'

class Home extends React.Component {
  constructor() {
    super()
    this.state = {
      start: false,
      user: '',
      alias: '',
      players: [],
      currentPlayer: '',
      topCard: {},
      messages: [],
      stack: [],
      burned: 0,
      slappable: false,
      winner: undefined
    }
  }
  componentDidMount() {
    socket.on('user', info => {
      this.setState({user: info.id, alias: info.alias})
    })

    socket.on('gameinfo', game => {
      this.setState({
        start: game.started,
        players: game.players,
        currentPlayer: game.currentPlayer,
        topCard: game.topCard,
        messages: game.messages,
        stack: game.stack,
        burned: game.burned,
        slappable: game.slappable,
        winner: game.winner
      })
    })
  }
  render() {
    return (
      <div id="main">
        <div id="header">
          <h1>Rats!</h1>
          <div id="game-info">
            <h2>You are: {this.state.alias}</h2>
            <h2>Cards in stack: {`${this.state.stack.length} cards`}</h2>
            <h2>Cards burned: {`${this.state.burned} cards`}</h2>
            <div id="players">
              Players:
              {this.state.players.map(player => (
                <div key={player.socketId}>
                  {player.alias} has {player.hand.length} cards in their hand!
                </div>
              ))}
            </div>
          </div>
        </div>

        <div id="game">
          <div id="notification">
            {this.state.players.length > 1 ? (
              ''
            ) : (
              <h3>Not enough players to start.</h3>
            )}
            {this.state.currentPlayer && (
              <div>
                <h3>
                  {this.state.messages.length &&
                    this.state.messages[this.state.messages.length - 1].message}
                </h3>
                {!this.state.winner && (
                  <h3>
                    It is{' '}
                    {this.state.currentPlayer.socketId === this.state.user
                      ? 'your'
                      : `${this.state.currentPlayer.alias}'s`}{' '}
                    turn!
                  </h3>
                )}
              </div>
            )}
          </div>
          <div className="card-view">
            {this.state.topCard !== 0 && (
              <img src={`./${this.state.topCard.img}.png`} />
            )}
          </div>
          <div id="buttons">
            {this.state.start &&
            !this.state.winner &&
            this.state.currentPlayer &&
            this.state.currentPlayer.socketId === this.state.user ? (
              <button type="button" onClick={() => socket.emit('playcard')}>
                Play Card
              </button>
            ) : (
              this.state.start && (
                <button type="button" disabled>
                  Play Card
                </button>
              )
            )}
            {this.state.start && (
              <button
                type="button"
                onClick={() => socket.emit('slap')}
                className={
                  this.state.slappable
                    ? 'slappable'
                    : this.state.winner === this.state.user
                    ? 'slappable'
                    : ''
                }
              >
                Slap!
              </button>
            )}
            {this.state.players.length >= 2 && !this.state.start && (
              <button type="button" onClick={() => socket.emit('start')}>
                Start!
              </button>
            )}
          </div>
        </div>
        <div id="log-container">
          <h3>Game Messages:</h3>
          <ol id="log">
            {this.state.messages.length
              ? this.state.messages.map(msg => {
                  return <li key={msg.id}>{`${msg.message}`}</li>
                })
              : ''}
          </ol>
        </div>
        <div id="howtoplay">
          <h2>How to Play</h2>
          <p>
            Egyptian Rat Screw is a card game that tests players' reactions and
            memory. Each player takes turns playing a card on the stack. If any
            player plays a face card (Jack, Queen, King, or Ace) the following
            player in the turn order has a certain number of chances to play a
            face card (1, 2, 3, and 4, respectively), otherwise the player who
            played the face card wins the stack.
          </p>
          <p>
            Alternatively, any player in the game may slap the stack on a valid
            sandwich. Sandwiches are pairs of identical values (7, 7) or
            identical values separated by one card (7, A, 7). Valid slaps award
            the player with all the cards in the stack. The player who manages
            to accumulate all the cards wins!
          </p>
        </div>
      </div>
    )
  }
}

export default Home
