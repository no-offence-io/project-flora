import {defineField, defineType} from 'sanity'

/** An image whose alt text can be translated. */
export const localizedImage = defineType({
  name: 'localizedImage',
  title: 'Image',
  type: 'image',
  options: {hotspot: true},
  fields: [
    defineField({
      name: 'alt',
      title: 'Alt text',
      description: 'Describes the image for screen readers and search engines.',
      type: 'internationalizedArrayString',
    }),
    defineField({
      name: 'scale',
      title: 'Size in its box (%)',
      description: 'Set in the dashboard\'s media editor. 100 is the usual fit; bigger fills more of the box, smaller leaves more room. The box itself keeps its shape.',
      type: 'number',
      validation: (rule) => rule.min(20).max(500),
    }),
    defineField({name: 'x', title: 'Shift sideways (%)', description: 'Set in the dashboard\'s media editor. Percent of the box\'s width; 0 is centred.', type: 'number', validation: (rule) => rule.min(-200).max(200)}),
    defineField({name: 'y', title: 'Shift up or down (%)', description: 'Set in the dashboard\'s media editor. Percent of the box\'s height; 0 is centred.', type: 'number', validation: (rule) => rule.min(-200).max(200)}),
  ],
})
