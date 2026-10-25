import {EnvelopeIcon} from '../../icons'
import {defineField, defineType} from 'sanity'

/**
 * One campaign email, built block by block in the admin's drag-and-drop editor and sent to every
 * subscriber in their language. The blocks are stored as JSON; the Studio shows this for reference.
 */
export const newsletter = defineType({
  name: 'newsletter',
  title: 'Newsletter',
  type: 'document',
  icon: EnvelopeIcon,
  fields: [
    defineField({name: 'title', title: 'Title (for the list)', type: 'string', readOnly: true}),
    defineField({name: 'subjectEn', title: 'Subject line, English', type: 'string'}),
    defineField({name: 'subjectNo', title: 'Subject line, Norsk', type: 'string'}),
    defineField({name: 'blocks', title: 'Blocks (JSON, edited in the admin)', type: 'text', rows: 12, readOnly: true}),
    defineField({name: 'status', title: 'Status', type: 'string', options: {list: ['draft', 'sent']}, initialValue: 'draft', readOnly: true}),
    defineField({name: 'testSentAt', title: 'Last test sent', type: 'datetime', readOnly: true}),
    defineField({name: 'sentAt', title: 'Sent', type: 'datetime', readOnly: true}),
    defineField({name: 'sentCount', title: 'Recipients', type: 'number', readOnly: true}),
  ],
  preview: {
    select: {title: 'title', subject: 'subjectEn', status: 'status', sentAt: 'sentAt'},
    prepare: ({title, subject, status, sentAt}) => ({title: title || subject || 'Newsletter', subtitle: status === 'sent' && sentAt ? `sent ${new Date(sentAt).toLocaleDateString('nb-NO')}` : 'draft'}),
  },
})
