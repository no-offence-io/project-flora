import {TagIcon} from '../../icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

/** Reads the English value out of an internationalized array, for slugs and previews. */
const english = (value: unknown) =>
  (Array.isArray(value) ? value.find((v) => v?._key === 'en')?.value : undefined) as string | undefined

export const product = defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  icon: TagIcon,
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'pricing', title: 'Price & stock'},
    {name: 'media', title: 'Photos & colours'},
    {name: 'details', title: 'Details'},
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'internationalizedArrayString',
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Web address',
      description: 'The last part of the product\'s URL, e.g. "wrap-skirt". Generated from the English name.',
      type: 'slug',
      group: 'content',
      options: {source: (doc) => english(doc.name) ?? '', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      group: 'content',
      options: {list: ['Tops', 'Skirts', 'Pants', 'Sets', 'Accessories'], layout: 'radio'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'internationalizedArrayText',
      group: 'content',
    }),
    defineField({
      name: 'visible',
      title: 'Show in the shop',
      description: 'Turn off to hide the product without deleting it.',
      type: 'boolean',
      group: 'content',
      initialValue: true,
    }),

    defineField({
      name: 'priceOre',
      title: 'Price (øre, VAT included)',
      description: 'In øre, so 1 290 kr is 129000. VAT is included in this number; it is never added on top.',
      type: 'number',
      group: 'pricing',
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({
      name: 'compareAtPriceOre',
      title: 'Previous price (øre), for sale items',
      description: 'Leave empty unless the product is on sale. Shown struck through, and turns on the sale badge.',
      type: 'number',
      group: 'pricing',
      validation: (rule) =>
        rule.integer().min(0).custom((value, ctx) => {
          const price = (ctx.document as {priceOre?: number} | undefined)?.priceOre
          return value !== undefined && price !== undefined && value <= price
            ? 'The previous price should be higher than the current price'
            : true
        }),
    }),
    defineField({
      name: 'sizing',
      title: 'How is it sized?',
      description:
        'Measurements: the customer types their measurements in cm when ordering (the default — made to measure). Sizes: a fixed list, each with its own stock. None: one size, e.g. accessories or a vintage piece.',
      type: 'string',
      group: 'pricing',
      options: {
        list: [
          {title: 'Customer gives measurements in cm', value: 'measurements'},
          {title: 'Fixed sizes with stock per size', value: 'sizes'},
          {title: 'No size', value: 'none'},
        ],
        layout: 'radio',
      },
      initialValue: 'measurements',
    }),
    defineField({
      name: 'stock',
      title: 'In stock',
      description: 'Units available. Checkout refuses orders above this, and each paid order counts it down. Ignored for products with fixed sizes — each size has its own number.',
      type: 'number',
      group: 'pricing',
      validation: (rule) => rule.required().integer().min(0),
      initialValue: 0,
    }),
    defineField({
      name: 'sizes',
      title: 'Sizes',
      description: 'Only used when "Fixed sizes" is chosen above.',
      type: 'array',
      group: 'pricing',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'size',
          fields: [
            defineField({
              name: 'label',
              title: 'Size',
              type: 'string',
              validation: (rule) => rule.required().regex(/^[A-Za-z0-9 ./-]{1,20}$/, {name: 'size label (letters, numbers, space, . / -)'}),
            }),
            defineField({name: 'stock', title: 'In stock', type: 'number', validation: (rule) => rule.required().integer().min(0), initialValue: 0}),
          ],
          preview: {select: {label: 'label', stock: 'stock'}, prepare: ({label, stock}) => ({title: label, subtitle: `${stock ?? 0} in stock`})},
        }),
      ],
      hidden: ({document}) => document?.sizing !== 'sizes',
    }),
    defineField({
      name: 'tailored',
      title: 'Also Tailored',
      description: 'The customer may choose Tailored instead of a size, and give their measurements. Tailored pieces are made to order and use no stock.',
      type: 'boolean',
      group: 'pricing',
      initialValue: false,
      hidden: ({document}) => document?.sizing !== 'sizes',
    }),
    defineField({
      name: 'tailoredExtraOre',
      title: 'Extra for Tailored (øre)',
      type: 'number',
      group: 'pricing',
      validation: (rule) => rule.integer().min(0),
      hidden: ({document}) => document?.sizing !== 'sizes' || document?.tailored !== true,
    }),
    defineField({
      name: 'trackStock',
      title: 'Count stock',
      description: 'Off: the piece is always available and paid orders count nothing down (made to order, or not worth counting).',
      type: 'boolean',
      group: 'pricing',
      initialValue: true,
    }),
    defineField({
      name: 'vintage',
      title: 'Vintage piece',
      description: 'Shown on the Vintage page instead of the shop. Usually one of a kind: set "No size" and stock 1.',
      type: 'boolean',
      group: 'content',
      initialValue: false,
    }),
    defineField({
      name: 'vintageLayout',
      title: 'Vintage page layout',
      description: 'How the piece\'s own page looks: the turning 3D card at the top, or the same page as a normal product (photo gallery and details side by side).',
      type: 'string',
      group: 'content',
      options: {
        list: [
          {title: '3D card at the top', value: 'card'},
          {title: 'Normal product page', value: 'plain'},
        ],
        layout: 'radio',
      },
      initialValue: 'card',
      hidden: ({document}) => document?.vintage !== true,
    }),

    defineField({
      name: 'images',
      title: 'Product photos',
      type: 'array',
      group: 'media',
      of: [defineArrayMember({type: 'localizedImage'})],
      validation: (rule) => rule.min(1),
    }),
    defineField({
      name: 'gif',
      title: 'Animated GIF',
      description: 'Made in the admin from the photos above (the colour photos cross-fade). Used in newsletters.',
      type: 'file',
      group: 'media',
      options: {accept: 'image/gif'},
    }),
    defineField({
      name: 'colors',
      title: 'Colours',
      type: 'array',
      group: 'media',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'color',
          fields: [
            defineField({name: 'name', title: 'Name', type: 'internationalizedArrayString', validation: (rule) => rule.required()}),
            defineField({
              name: 'hex',
              title: 'Swatch colour',
              description: 'Hex code, e.g. #6b7280',
              type: 'string',
              validation: (rule) => rule.required().regex(/^#([0-9a-f]{3}){1,2}$/i, {name: 'hex colour'}),
            }),
            defineField({name: 'image', title: 'Photo in this colour', type: 'localizedImage'}),
            defineField({name: 'photoKeys', title: 'Photos in this colour', description: 'Keys of the product photos that show this colour, main first. Picked on the dashboard.', type: 'array', of: [defineArrayMember({type: 'string'})], readOnly: true}),
          ],
          preview: {
            select: {name: 'name', hex: 'hex', media: 'image'},
            prepare: ({name, hex, media}) => ({title: english(name) ?? 'Colour', subtitle: hex, media}),
          },
        }),
      ],
    }),

    defineField({
      name: 'specs',
      title: 'Details list',
      description: 'The rows under the price on the product page (material, fit, care…).',
      type: 'array',
      group: 'details',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'spec',
          fields: [
            defineField({name: 'label', title: 'Label', type: 'internationalizedArrayString', validation: (rule) => rule.required()}),
            defineField({name: 'value', title: 'Value', type: 'internationalizedArrayString'}),
            defineField({name: 'emphasis', title: 'Highlight this row', type: 'boolean', initialValue: false}),
            defineField({name: 'expandable', title: 'Collapsible on mobile', type: 'boolean', initialValue: false}),
            defineField({name: 'hideOnMobile', title: 'Hide on mobile', type: 'boolean', initialValue: false}),
          ],
          preview: {
            select: {label: 'label', value: 'value'},
            prepare: ({label, value}) => ({title: english(label) ?? 'Row', subtitle: english(value)}),
          },
        }),
      ],
    }),
  ],
  preview: {
    select: {name: 'name', priceOre: 'priceOre', stock: 'stock', media: 'images.0', visible: 'visible'},
    prepare: ({name, priceOre, stock, media, visible}) => ({
      title: english(name) ?? 'Untitled product',
      subtitle: `${priceOre !== undefined ? `${priceOre / 100} kr` : 'no price'} · ${stock ?? 0} in stock${visible === false ? ' · hidden' : ''}`,
      media,
    }),
  },
})
