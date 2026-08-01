import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { NotificationItem as NotificationItemType } from '@bookorbit/types'
import NotificationItem from '../NotificationItem.vue'

vi.mock('vue-router', () => ({
  RouterLink: { name: 'RouterLink', props: ['to'], template: '<a><slot /></a>' },
}))

vi.mock('../../composables/useNotifications', () => ({
  useNotifications: () => ({ formatRelativeTime: () => '2m ago' }),
}))

function mountItem(overrides: Partial<NotificationItemType> = {}) {
  const notification = {
    id: 7,
    type: 'scan_completed',
    title: 'Scan completed',
    message: 'Added 3 books',
    actionUrl: null,
    read: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  } as NotificationItemType

  return mount(NotificationItem, { props: { notification } })
}

describe('NotificationItem', () => {
  it('renders an internal action url as a router link', () => {
    const wrapper = mountItem({ actionUrl: '/books/42' })
    const link = wrapper.findComponent({ name: 'RouterLink' })

    expect(link.exists()).toBe(true)
    expect(link.props('to')).toBe('/books/42')
  })

  it('renders an external action url as an anchor opening a new tab', () => {
    const wrapper = mountItem({ actionUrl: 'https://example.com/report' })
    const anchor = wrapper.get('a')

    expect(wrapper.findComponent({ name: 'RouterLink' }).exists()).toBe(false)
    expect(anchor.attributes('href')).toBe('https://example.com/report')
    expect(anchor.attributes('target')).toBe('_blank')
    expect(anchor.attributes('rel')).toBe('noopener noreferrer')
  })

  it('renders a plain button when there is no action url', () => {
    const wrapper = mountItem({ actionUrl: null })

    expect(wrapper.findAll('a')).toHaveLength(0)
    expect(wrapper.get('button[type="button"]').text()).toContain('Scan completed')
  })

  it.each([
    ['internal', '/books/42'],
    ['external', 'https://example.com/report'],
    ['no', null],
  ])('marks an unread notification as read when its %s action is clicked', async (_label, actionUrl) => {
    const wrapper = mountItem({ actionUrl })

    await wrapper.get('a, button[type="button"]').trigger('click')

    expect(wrapper.emitted('read')).toEqual([[7]])
  })

  it('does not re-emit read for an already read notification', async () => {
    const wrapper = mountItem({ actionUrl: '/books/42', read: true })

    await wrapper.get('a').trigger('click')

    expect(wrapper.emitted('read')).toBeUndefined()
  })

  it('emits dismiss without marking the notification as read', async () => {
    const wrapper = mountItem()
    const dismissButton = wrapper.findAll('button').at(-1)!

    await dismissButton.trigger('click')

    expect(wrapper.emitted('dismiss')).toEqual([[7]])
    expect(wrapper.emitted('read')).toBeUndefined()
  })
})
