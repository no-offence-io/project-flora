import {DocumentIcon} from '../../icons'
import {defineField, defineType} from 'sanity'

/** The About page: a photo, a title and a few paragraphs. A singleton. */
export const aboutPage = defineType({
  name: 'aboutPage',
  title: 'About page',
  type: 'document',
  icon: DocumentIcon,
  fields: [
    defineField({name: 'title', title: 'Title', type: 'internationalizedArrayString', validation: (rule) => rule.required()}),
    defineField({name: 'intro', title: 'Intro', type: 'internationalizedArrayText'}),
    defineField({name: 'body', title: 'Text', type: 'internationalizedArraySimpleBlockContent'}),
    defineField({name: 'image', title: 'Photo', type: 'localizedImage'}),
  ],
  preview: {prepare: () => ({title: 'About page'})},
})
