import { nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import SettingsTabs from './SettingsTabs.vue'

const stubView = { template: '<div />' }

async function createTestRouter(): Promise<Router> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/settings/account', name: 'settings-account', component: stubView }],
  })
  await router.push('/settings/account')
  await router.isReady()
  return router
}

function tabTo(tab: string) {
  return { name: 'settings-account', query: { tab } }
}

describe('SettingsTabs', () => {
  it('reveals the active tab when it is outside the horizontal viewport', async () => {
    const router = await createTestRouter()
    const wrapper = mount(SettingsTabs, {
      props: {
        tabs: [
          { id: 'first', label: 'First' },
          { id: 'last', label: 'Last' },
        ],
        activeTab: 'first',
        tabTo,
      },
      global: { plugins: [router] },
    })
    const container = wrapper.get('nav').element as HTMLElement
    Object.defineProperties(container, {
      clientWidth: { configurable: true, value: 320 },
      scrollWidth: { configurable: true, value: 640 },
    })
    container.getBoundingClientRect = () => ({ left: 0, right: 320 }) as DOMRect

    const lastTab = wrapper.get('a:last-child').element as HTMLElement
    lastTab.getBoundingClientRect = () => ({ left: 520, right: 600 }) as DOMRect
    await wrapper.setProps({ activeTab: 'last' })
    await nextTick()

    expect(container.scrollLeft).toBe(520)
  })

  it('renders every tab as a navigable link and marks the active section as current', async () => {
    const router = await createTestRouter()
    const wrapper = mount(SettingsTabs, {
      props: {
        tabs: [
          { id: 'display', label: 'Display' },
          { id: 'account', label: 'Account' },
        ],
        activeTab: 'account',
        tabTo,
        variant: 'section',
      },
      global: { plugins: [router] },
    })

    expect(wrapper.get('[aria-current="page"]').text()).toBe('Account')

    const links = wrapper.findAll('a')
    expect(links.map((link) => link.attributes('href'))).toEqual(['/settings/account?tab=display', '/settings/account?tab=account'])
  })

  it.each([{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }])(
    'keeps the current tab when a link is opened with a modified click %j',
    async (modifiers) => {
      const router = await createTestRouter()
      const wrapper = mount(SettingsTabs, {
        props: {
          tabs: [
            { id: 'display', label: 'Display' },
            { id: 'account', label: 'Account' },
          ],
          activeTab: 'account',
          tabTo,
        },
        global: { plugins: [router] },
      })

      await wrapper.get('a').trigger('click', modifiers)
      await flushPromises()

      expect(router.currentRoute.value.fullPath).toBe('/settings/account')
      expect(wrapper.get('[aria-current="page"]').text()).toBe('Account')
    },
  )

  it('replaces the history entry instead of stacking one per tab', async () => {
    const router = await createTestRouter()
    const wrapper = mount(SettingsTabs, {
      props: {
        tabs: [
          { id: 'display', label: 'Display' },
          { id: 'account', label: 'Account' },
        ],
        activeTab: 'account',
        tabTo,
      },
      global: { plugins: [router] },
    })

    await wrapper.findAll('a')[0]!.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ tab: 'display' })

    router.go(-1)
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ tab: 'display' })
  })
})
