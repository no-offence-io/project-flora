import {defineField, defineType} from 'sanity'

/** A phone that asked for dashboard notifications. Written by the server only. */
export const pushSubscription = defineType({
  name: 'pushSubscription',
  title: 'Push subscription',
  type: 'document',
  readOnly: true,
  fields: [
    defineField({name: 'endpoint', type: 'url'}),
    defineField({name: 'keys', type: 'object', fields: [defineField({name: 'p256dh', type: 'string'}), defineField({name: 'auth', type: 'string'})]}),
    defineField({name: 'adminEmail', type: 'string'}),
    defineField({name: 'device', type: 'string'}),
    defineField({name: 'createdAt', type: 'datetime'}),
  ],
  preview: {select: {title: 'adminEmail', subtitle: 'device'}},
})
