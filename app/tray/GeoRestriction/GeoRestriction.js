const GeoRestriction = () => {
    const handleRetry = () => {
      window.location.reload();
    };
  
    const handleClose = () => {
      window.postMessage({
        method: 'event',
        args: ['geo:quitAppNow'],
        source: 'bridge:link'
      }, '*');
    };
  
    return (
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.95)',
        color: '#fff',
        padding: '2rem',
        zIndex: 10000,
        fontSize: '16px',
        lineHeight: '1.5',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        flexDirection: 'column'
      }}>
        <div>
          <h2>Access Restricted</h2>
          <p>Unfortunately, this application is not available in your country.</p>
          <p>If you are using a VPN, please turn it off and try again.</p>
        </div>
        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
          <button onClick={handleRetry} style={{ padding: '0.5rem 1rem' }}>
            Try Again
          </button>
          <button onClick={handleClose} style={{ padding: '0.5rem 1rem' }}>
            Close
          </button>
        </div>
      </div>
    );
  };
  
  export default GeoRestriction;
  