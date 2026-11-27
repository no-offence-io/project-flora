import {TagIcon} from '../../icons'
import {defineField, defineType} from 'sanity'

/**
 * A code a customer can type at checkout. The checkout applies it on the server only: the browser
 * sends the code, never an amount, and the usage count is written by the Stripe webhook when the
 * order is recorded.
 */
export const discount = defineType({
  name: 'discount',
  title: 'Discount code',
  type: 'document',
  icon: TagIcon,
  fields: [
    defineField({
      name: 'code',
      title: 'Code',
      description: 'What the customer types. Letters and numbers; saved in capitals.',
      type: 'string',
      validation: (rule) => rule.required().regex(/^[A-Z0-9-]{2,30}$/, {name: 'capital letters, numbers and dashes'}),
    }),
    defineField({name: 'description', title: 'Internal note', type: 'string'}),
    defineField({
      name: 'kind',
      title: 'Type',
      type: 'string',
      options: {list: [{title: 'Percent off', value: 'percent'}, {title: 'Amount off (kr)', value: 'amount'}, {title: 'Free shipping only', value: 'shipping'}], layout: 'radio'},
      initialValue: 'percent',
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'value', title: 'Value', description: 'Percent (e.g. 10) or øre (e.g. 10000 for 100 kr). Ignored for free shipping.', type: 'number', validation: (rule) => rule.integer().min(0)}),
    defineField({name: 'freeShipping', title: 'Also free shipping', type: 'boolean', initialValue: false}),
    defineField({name: 'active', title: 'Active', type: 'boolean', initialValue: true}),
    defineField({name: 'startsAt', title: 'Valid from', type: 'datetime'}),
    defineField({name: 'endsAt', title: 'Valid until', type: 'datetime'}),
    defineField({name: 'minSubtotalOre', title: 'Minimum order (øre)', type: 'number', validation: (rule) => rule.integer().min(0)}),
    defineField({name: 'maxUses', title: 'Maximum uses', description: 'Leave empty for unlimited.', type: 'number', validation: (rule) => rule.integer().min(1)}),
    defineField({name: 'uses', title: 'Times used', type: 'number', readOnly: true, initialValue: 0}),
    // Places kept by checkouts in progress on a code with a maximum; written by the shop (src/lib/discount-holds.ts).
    defineField({
      name: 'holds',
      title: 'Held by checkouts in progress',
      type: 'array',
      readOnly: true,
      hidden: true,
      of: [{type: 'object', fields: [{name: 'key', type: 'string'}, {name: 'at', type: 'datetime'}]}],
    }),
  ],
  preview: {
    select: {code: 'code', kind: 'kind', value: 'value', active: 'active', uses: 'uses'},
    prepare: ({code, kind, value, active, uses}) => ({
      title: code,
      subtitle: `${kind === 'percent' ? `${value}%` : kind === 'amount' ? `${(value ?? 0) / 100} kr` : 'free shipping'} · used ${uses ?? 0}×${active ? '' : ' · off'}`,
    }),
  },
})
