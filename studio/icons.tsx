import {Icon, type IconSymbol} from '@sanity/icons'
import type {ComponentProps, ComponentType} from 'react'

/**
 * @sanity/icons v5 dropped the named exports (`BasketIcon` etc. — they're typed `never` now) in
 * favour of one `<Icon symbol="…" />`. Studio still wants a component for `icon:` props, so this
 * binds a symbol into one. Symbols: https://icons.sanity.build
 */
const icon = (symbol: IconSymbol): ComponentType<Omit<ComponentProps<typeof Icon>, 'symbol'>> =>
  function BoundIcon(props) {
    return <Icon symbol={symbol} {...props} />
  }

export const BasketIcon = icon('basket')
export const CogIcon = icon('cog')
export const DocumentIcon = icon('document')
export const HelpCircleIcon = icon('help-circle')
export const HomeIcon = icon('home')
export const TagIcon = icon('tag')
