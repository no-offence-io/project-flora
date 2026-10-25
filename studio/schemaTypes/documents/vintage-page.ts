import {DocumentIcon} from '../../icons'
import {defineField, defineType} from 'sanity'

/** The Vintage page's own words; the pieces on it are the products marked "vintage". A singleton. */
export const vintagePage = defineType({
  name: 'vintagePage',
  title: 'Vintage page',
  type: 'document',
  icon: DocumentIcon,
  fields: [
    defineField({name: 'title', title: 'Title', type: 'internationalizedArrayString', validation: (rule) => rule.required()}),
    defineField({name: 'intro', title: 'Intro', type: 'internationalizedArrayText'}),
    defineField({name: 'image', title: 'Photo', type: 'localizedImage'}),
    defineField({name: 'emptyText', title: 'Text when nothing is for sale', type: 'internationalizedArrayText'}),
  ],
  preview: {prepare: () => ({title: 'Vintage page'})},
})
