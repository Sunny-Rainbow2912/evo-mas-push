import React from 'react'
import Restore from 'react-restore'
import link from '../../resources/link'

import Account from './Account'
import Notify from './Notify'
import Menu from './Menu'
import Badge from './Badge'
import Backdrop from './Backdrop'
import AccountSelector from './AccountSelector'
import Footer from './Footer'
import TermsOfService from './TermsOfService'
import GeoRestriction from './GeoRestriction/GeoRestriction'

import { invokeBridge } from './utils/ipcBridge'; // adjust path

import { RESTRICTED_COUNTRIES, RESTRICTED_REGIONS_US } from './GeoRestriction/GeoRestrictionList'

// import DevTools from 'restore-devtools'
// <DevTools />

class Panel extends React.Component {
  state = {
    tosAccepted: false,
    geoRestricted: false
  }

  async componentDidMount() {
    const accepted = localStorage.getItem('tos.accepted') === 'true'
    this.setState({ tosAccepted: accepted })


      // The call itself remains clean and unchanged
      const data = await invokeBridge('get-geo-info');

      if (data) {
        const country = data.country_code;
        const region = data.region_code;
        const usRegion = `US-${region}`;

        if (RESTRICTED_COUNTRIES.includes(country) || RESTRICTED_REGIONS_US.includes(usRegion)) {
          this.setState({ geoRestricted: true });
        }
      
    } 
    
  }

  handleTosAgree = () => {
    localStorage.setItem('tos.accepted', 'true')
    this.setState({ tosAccepted: true })
  }

  indicator(connection) {
    const status = [connection.primary.status, connection.secondary.status]
    if (status.indexOf('connected') > -1) {
      if (this.store('selected.current')) {
        return <div className='panelDetailIndicatorInner panelDetailIndicatorGood' />
      } else {
        return <div className='panelDetailIndicatorInner panelDetailIndicatorWaiting' />
      }
    } else {
      return <div className='panelDetailIndicatorInner panelDetailIndicatorBad' />
    }
  }

  // componentDidMount () {
  //   document.addEventListener('keydown', (event) => {
  //     console.log('event ky', event.key, this.store('panel.view'))
  //     const view = this.store('panel.view')
  //     if (event.key === 'ArrowRight') {
  //       if (view === 'networks') this.store.setPanelView('settings')
  //       if (view === 'settings') this.store.setPanelView('default')
  //       if (view === 'default') this.store.setPanelView('networks')
  //     } else if (event.key === 'ArrowLeft') {
  //       if (view === 'networks') this.store.setPanelView('default')
  //       if (view === 'settings') this.store.setPanelView('networks')
  //       if (view === 'default') this.store.setPanelView('settings')
  //     }
  //     // const key = event.key; // "ArrowRight", "ArrowLeft", "ArrowUp", or "ArrowDown"
  //   })
  // }

  selectNetwork(network) {
    const [type, id] = network.split(':')
    if (network.type !== type || network.id !== id) link.send('tray:action', 'selectNetwork', type, id)
  }

  hexToDisplayGwei(weiHex) {
    return parseInt(weiHex, 'hex') / 1e9 < 1 ? '‹1' : Math.round(parseInt(weiHex, 'hex') / 1e9)
  }

  render() {
    const opacity = this.store('tray.initial') ? 0 : 1

    if (this.state.geoRestricted) return <GeoRestriction />
    if (!this.state.tosAccepted) return <TermsOfService onAgree={this.handleTosAgree} />

    const networks = this.store('main.networks')
    const networkOptions = []
    Object.keys(networks).forEach((type) => {
      Object.keys(networks[type]).forEach((id) => {
        const net = networks[type][id]
        const status = [net.connection.primary.status, net.connection.secondary.status]
        if (net.on) {
          networkOptions.push({
            text: net.name,
            value: type + ':' + id,
            indicator: net.on && status.indexOf('connected') > -1 ? 'good' : 'bad'
          })
        }
      })
    })

    return (
      <div id='panel' style={{ opacity, background: '#002739' }}>
        <Badge />
        <Notify />
        <Menu />
        <AccountSelector />
        <Account />
        <Backdrop />
        <Footer />
      </div>
    )
  }
}

export default Restore.connect(Panel)
