import React from 'react'
import Restore from 'react-restore'

class TermsOfService extends React.Component {
  componentDidMount() {
    console.log('[ToS] TermsOfService component mounted.')
  }

  render() {
    return (
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        color: '#fff',
        padding: '2rem',
        zIndex: 9999,
        overflowY: 'auto',
        fontSize: '15px',
        lineHeight: '1.6'
      }}>
        <h2>Terms of Service</h2>
        <p><strong>Effective Date:</strong> 07/06/2025</p>
        <p>Welcome to our crypto wallet application (“App”). Please read this Terms of Service (“Terms”) carefully before using the App. By tapping “I Agree,” you confirm that you have read, understood, and accepted these Terms.</p>

        <h3>1. Non-Custodial Nature</h3>
        <p>This App is a non-custodial cryptocurrency wallet. We do not store your private keys, seed phrases, passwords, or funds. You are solely responsible for securing your wallet and backup information.</p>

        <h3>2. No Financial Services</h3>
        <p>We do not operate as a financial institution, money transmitter, or exchange. The App does not provide fiat currency services or act as an intermediary in any transactions.</p>

        <h3>3. Decentralized Protocol Access</h3>
        <p>The App enables you to connect directly with public blockchain networks and decentralized applications (dApps). All transactions are executed directly between you and the blockchain via your device.</p>
        <p>We do not process, transmit, or confirm transactions on your behalf. You are responsible for verifying all details before signing or broadcasting any transaction.</p>

        <h3>4. Jurisdiction Restrictions</h3>
        <p>You may not use this App in jurisdictions where cryptocurrency usage or decentralized wallets are restricted or prohibited, including (but not limited to): China, India, Bangladesh, Nepal, Algeria, Iraq, Morocco, New York and Hawaii (USA), and any region subject to OFAC or similar international sanctions.</p>
        <p>We reserve the right to restrict or suspend access if you are found to be in violation of these regional restrictions.</p>

        <h3>5. AML/KYC and Legal Compliance</h3>
        <p>By using this App, you agree to comply with all applicable local laws, including Anti-Money Laundering (AML), Know Your Customer (KYC), and tax regulations.</p>
        <p>Although we do not collect user identity data, you are solely responsible for lawful usage of blockchain technologies and the tokens you interact with.</p>

        <h3>6. No Token Issuance or Promotion</h3>
        <p>We do not issue or promote any proprietary or exclusive tokens. Tokens displayed in the App are for informational purposes only and are sourced from public Ethereum-compatible token registries.</p>

        <h3>7. No Warranty or Liability</h3>
        <p>Use of the App is provided “as is” and at your own risk. We do not guarantee:</p>
        <ul>
          <li>That your transactions will be successful, error-free, or secure</li>
          <li>The performance or security of any third-party smart contracts or networks</li>
          <li>That the App will be available at all times</li>
        </ul>
        <p>We are not liable for any financial loss, data loss, or damage arising from the use or inability to use this App.</p>

        <h3>8. Changes to the Terms</h3>
        <p>We may update these Terms from time to time. Continued use of the App after such changes constitutes acceptance of the new Terms. A notice will be displayed when updates are made.</p>

        <h3>Acceptance</h3>
        <p>By tapping “I Agree”, you confirm that:</p>
        <ul>
          <li>You are at least 18 years old or legally eligible to use this App in your jurisdiction</li>
          <li>You have read and understood these Terms</li>
          <li>You agree to comply with all applicable laws when using the App</li>
        </ul>

        <button
          onClick={() => this.store.set('tos.accepted', true)}
          style={{
            marginTop: '2rem',
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: '#00c2ff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          I Agree
        </button>
      </div>
    )
  }
}

export default Restore.connect(TermsOfService)
