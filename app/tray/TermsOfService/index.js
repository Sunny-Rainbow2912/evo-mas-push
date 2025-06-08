import React from 'react'

class TermsOfService extends React.Component {
   render() {
     return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#333',
          color: '#fff',
          padding: '2rem',
          zIndex: 9999,
          overflowY: 'auto',
          fontSize: '15px',
          lineHeight: '1.6',
          display:'grid',
          gap: '15px'
        }}
      >
        <div className='_tosContainer'>
          <h2>Terms of Service</h2>
          <p><strong>Effective Date:</strong> 07/06/2025</p>
          <p>Welcome to our crypto wallet application (“App”). Please read this Terms of Service (“Terms”) carefully before using the App. By tapping “I Agree,” you confirm that you have read, understood, and accepted these Terms.</p>

          <h3>1. Non-Custodial Nature</h3>
          <p>This App is a non-custodial cryptocurrency wallet. We do not store your private keys, seed phrases, passwords, or funds. You are solely responsible for securing your wallet and backup information.</p>

          <h3>2. No Financial Services</h3>
          <p>We do not operate as a financial institution, money transmitter, or exchange. The App does not provide fiat currency services or act as an intermediary in any transactions.</p>

          <h3>3. Decentralized Protocol Access</h3>
          <p>The App enables you to connect directly with public blockchain networks and decentralized applications (dApps). All transactions are executed directly between you and the blockchain via your device.</p>

          <h3>4. Jurisdiction Restrictions</h3>
          <p>You may not use this App in jurisdictions where cryptocurrency usage or decentralized wallets are restricted or prohibited...</p>

          <h3>5. AML/KYC and Legal Compliance</h3>
          <p>By using this App, you agree to comply with all applicable local laws, including AML, KYC, and tax regulations.</p>

          <h3>6. No Token Issuance or Promotion</h3>
          <p>We do not issue or promote any proprietary or exclusive tokens...</p>

          <h3>7. No Warranty or Liability</h3>
          <p>Use of the App is provided “as is” and at your own risk...</p>

          <h3>8. Changes to the Terms</h3>
          <p>We may update these Terms from time to time. Continued use of the App after such changes constitutes acceptance of the new Terms.</p>

          <h3>Acceptance</h3>
          <ul>
            <li>You are at least 18 years old or legally eligible to use this App in your jurisdiction</li>
            <li>You have read and understood these Terms</li>
            <li>You agree to comply with all applicable laws when using the App</li>
          </ul>
        </div>

        <button className='_tosAgreeButton' onClick={() => this.props.onAgree?.()}
        >
        I Agree
      </button>

      </div>
    )
  }
}

export default TermsOfService
