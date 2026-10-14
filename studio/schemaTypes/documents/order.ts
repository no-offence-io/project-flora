import {BasketIcon} from '../../icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * One paid order. Created only by the Stripe webhook, never by hand: every field but the
 * fulfilment ones is read-only here, and the Studio structure offers no "new order" action. The
 * Stripe PaymentIntent id is the record's identity, which is what makes a webhook retry harmless.
 */
export const order = defineType({
  name: 'order',
  title: 'Order',
  type: 'document',
  icon: BasketIcon,
  groups: [
    {name: 'fulfilment', title: 'Fulfilment', default: true},
    {name: 'customer', title: 'Customer'},
    {name: 'payment', title: 'Payment'},
  ],
  fields: [
    defineField({name: 'orderNumber', title: 'Order number', type: 'string', readOnly: true, group: 'fulfilment'}),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'fulfilment',
      options: {
        list: [
          {title: 'Paid — to be packed', value: 'paid'},
          {title: 'Shipped', value: 'shipped'},
          {title: 'Delivered', value: 'delivered'},
          {title: 'Refunded', value: 'refunded'},
          {title: 'Cancelled', value: 'cancelled'},
        ],
        layout: 'radio',
      },
      initialValue: 'paid',
    }),
    defineField({name: 'trackingNumber', title: 'Tracking number', type: 'string', group: 'fulfilment'}),
    defineField({name: 'internalNote', title: 'Internal note', type: 'text', rows: 3, group: 'fulfilment'}),
    defineField({name: 'orderedAt', title: 'Ordered at', type: 'datetime', readOnly: true, group: 'fulfilment'}),

    defineField({
      name: 'customer',
      title: 'Customer',
      type: 'object',
      group: 'customer',
      readOnly: true,
      fields: [
        defineField({name: 'name', type: 'string'}),
        defineField({name: 'email', type: 'string'}),
        defineField({name: 'phone', type: 'string'}),
        defineField({name: 'address', type: 'text', rows: 3}),
        defineField({name: 'note', title: 'Note from customer', type: 'text', rows: 3}),
      ],
    }),

    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      group: 'payment',
      readOnly: true,
      of: [
        defineArrayMember({
          type: 'object',
          name: 'orderItem',
          fields: [
            defineField({name: 'product', type: 'reference', to: [{type: 'product'}]}),
            defineField({name: 'name', type: 'string'}),
            defineField({name: 'quantity', type: 'number'}),
            defineField({name: 'unitPriceOre', title: 'Unit price (øre)', type: 'number'}),
          ],
          preview: {
            select: {name: 'name', quantity: 'quantity', unitPriceOre: 'unitPriceOre'},
            prepare: ({name, quantity, unitPriceOre}) => ({title: `${quantity} × ${name}`, subtitle: `${(unitPriceOre ?? 0) / 100} kr each`}),
          },
        }),
      ],
    }),
    defineField({name: 'subtotalOre', title: 'Subtotal (øre)', type: 'number', readOnly: true, group: 'payment'}),
    defineField({name: 'shippingOre', title: 'Shipping (øre)', type: 'number', readOnly: true, group: 'payment'}),
    defineField({name: 'vatIncludedOre', title: 'Of which VAT (øre)', type: 'number', readOnly: true, group: 'payment'}),
    defineField({name: 'totalOre', title: 'Total (øre)', type: 'number', readOnly: true, group: 'payment'}),
    defineField({name: 'currency', type: 'string', readOnly: true, group: 'payment', initialValue: 'nok'}),
    defineField({name: 'paymentProvider', title: 'Paid with', type: 'string', readOnly: true, group: 'payment'}),
    defineField({
      name: 'stripePaymentIntentId',
      title: 'Stripe PaymentIntent',
      description: 'Open this id in the Stripe dashboard to refund or inspect the payment.',
      type: 'string',
      readOnly: true,
      group: 'payment',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {orderNumber: 'orderNumber', status: 'status', totalOre: 'totalOre', name: 'customer.name', orderedAt: 'orderedAt'},
    prepare: ({orderNumber, status, totalOre, name, orderedAt}) => ({
      title: `${orderNumber ?? 'Order'} · ${name ?? ''}`,
      subtitle: `${status ?? ''} · ${(totalOre ?? 0) / 100} kr · ${orderedAt ? new Date(orderedAt).toLocaleDateString('nb-NO') : ''}`,
    }),
  },
})
