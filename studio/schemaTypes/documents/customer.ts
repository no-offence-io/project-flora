import {UserIcon} from '../../icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * A customer account. Created the first time someone signs in with an emailed link, or from the
 * "save my details" tick at checkout. Orders are not stored here; they are found by email.
 */
export const customer = defineType({
  name: 'customer',
  title: 'Customer',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({name: 'email', title: 'Email', type: 'string', readOnly: true, validation: (rule) => rule.required()}),
    defineField({name: 'firstName', title: 'First name', type: 'string'}),
    defineField({name: 'lastName', title: 'Last name', type: 'string'}),
    defineField({name: 'phonePrefix', title: 'Phone prefix', type: 'string'}),
    defineField({name: 'phone', title: 'Phone', type: 'string'}),
    defineField({name: 'street', title: 'Street address', type: 'string'}),
    defineField({name: 'apartment', title: 'Apartment', type: 'string'}),
    defineField({name: 'postcode', title: 'Postcode', type: 'string'}),
    defineField({name: 'city', title: 'City', type: 'string'}),
    defineField({name: 'country', title: 'Country', type: 'string'}),
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
    defineField({name: 'stripeCustomerId', title: 'Stripe customer', description: 'Saved cards are kept at Stripe under this id; we never see card numbers.', type: 'string', readOnly: true}),
    defineField({name: 'sessionVersion', title: 'Session version', type: 'number', readOnly: true, hidden: true}),
    defineField({name: 'language', title: 'Language', type: 'string', readOnly: true}),
    defineField({name: 'createdAt', title: 'Created', type: 'datetime', readOnly: true}),
    defineField({name: 'lastSignInAt', title: 'Last sign-in', type: 'datetime', readOnly: true}),
  ],
  preview: {
    select: {email: 'email', firstName: 'firstName', lastName: 'lastName'},
    prepare: ({email, firstName, lastName}) => ({title: [firstName, lastName].filter(Boolean).join(' ') || email, subtitle: email}),
  },
})
