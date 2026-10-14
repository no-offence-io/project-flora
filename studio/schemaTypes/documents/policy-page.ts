import {DocumentIcon} from '../../icons'
import {defineField, defineType} from 'sanity'

/** Terms, refunds & exchange, privacy, shipping. One document per page, keyed by a fixed page id. */
export const policyPage = defineType({
  name: 'policyPage',
  title: 'Policy page',
  type: 'document',
  icon: DocumentIcon,
  fields: [
    defineField({
      name: 'page',
      title: 'Which page',
      type: 'string',
      options: {
        list: [
          {title: 'Terms', value: 'terms'},
          {title: 'Refunds & exchange', value: 'refunds-and-exchange'},
          {title: 'Privacy', value: 'privacy'},
          {title: 'Shipping', value: 'shipping'},
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'title', title: 'Title', type: 'internationalizedArrayString', validation: (rule) => rule.required()}),
    defineField({name: 'intro', title: 'Intro', type: 'internationalizedArrayText'}),
    defineField({name: 'body', title: 'Text', type: 'internationalizedArraySimpleBlockContent'}),
  ],
  preview: {
    select: {page: 'page', title: 'title'},
    prepare: ({page, title}) => ({title: (Array.isArray(title) ? title.find((t) => t._key === 'en')?.value : undefined) ?? page, subtitle: page}),
  },
})
