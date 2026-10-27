import {UserIcon} from '../../icons'
import {defineField, defineType} from 'sanity'

/** One newsletter sign-up from the banner. Written by the site, never created by hand. */
export const subscriber = defineType({
  name: 'subscriber',
  title: 'Subscriber',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({name: 'demo', title: 'Test-mode data', type: 'boolean', readOnly: true, hidden: true}),
    defineField({name: 'email', title: 'Email', type: 'string', readOnly: true, validation: (rule) => rule.required()}),
    defineField({name: 'language', title: 'Language', type: 'string', readOnly: true}),
    defineField({name: 'signedUpAt', title: 'Signed up', type: 'datetime', readOnly: true}),
    defineField({name: 'unsubscribedAt', title: 'Unsubscribed', type: 'datetime'}),
  ],
  preview: {
    select: {email: 'email', signedUpAt: 'signedUpAt', unsubscribedAt: 'unsubscribedAt'},
    prepare: ({email, signedUpAt, unsubscribedAt}) => ({title: email, subtitle: unsubscribedAt ? 'unsubscribed' : signedUpAt ? new Date(signedUpAt).toLocaleDateString('nb-NO') : ''}),
  },
})
