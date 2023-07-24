import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import ResizeObserver from 'resize-observer-polyfill'

import * as styles from './Digitmeter.module.css'

type DigitmeterContextValue = {
  height: number
  transitionDuration: number
  value: number
}

const DigitmeterContext = createContext<DigitmeterContextValue>({
  height: 0,
  transitionDuration: 0,
  value: 0,
})

type DigitmeterProps = Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> & {
  children?: (position: number, props: WheelProps) => React.ReactNode
  transitionDuration?: number
  value: number
}

export const Digitmeter: React.FC<DigitmeterProps> = ({
  children = defaultRender,
  className,
  transitionDuration,
  value,
  ...props
}) => {
  const [height, setHeight] = useState(0)

  const $ref = useRef<HTMLSpanElement>(null)

  const val = Math.abs(value)
  const prevVal = usePrevious(val)

  const valLen = len(val)
  const prevValLen = prevVal ? len(prevVal) : 0

  const max = (transitionDuration || 2000) / 8 / 60

  useEffect(() => {
    if (!$ref.current) {
      return
    }
    const observer = new ResizeObserver((entries) => {
      setHeight(entries[0].contentRect.height)
    })
    observer.observe($ref.current)

    return () => observer.disconnect()
  }, [])

  let maxedAt = Infinity

  const diffs = (() => {
    if (prevVal == null) {
      return []
    }

    const diff = prevVal - val
    const diffDirection = Math.sign(diff)
    const diffLen = len(diff)
    const maxLength = Math.max(valLen, prevValLen)

    const newDiffs = new Array<number>(maxLength)
    let carry = 0
    let boost = 0

    maxedAt = -Infinity

    // reversed loop, because digitAt starts from right
    // and we need to calculate the diff LTR
    for (let i = maxLength - 1; i >= 0; i--) {
      const valAt = digitAt(val, i, maxLength)
      const prevValAt = digitAt(prevVal, i, maxLength)

      let diffAt = prevValAt - valAt
      if (diffAt !== 0 && Math.sign(diffAt) !== diffDirection) {
        diffAt += 10 * diffDirection
      }

      const diffWithCarry = diffAt + carry

      if (Math.abs(diffWithCarry) > max) {
        if (maxedAt === -Infinity) {
          maxedAt = i
        }
        newDiffs[i] = Math.min(Math.max(-30, diffWithCarry - (diffWithCarry % 10)), 30) + (diffWithCarry % 10) + boost
        boost += boost ? boost : 10 * diffDirection
      } else {
        newDiffs[i] = diffWithCarry
      }

      if (i < diffLen) {
        carry = newDiffs[i] * 10
      }
    }

    return newDiffs
  })()

  const digitAdded = prevVal && prevValLen < valLen

  return (
    <span className={[styles.root, className].join(' ')} {...props}>
      <span ref={$ref} className={styles.reference}>
        8
      </span>
      <DigitmeterContext.Provider value={{ height, transitionDuration: transitionDuration || 2000, value }}>
        {new Array(valLen).fill(0).map((_, i) => {
          const position = valLen - i - 1
          const delay = maxedAt - position

          return children(position, {
            delay: delay > 0 ? delay : null,
            diff: diffs[position] || 0,
            value: digitAdded && prevValLen <= position ? 0 : digitAt(val, position, valLen),
          })
        })}
      </DigitmeterContext.Provider>
    </span>
  )
}

function defaultRender(position: number, props: WheelProps) {
  return <Wheel key={position} {...props} />
}

type WheelProps = {
  delay: number | null
  diff: number
  value: number
}

const NUMBERS = '0987654321'.split('')

export const Wheel: React.FC<WheelProps> = ({ delay, diff, value }) => {
  const { height, transitionDuration, value: fullValue } = useContext(DigitmeterContext)

  // angle
  const t = 360 / 10
  // intermediate angle
  const a = (180 - t) / 2
  // radius
  const r = (height * Math.sin(rad(a))) / Math.sin(rad(t)) || 31

  const [rotation, setRotation] = useState(-value)

  useEffect(() => {
    if (diff !== 0) {
      setRotation((rot) => rot + diff)
    }
  }, [fullValue, diff])

  return (
    <span className={styles.glyph}>
      <span
        className={styles.wheel}
        style={{
          transform: `rotateX(${-rotation / 10}turn)`,
          transitionDuration: `${transitionDuration + (delay && delay > 0 ? delay : 0) * (transitionDuration / 20)}ms`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ['--radius' as any]: `${r.toFixed(1)}px`,
        }}
        aria-hidden
      >
        <span className={styles.space}>8</span>
        {NUMBERS.map((g, i) => {
          const active = Math.abs(rotation) % 10 === Number(g)
          return (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <span key={g} className={styles.face} style={{ ['--angle' as any]: `${i * t}deg` }} aria-hidden={!active}>
              {g}
            </span>
          )
        })}
      </span>
    </span>
  )
}

const usePrevious = <T,>(value: T): T | undefined => {
  const ref = useRef<T>()
  useEffect(() => {
    ref.current = value
  })
  return ref.current
}

/** digits */
const len = (value: number): number => (value ? ~~Math.log10(Math.abs(value)) + 1 : 1)
/** radian */
const rad = (deg: number) => deg * (Math.PI / 180)
/**
 * @param value
 * @param pos 0 is the rightmost digit
 * @param length maximum length of the number
 */
const digitAt = (value: number, pos: number, length: number) => ~~((Math.abs(value % 10 ** length) / 10 ** pos) % 10)
