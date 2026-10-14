import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {internationalizedArray} from 'sanity-plugin-internationalized-array'
import {schemaTypes} from './schemaTypes'
import {NOT_CREATABLE, structure} from './structure'

export default defineConfig({
  name: 'default',
  title: 'Flöra',

  projectId: '559r73zo',
  dataset: 'production',

  plugins: [
    structureTool({structure}),
    visionTool(),
    // Every translatable field is an array of {_key: language, value}. Editors see the English
    // value with a "+ Norsk" button beneath it; the site reads the visitor's language and falls
    // back to English. `fieldTypes` is what the plugin generates `internationalizedArray<Type>` for.
    internationalizedArray({
      languages: [
        {id: 'en', title: 'English'},
        {id: 'no', title: 'Norsk'},
      ],
      defaultLanguages: ['en'],
      fieldTypes: ['string', 'text', 'simpleBlockContent'],
    }),
  ],

  schema: {
    types: schemaTypes,
    // No "create new" for singletons or orders — they come from the structure and the webhook.
    templates: (templates) => templates.filter((t) => !NOT_CREATABLE.includes(t.schemaType)),
  },
  document: {
    // Likewise, no delete/duplicate on them from the document menu.
    actions: (actions, {schemaType}) =>
      NOT_CREATABLE.includes(schemaType)
        ? actions.filter(({action}) => !['delete', 'duplicate', 'unpublish'].includes(action ?? ''))
        : actions,
  },
})
