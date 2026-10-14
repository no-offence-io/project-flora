import {defineArrayMember, defineType} from 'sanity'

/**
 * Plain rich text: paragraphs, bold/italic, links. No headings or lists, so editors can't invent
 * layout the site doesn't have. Registered with the internationalized-array plugin, which derives
 * `internationalizedArraySimpleBlockContent` from it for translated long-form fields.
 */
export const simpleBlockContent = defineType({
  name: 'simpleBlockContent',
  title: 'Text',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [{title: 'Normal', value: 'normal'}],
      lists: [],
      marks: {
        decorators: [
          {title: 'Bold', value: 'strong'},
          {title: 'Italic', value: 'em'},
        ],
        annotations: [
          {
            name: 'link',
            type: 'object',
            title: 'Link',
            fields: [{name: 'href', type: 'url', title: 'URL'}],
          },
        ],
      },
    }),
  ],
})
