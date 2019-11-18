import React, {Component} from 'react'
import {withRouter, Route, Switch} from 'react-router-dom'
import PropTypes from 'prop-types'
import {Home} from './components'

/**
 * COMPONENT
 */
class Routes extends Component {
  render() {
    return <Route component={Home} />
  }
}

export default Routes
