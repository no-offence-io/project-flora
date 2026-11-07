import {aboutPage} from './documents/about-page'
import {customer} from './documents/customer'
import {discount} from './documents/discount'
import {faqItem} from './documents/faq-item'
import {homePage} from './documents/home-page'
import {newsletter} from './documents/newsletter'
import {notification} from './documents/notification'
import {order} from './documents/order'
import {policyPage} from './documents/policy-page'
import {post} from './documents/post'
import {product} from './documents/product'
import {siteSettings} from './documents/site-settings'
import {vippsPayment} from './documents/vipps-payment'
import {pushSubscription} from './documents/push-subscription'
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
  customer,
  newsletter,
  post,
  notification,
  // objects
  localizedImage,
  simpleBlockContent, vippsPayment, pushSubscription]
