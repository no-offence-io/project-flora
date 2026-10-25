import {aboutPage} from './documents/about-page'
import {discount} from './documents/discount'
import {faqItem} from './documents/faq-item'
import {homePage} from './documents/home-page'
import {order} from './documents/order'
import {policyPage} from './documents/policy-page'
import {product} from './documents/product'
import {siteSettings} from './documents/site-settings'
import {subscriber} from './documents/subscriber'
import {vintagePage} from './documents/vintage-page'
import {localizedImage} from './objects/localized-image'
import {simpleBlockContent} from './objects/simple-block-content'

export const schemaTypes = [
  // documents
  product,
  order,
  homePage,
  siteSettings,
  faqItem,
  policyPage,
  aboutPage,
  vintagePage,
  discount,
  subscriber,
  // objects
  localizedImage,
  simpleBlockContent,
]
