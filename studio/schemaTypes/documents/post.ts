import {DocumentIcon} from '../../icons'
import {defineField, defineType} from 'sanity'

const english = (value: unknown) =>
  (Array.isArray(value) ? value.find((v) => v?._key === 'en')?.value : undefined) as string | undefined

/** A journal post: a photo, a title, some paragraphs. Shown at /journal when published. */
export const post = defineType({
  name: 'post',
  title: 'Journal post',
  type: 'document',
  icon: DocumentIcon,
  fields: [
    defineField({name: 'title', title: 'Title', type: 'internationalizedArrayString', validation: (rule) => rule.required()}),
    defineField({
      name: 'slug',
      title: 'Web address',
      type: 'slug',
      options: {source: (doc) => english(doc.title) ?? '', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'date', title: 'Date', type: 'date'}),
    defineField({name: 'image', title: 'Photo', type: 'localizedImage'}),
    defineField({name: 'intro', title: 'Intro', type: 'internationalizedArrayText'}),
    defineField({name: 'body', title: 'Text', type: 'internationalizedArraySimpleBlockContent'}),
    defineField({name: 'published', title: 'Published', type: 'boolean', initialValue: false}),
  ],
  orderings: [{title: 'Newest', name: 'newest', by: [{field: 'date', direction: 'desc'}]}],
  preview: {
    select: {title: 'title', date: 'date', published: 'published', media: 'image'},
    prepare: ({title, date, published, media}) => ({title: english(title) ?? 'Post', subtitle: `${date ?? ''}${published ? '' : ' · draft'}`, media}),
  },
})
