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
      burned: 0
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
        burned: game.burned
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

            <h3>Cards in stack: {`${this.state.stack.length} cards`}</h3>
            <h3>Cards burned: {`${this.state.burned} cards`}</h3>
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
          {this.state.currentPlayer && (
            <h3>
              It is{' '}
              {this.state.currentPlayer.socketId === this.state.user
                ? 'your'
                : `${this.state.currentPlayer.alias}'s`}{' '}
              turn!
            </h3>
          )}
          <div className="card-view">
            {this.state.topCard !== 0 && (
              <img src={`./${this.state.topCard.img}.png`} />
            )}
          </div>
          <div id="buttons">
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
            {this.state.players.length >= 2 && !this.state.start && (
              <button type="button" onClick={() => socket.emit('start')}>
                Start!
              </button>
            )}
          </div>
        </div>
        <div id="log-container">
          <ol id="log">
            {this.state.messages.length
              ? this.state.messages.map(msg => {
                  return <li key={msg.id}>{`${msg.message}`}</li>
                })
              : ''}
          </ol>
        </div>
      </div>
    )
  }
}

export default Home
