import React, { useEffect } from 'react'
import link from '../../../../../resources/link'
import svg from '../../../../../resources/svg'

import { Slide, SlideBody, SlideItem, Tag } from '../../styled'

const Extension = ({ setTitle, setProceed }) => {
  useEffect(() => {
    setTitle('Browser Extension')
    setProceed({ action: 'next', text: 'Next' })
  }, [])
  return (
    <Slide>
      <SlideBody>
        <SlideItem>
          <div>If you're using a dapp that doesn't natively</div>
          <div>connect to EvoTradeWallet, you can inject a connection with</div>
          <div> our <Tag>EvoTrade Companion</Tag> browser extension. </div>
        </SlideItem>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <div>
            {svg.chrome(48)}
          </div>
          <div>
            {svg.firefox(48)}
          </div>
        </div>
      </SlideBody>
    </Slide>
  )
}

export default Extension
