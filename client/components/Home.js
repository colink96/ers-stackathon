import React from 'react'
import socket from '../socket'
import {runInThisContext} from 'vm'

class Home extends React.Component {
  constructor() {
    super()
    this.state = {
      start: false,
      user: '',
      players: [],
      currentPlayer: '',
      topCard: {},
      messages: []
    }
  }

  componentDidMount() {
    socket.on('user', id => {
      this.setState({user: id})
    })

    socket.on('gameinfo', game => {
      this.setState({
        start: game.started,
        players: game.players,
        currentPlayer: game.currentPlayer,
        topCard: game.topCard,
        messages: game.messages
      })
    })
  }
  render() {
    return (
      <div>
        <h1>ERS</h1>
        <div id="game">
          <h2>You are: {this.state.user}</h2>
          <ol>
            Players Connected:
            {this.state.players.map(player => (
              <li key={player.socketId}>
                Player {player.socketId} has {player.hand.length} cards in their
                hand!
              </li>
            ))}
          </ol>
          {this.state.currentPlayer && (
            <div>
              It is{' '}
              {this.state.currentPlayer.socketId === this.state.user
                ? 'your'
                : `${this.state.currentPlayer.socketId}'s`}{' '}
              turn!
            </div>
          )}
        </div>
        <div>
          {this.state.topCard !== 0 && (
            <div>
              Top Card: {this.state.topCard.value} of {this.state.topCard.suit}
            </div>
          )}
          {this.state.start &&
            this.state.currentPlayer &&
            this.state.currentPlayer.socketId === this.state.user && (
              <button type="button" onClick={() => socket.emit('playcard')}>
                Play Card
              </button>
            )}
          {this.state.start && (
            <button type="button" onClick={() => socket.emit('slap')}>
              Slap!
            </button>
          )}
          {this.state.players.length >= 2 &&
            !this.state.start && (
              <button type="button" onClick={() => socket.emit('start')}>
                Start!
              </button>
            )}
        </div>
        <ol>
          {this.state.messages.length
            ? this.state.messages.map(msg => {
                return <li key={msg.id}>{msg.message}</li>
              })
            : ''}
        </ol>
      </div>
    )
  }
}

export default Home
