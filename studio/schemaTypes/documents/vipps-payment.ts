import {defineField, defineType} from 'sanity'

/**
 * A Vipps payment the checkout started: what was in the cart and who is buying, kept until the
 * payment is settled and the order written. Written by the server only; nothing to edit here.
 */
export const vippsPayment = defineType({
  name: 'vippsPayment',
  title: 'Vipps payment',
  type: 'document',
  readOnly: true,
  fields: [
    defineField({name: 'reference', title: 'Vipps reference', type: 'string'}),
    defineField({name: 'status', title: 'Status', type: 'string', options: {list: ['created', 'authorized', 'captured', 'aborted', 'expired', 'terminated', 'failed']}}),
    defineField({name: 'amountOre', title: 'Amount (øre)', type: 'number'}),
    defineField({name: 'email', title: 'Customer email', type: 'string'}),
    defineField({name: 'metadata', title: 'Cart and customer, as metadata', type: 'text', rows: 6}),
    defineField({name: 'environment', title: 'Environment', type: 'string'}),
    defineField({name: 'createdAt', title: 'Started', type: 'datetime'}),
    defineField({name: 'settledAt', title: 'Settled', type: 'datetime'}),
    defineField({name: 'orderId', title: 'Order document', type: 'string'}),
    defineField({name: 'error', title: 'Last error', type: 'string'}),
  ],
  preview: {
    select: {reference: 'reference', status: 'status', amountOre: 'amountOre', email: 'email'},
    prepare: ({reference, status, amountOre, email}) => ({title: `${reference} · ${status}`, subtitle: `${(amountOre ?? 0) / 100} kr · ${email ?? ''}`}),
  },
})
