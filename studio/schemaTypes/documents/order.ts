import {BasketIcon} from '../../icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * One order. Paid ones are created by the Stripe webhook, and the PaymentIntent id is their
 * identity, which is what makes a webhook retry harmless. Ida can also add one by hand in the
 * dashboard (a PR gift, a sale at a market): those carry `manual` and no PaymentIntent. Every field
 * but the fulfilment ones is read-only here.
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
    defineField({name: 'demo', title: 'Test-mode data', type: 'boolean', readOnly: true, hidden: true}),
    defineField({
      name: 'manual',
      title: 'Added by hand',
      type: 'string',
      readOnly: true,
      group: 'fulfilment',
      options: {list: [{title: 'PR / gift', value: 'pr'}, {title: 'Sale outside the shop', value: 'sale'}]},
    }),
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
          {title: 'Delivered (completed)', value: 'delivered'},
          {title: 'Returned', value: 'returned'},
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
    defineField({name: 'language', title: 'Customer language', type: 'string', readOnly: true, group: 'fulfilment'}),
    defineField({name: 'confirmationSentAt', title: 'Confirmation email sent', type: 'datetime', readOnly: true, group: 'fulfilment'}),
    defineField({name: 'shippingEmailSentAt', title: 'Shipping email sent', type: 'datetime', readOnly: true, group: 'fulfilment'}),

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
            defineField({name: 'size', title: 'Size', type: 'string'}),
            defineField({
              name: 'measurements',
              title: 'Measurements (cm)',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'object',
                  name: 'measurement',
                  fields: [defineField({name: 'label', type: 'string'}), defineField({name: 'value', type: 'string'})],
                  preview: {select: {label: 'label', value: 'value'}, prepare: ({label, value}) => ({title: `${label}: ${value} cm`})},
                }),
              ],
            }),
          ],
          preview: {
            select: {name: 'name', quantity: 'quantity', unitPriceOre: 'unitPriceOre', size: 'size'},
            prepare: ({name, quantity, unitPriceOre, size}) => ({title: `${quantity} × ${name}${size ? ` (${size})` : ''}`, subtitle: `${(unitPriceOre ?? 0) / 100} kr each`}),
          },
        }),
      ],
    }),
    defineField({name: 'subtotalOre', title: 'Subtotal (øre)', type: 'number', readOnly: true, group: 'payment'}),
    defineField({name: 'discountCode', title: 'Discount code', type: 'string', readOnly: true, group: 'payment'}),
    defineField({name: 'discountOre', title: 'Discount (øre)', type: 'number', readOnly: true, group: 'payment'}),
    defineField({name: 'shippingOre', title: 'Shipping (øre)', type: 'number', readOnly: true, group: 'payment'}),
    defineField({name: 'vatIncludedOre', title: 'Of which VAT (øre)', type: 'number', readOnly: true, group: 'payment'}),
    defineField({name: 'totalOre', title: 'Total (øre)', type: 'number', readOnly: true, group: 'payment'}),
    defineField({
      name: 'paymentCard',
      title: 'Card',
      type: 'object',
      readOnly: true,
      group: 'payment',
      fields: [defineField({name: 'brand', type: 'string'}), defineField({name: 'last4', title: 'Last four digits', type: 'string'})],
    }),
    defineField({
      name: 'origin',
      title: 'Where the customer came from',
      type: 'object',
      readOnly: true,
      group: 'customer',
      fields: [
        defineField({name: 'label', type: 'string'}),
        defineField({name: 'device', type: 'string'}),
        defineField({name: 'pageViews', title: 'Pages viewed', type: 'number'}),
        defineField({name: 'landing', title: 'First page', type: 'string'}),
        defineField({name: 'referrer', type: 'string'}),
        defineField({name: 'campaign', type: 'string'}),
      ],
    }),
    defineField({name: 'currency', type: 'string', readOnly: true, group: 'payment', initialValue: 'nok'}),
    defineField({name: 'paymentProvider', title: 'Paid with', type: 'string', readOnly: true, group: 'payment'}),
    defineField({
      name: 'stripePaymentIntentId',
      title: 'Stripe PaymentIntent',
      description: 'Open this id in the Stripe dashboard to refund or inspect the payment.',
      type: 'string',
      readOnly: true,
      group: 'payment',
      validation: (rule) => rule.custom((value, ctx) => (value || (ctx.document as {manual?: string; vippsReference?: string} | undefined)?.manual || (ctx.document as {vippsReference?: string} | undefined)?.vippsReference ? true : 'Required')),
    }),
    defineField({
      name: 'vippsReference',
      title: 'Vipps reference',
      description: 'Find this payment in the Vipps MobilePay portal by this reference.',
      type: 'string',
      readOnly: true,
      group: 'payment',
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
