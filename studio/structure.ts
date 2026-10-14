import {BasketIcon, CogIcon, DocumentIcon, HelpCircleIcon, HomeIcon, TagIcon} from './icons'
import type {StructureResolver} from 'sanity/structure'

/** Document types pinned to exactly one document each. Kept out of the generic lists below. */
export const SINGLETONS = ['homePage', 'siteSettings']

/** Types no one should create by hand: orders come from the Stripe webhook. */
export const NOT_CREATABLE = [...SINGLETONS, 'order']

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
      S.divider(),

      S.listItem()
        .title('Front page')
        .icon(HomeIcon)
        .child(S.document().schemaType('homePage').documentId('homePage').title('Front page')),
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
