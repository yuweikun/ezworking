import { HotkeysConfig, HotkeysProvider } from '@saas-ui/react'

import { appHotkeys } from '#config'

interface HotkeysProps {
  hotkeys?: HotkeysConfig
  children: React.ReactNode
}

export const Hotkeys: React.FC<HotkeysProps> = ({ children, hotkeys }) => {
  return (
    <HotkeysProvider hotkeys={hotkeys || appHotkeys}>
      {children}
    </HotkeysProvider>
  )
}
