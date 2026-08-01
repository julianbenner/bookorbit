import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'

import { NotificationType, type NotificationItem } from '@bookorbit/types'
import en from '@/locales/en.json'
import NotificationItemVue from './NotificationItem.vue'

function notification(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: 1,
    type: NotificationType.BookRequestSubmitted,
    title: 'New book request',
    message: 'Reader requested "Dune"',
    actionUrl: '/requests',
    meta: { requestId: 42 },
    read: false,
    count: 1,
    createdAt: '2026-08-21T00:00:00.000Z',
    updatedAt: '2026-08-21T00:00:00.000Z',
    ...overrides,
  }
}

async function mountItem(item: NotificationItem) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/requests', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  await router.isReady()
  const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages: { en } })

  const wrapper = mount(NotificationItemVue, {
    props: { notification: item },
    global: { plugins: [router, i18n] },
  })

  return { router, wrapper }
}

describe('NotificationItem', () => {
  it('renders a persisted notification type that is no longer in the registry', async () => {
    const { wrapper } = await mountItem(
      notification({
        type: 'legacy_notification_type' as NotificationItem['type'],
        title: 'Legacy notification',
        message: null,
        actionUrl: null,
        meta: null,
      }),
    )

    expect(wrapper.text()).toContain('Legacy notification')
  })

  /**
   * The stored URL verbatim, query and all. The tab used to be re-derived here from the type,
   * which was a second copy of a decision the server had already made and sent.
   */
  it('links an internal action URL, including its query', async () => {
    const { wrapper } = await mountItem(notification({ actionUrl: '/requests?tab=all' }))

    expect(wrapper.get('a').attributes('href')).toBe('/requests?tab=all')
  })

  it.each(['https://example.com/report', '//example.com/report'])('opens an external action URL %s in a new tab', async (actionUrl) => {
    const { wrapper } = await mountItem(notification({ actionUrl }))
    const anchor = wrapper.get('a')

    expect(anchor.attributes('href')).toBe(actionUrl)
    expect(anchor.attributes('target')).toBe('_blank')
    expect(anchor.attributes('rel')).toBe('noopener noreferrer')
  })

  it('marks an unread notification as read when its action is opened', async () => {
    const { wrapper } = await mountItem(notification())

    await wrapper.get('a').trigger('click')

    expect(wrapper.emitted('read')).toEqual([[1]])
  })

  it('does not re-emit read for a notification that is already read', async () => {
    const { wrapper } = await mountItem(notification({ read: true }))

    await wrapper.get('a').trigger('click')

    expect(wrapper.emitted('read')).toBeUndefined()
  })

  it.each([{ button: 1 }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }])(
    'leaves an unread notification and the source page unchanged for a modified click %j',
    async (modifiers) => {
      const { router, wrapper } = await mountItem(notification())

      await wrapper.get('a').trigger('click', modifiers)

      expect(wrapper.emitted('read')).toBeUndefined()
      expect(router.currentRoute.value.fullPath).toBe('/')
      expect(wrapper.find('a').exists()).toBe(true)
    },
  )

  it.each([
    [NotificationType.BookRequestSubmitted, 'text-success'],
    [NotificationType.BookRequestRejected, 'text-warning'],
    [NotificationType.BookRequestFailed, 'text-destructive'],
  ])('renders %s with the request icon and its registered severity', async (type, severityClass) => {
    const { wrapper } = await mountItem(notification({ type }))

    expect(wrapper.find('.lucide-book-plus').exists()).toBe(true)
    expect(wrapper.find('.lucide-book-plus').classes()).toContain(severityClass)
  })

  it('exposes separate controls for opening and dismissing the notification', async () => {
    const { wrapper } = await mountItem(notification())
    const dismiss = wrapper.get('button[aria-label="Dismiss notification"]')

    expect(wrapper.findAll('button')).toHaveLength(1)
    expect(wrapper.get('a').element.contains(dismiss.element)).toBe(false)

    await dismiss.trigger('click')

    expect(wrapper.emitted('dismiss')).toEqual([[1]])
    expect(wrapper.emitted('read')).toBeUndefined()
  })

  /** Without a URL there is nothing to link to, so the row stays a button. */
  it('renders a button when the notification has no action URL', async () => {
    const { wrapper } = await mountItem(notification({ actionUrl: null }))

    expect(wrapper.findAll('a')).toHaveLength(0)
    expect(wrapper.findAll('button')[0].text()).toContain('New book request')

    await wrapper.findAll('button')[0]!.trigger('click', { ctrlKey: true })
    expect(wrapper.emitted('read')).toEqual([[1]])
  })
})
