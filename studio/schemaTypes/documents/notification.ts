import {BellIcon} from '../../icons'
import {defineField, defineType} from 'sanity'

/** Something the owner should know: written by the site itself (a failed email, a webhook error, an update), never by hand. */
export const notification = defineType({
  name: 'notification',
  title: 'Notification',
  type: 'document',
  icon: BellIcon,
  fields: [
    defineField({name: 'demo', title: 'Test-mode data', type: 'boolean', readOnly: true, hidden: true}),
    defineField({name: 'kind', title: 'Kind', type: 'string', options: {list: ['error', 'warning', 'info']}, readOnly: true}),
    defineField({name: 'title', title: 'Title', type: 'string', readOnly: true}),
    defineField({name: 'detail', title: 'Detail', type: 'text', rows: 3, readOnly: true}),
    defineField({name: 'source', title: 'Source', type: 'string', readOnly: true}),
    defineField({name: 'href', title: 'Link', type: 'string', readOnly: true}),
    defineField({name: 'createdAt', title: 'When', type: 'datetime', readOnly: true}),
    defineField({name: 'readAt', title: 'Read', type: 'datetime'}),
  ],
  preview: {
    select: {title: 'title', kind: 'kind', createdAt: 'createdAt', readAt: 'readAt'},
    prepare: ({title, kind, createdAt, readAt}) => ({title: `${kind === 'error' ? '⚠ ' : ''}${title}`, subtitle: `${createdAt ? new Date(createdAt).toLocaleString('nb-NO') : ''}${readAt ? '' : ' · unread'}`}),
  },
})
