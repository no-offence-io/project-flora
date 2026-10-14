import {CogIcon} from '../../icons'
import {defineField, defineType} from 'sanity'

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
  ],
  preview: {prepare: () => ({title: 'Site settings'})},
})
