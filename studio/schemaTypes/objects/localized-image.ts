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
      description: 'Product photos only. 100 is the usual fit (the whole photo inside the box, with its margin); bigger fills more of the box, smaller leaves more room. The box itself keeps its shape.',
      type: 'number',
      validation: (rule) => rule.min(20).max(200),
    }),
  ],
})
