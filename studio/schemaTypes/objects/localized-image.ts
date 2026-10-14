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
  ],
})
