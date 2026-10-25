import {CogIcon} from '../../icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

/** Things that appear on every page. A singleton. */
export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  icon: CogIcon,
  groups: [
    {name: 'general', title: 'General', default: true},
    {name: 'signup', title: 'Sign-up banner'},
    {name: 'footer', title: 'Footer'},
    {name: 'shop', title: 'Shop rules'},
    {name: 'sizing', title: 'Sizing'},
  ],
  fields: [
    defineField({name: 'siteName', title: 'Site name', type: 'string', group: 'general', initialValue: 'Flöra'}),
    defineField({
      name: 'announcement',
      title: 'Announcement bar',
      description: 'Short line shown at the top of every page. Leave empty to hide.',
      type: 'internationalizedArrayString',
      group: 'general',
    }),

    defineField({name: 'signUpTitle', title: 'Title', type: 'internationalizedArrayString', group: 'signup'}),
    defineField({name: 'signUpText', title: 'Text', type: 'internationalizedArrayText', group: 'signup'}),
    defineField({name: 'signUpButton', title: 'Button label', type: 'internationalizedArrayString', group: 'signup'}),
    defineField({name: 'signUpImage', title: 'Image', type: 'localizedImage', group: 'signup'}),

    defineField({name: 'footerText', title: 'Footer text', type: 'internationalizedArrayText', group: 'footer'}),
    defineField({name: 'footerImage', title: 'Footer image', type: 'localizedImage', group: 'footer'}),
    defineField({name: 'instagram', title: 'Instagram URL', type: 'url', group: 'footer'}),
    defineField({name: 'contactEmail', title: 'Contact email', type: 'string', group: 'footer'}),

    defineField({
      name: 'shippingOre',
      title: 'Shipping price (øre)',
      description: 'Flat shipping in øre, e.g. 8900 for 89 kr.',
      type: 'number',
      group: 'shop',
      validation: (rule) => rule.required().integer().min(0),
      initialValue: 8900,
    }),
    defineField({
      name: 'freeShippingFromOre',
      title: 'Free shipping from (øre)',
      description: 'Orders at or above this amount ship free. Leave empty for never.',
      type: 'number',
      group: 'shop',
      validation: (rule) => rule.integer().min(0),
      initialValue: 150000,
    }),
    defineField({
      name: 'shippingZones',
      title: 'Shipping zones',
      description: 'Countries with their own price. A country in no zone gets the flat price above.',
      type: 'array',
      group: 'shop',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'shippingZone',
          fields: [
            defineField({name: 'name', title: 'Name', type: 'string', validation: (rule) => rule.required()}),
            defineField({
              name: 'countries',
              title: 'Countries',
              description: 'Country names as the checkout lists them, e.g. Norway, Sweden.',
              type: 'array',
              of: [defineArrayMember({type: 'string'})],
              validation: (rule) => rule.required().min(1),
            }),
            defineField({name: 'shippingOre', title: 'Shipping price (øre)', type: 'number', validation: (rule) => rule.required().integer().min(0)}),
            defineField({name: 'freeShippingFromOre', title: 'Free shipping from (øre)', description: 'Leave empty for never.', type: 'number', validation: (rule) => rule.integer().min(0)}),
          ],
          preview: {
            select: {name: 'name', countries: 'countries', shippingOre: 'shippingOre'},
            prepare: ({name, countries, shippingOre}) => ({title: name, subtitle: `${(countries ?? []).join(', ')} · ${(shippingOre ?? 0) / 100} kr`}),
          },
        }),
      ],
    }),
    defineField({
      name: 'shipsTo',
      title: 'Countries we ship to',
      description: 'The country list in the checkout. Leave empty for the built-in list.',
      type: 'array',
      group: 'shop',
      of: [defineArrayMember({type: 'string'})],
    }),

    defineField({
      name: 'measurementFields',
      title: 'Measurements asked for',
      description: 'What a customer fills in, in cm, for made-to-measure products. In the order they appear.',
      type: 'array',
      group: 'sizing',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'measurementField',
          fields: [
            defineField({name: 'label', title: 'Label', type: 'internationalizedArrayString', validation: (rule) => rule.required()}),
            defineField({name: 'hint', title: 'How to measure', type: 'internationalizedArrayString'}),
          ],
          preview: {
            select: {label: 'label'},
            prepare: ({label}) => ({title: (Array.isArray(label) ? label.find((l) => l._key === 'en')?.value : undefined) ?? 'Measurement'}),
          },
        }),
      ],
    }),
    defineField({
      name: 'sizeGuide',
      title: 'Size guide',
      description: 'Shown under the measurements on the product page. Plain text; leave an empty line between paragraphs.',
      type: 'internationalizedArrayText',
      group: 'sizing',
    }),
  ],
  preview: {prepare: () => ({title: 'Site settings'})},
})
