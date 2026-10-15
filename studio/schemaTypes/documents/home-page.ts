import {HomeIcon} from '../../icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

/** The front page. A singleton: the Studio structure pins it to one document. */
export const homePage = defineType({
  name: 'homePage',
  title: 'Front page',
  type: 'document',
  icon: HomeIcon,
  fields: [
    defineField({
      name: 'hero',
      title: 'Top video',
      type: 'object',
      fields: [
        defineField({
          name: 'video',
          title: 'Video file',
          description:
            'Upload an MP4 (H.264, muted, ideally under 10 MB — it loops on every visit). Served from Sanity, which counts against bandwidth; a hosted URL below is the alternative.',
          type: 'file',
          options: {accept: 'video/mp4,video/webm'},
        }),
        defineField({
          name: 'videoUrl',
          title: 'Video URL (used if no file is uploaded)',
          description: 'A hosted MP4. Keep it short and muted; it loops in the background.',
          type: 'url',
        }),
        defineField({
          name: 'logoPosition',
          title: 'Logo position',
          type: 'string',
          options: {list: ['left', 'center'], layout: 'radio'},
          initialValue: 'left',
        }),
      ],
    }),
    defineField({name: 'productsTitle', title: 'Products section title', type: 'internationalizedArrayString'}),
    defineField({
      name: 'values',
      title: 'Values section',
      type: 'object',
      fields: [
        defineField({name: 'title', title: 'Title', type: 'internationalizedArrayString'}),
        defineField({name: 'intro', title: 'Intro', type: 'internationalizedArrayText'}),
        defineField({
          name: 'items',
          title: 'Values',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'object',
              name: 'value',
              fields: [
                defineField({name: 'title', title: 'Title', type: 'internationalizedArrayString', validation: (rule) => rule.required()}),
                defineField({name: 'description', title: 'Text', type: 'internationalizedArrayText'}),
                defineField({name: 'image', title: 'Photo', type: 'localizedImage'}),
              ],
              preview: {
                select: {title: 'title', media: 'image'},
                prepare: ({title, media}) => ({title: (Array.isArray(title) ? title.find((t) => t._key === 'en')?.value : undefined) ?? 'Value', media}),
              },
            }),
          ],
        }),
      ],
    }),
  ],
  preview: {prepare: () => ({title: 'Front page'})},
})
