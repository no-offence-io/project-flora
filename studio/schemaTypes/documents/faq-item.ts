import {HelpCircleIcon} from '../../icons'
import {defineField, defineType} from 'sanity'

export const faqItem = defineType({
  name: 'faqItem',
  title: 'FAQ question',
  type: 'document',
  icon: HelpCircleIcon,
  fields: [
    defineField({name: 'question', title: 'Question', type: 'internationalizedArrayString', validation: (rule) => rule.required()}),
    defineField({name: 'answer', title: 'Answer', type: 'internationalizedArraySimpleBlockContent'}),
    defineField({name: 'image', title: 'Image (optional)', type: 'localizedImage'}),
    defineField({
      name: 'order',
      title: 'Position',
      description: 'Lower numbers show first.',
      type: 'number',
      initialValue: 100,
    }),
  ],
  orderings: [{title: 'Position', name: 'position', by: [{field: 'order', direction: 'asc'}]}],
  preview: {
    select: {question: 'question', media: 'image'},
    prepare: ({question, media}) => ({title: (Array.isArray(question) ? question.find((q) => q._key === 'en')?.value : undefined) ?? 'Question', media}),
  },
})
