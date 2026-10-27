import {BasketIcon, CogIcon, DocumentIcon, EnvelopeIcon, HelpCircleIcon, HomeIcon, TagIcon, UserIcon} from './icons'
import type {StructureResolver} from 'sanity/structure'

/** Document types pinned to exactly one document each. Kept out of the generic lists below. */
export const SINGLETONS = ['homePage', 'siteSettings', 'aboutPage', 'vintagePage']

/** Types no one should create by hand: orders come from the Stripe webhook. */
export const NOT_CREATABLE = [...SINGLETONS, 'order', 'subscriber', 'notification', 'customer']

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Flöra')
    .items([
      S.listItem()
        .title('Orders')
        .icon(BasketIcon)
        .child(
          S.documentTypeList('order')
            .title('Orders')
            .defaultOrdering([{field: 'orderedAt', direction: 'desc'}]),
        ),
      S.divider(),

      S.listItem().title('Products').icon(TagIcon).child(S.documentTypeList('product').title('Products')),
      S.listItem().title('Discount codes').icon(TagIcon).child(S.documentTypeList('discount').title('Discount codes')),
      S.listItem().title('Newsletters').icon(EnvelopeIcon).child(S.documentTypeList('newsletter').title('Newsletters').defaultOrdering([{field: '_createdAt', direction: 'desc'}])),
      S.listItem().title('Journal').icon(DocumentIcon).child(S.documentTypeList('post').title('Journal posts').defaultOrdering([{field: 'date', direction: 'desc'}])),
      S.listItem().title('Customers').icon(UserIcon).child(S.documentTypeList('customer').title('Customers').defaultOrdering([{field: 'createdAt', direction: 'desc'}])),
      S.listItem().title('Subscribers').icon(UserIcon).child(S.documentTypeList('subscriber').title('Newsletter subscribers').defaultOrdering([{field: 'signedUpAt', direction: 'desc'}])),
      S.divider(),

      S.listItem()
        .title('Front page')
        .icon(HomeIcon)
        .child(S.document().schemaType('homePage').documentId('homePage').title('Front page')),
      S.listItem()
        .title('About page')
        .icon(DocumentIcon)
        .child(S.document().schemaType('aboutPage').documentId('aboutPage').title('About page')),
      S.listItem()
        .title('Vintage page')
        .icon(DocumentIcon)
        .child(S.document().schemaType('vintagePage').documentId('vintagePage').title('Vintage page')),
      S.listItem().title('FAQ').icon(HelpCircleIcon).child(S.documentTypeList('faqItem').title('FAQ')),
      S.listItem()
        .title('Policy pages')
        .icon(DocumentIcon)
        .child(S.documentTypeList('policyPage').title('Policy pages')),
      S.divider(),

      S.listItem()
        .title('Site settings')
        .icon(CogIcon)
        .child(S.document().schemaType('siteSettings').documentId('siteSettings').title('Site settings')),
    ])
