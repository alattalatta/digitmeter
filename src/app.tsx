import React, { Fragment, useState } from 'react'
import { render } from 'react-dom'

import { Digitmeter, Wheel } from './Digitmeter'

function App(): JSX.Element {
  const [s, ss] = useState(12340)
  const [f, sf] = useState(16)

  return (
    <div style={{ fontSize: f, paddingTop: 300 }}>
      <input type="range" min="10" max="48" value={f} onChange={(e) => sf(e.target.valueAsNumber)} />
      {f}
      <br />
      <span>총 가격은</span>{' '}
      <Digitmeter transitionDuration={1500} value={s}>
        {(position, props) => (
          <Fragment key={position}>
            <Wheel {...props} />
            {position > 0 && position % 3 === 0 && ','}
          </Fragment>
        )}
      </Digitmeter>
      <span>원입니다.</span>
      <input type="number" value={s} onChange={(e) => ss(Number(e.target.value))} />
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
render(<App />, document.getElementById('root'))
