import {faqItem} from './documents/faq-item'
import {homePage} from './documents/home-page'
import {order} from './documents/order'
import {policyPage} from './documents/policy-page'
import {product} from './documents/product'
import {siteSettings} from './documents/site-settings'
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
  // objects
  localizedImage,
  simpleBlockContent,
]
