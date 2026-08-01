import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import RequestsSettings from '../RequestsSettings.vue'

/** The panels fetch on mount; this page is only about which one of them is on screen. */
const stubs = {
  RequestIndexersPanel: { template: '<div>sources panel</div>' },
  DownloadClientsPanel: { template: '<div>clients panel</div>' },
  RequestAutomationPanel: { template: '<div>automation panel</div>' },
}

async function mountPage(query = 'sources') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/settings/admin/requests', name: 'settings-admin-requests', component: { template: '<div />' } }],
  })
  await router.push(`/settings/admin/requests?tab=${query}&filter=ready#encryption`)
  await router.isReady()
  const wrapper = mount(RequestsSettings, { props: { embedded: true }, global: { plugins: [router], stubs } })
  await flushPromises()
  return { router, wrapper }
}

describe('RequestsSettings', () => {
  it('loads only the selected panel and preserves the other URL state when switching tabs', async () => {
    const { router, wrapper } = await mountPage('automation')
    expect(wrapper.text()).toContain('automation panel')
    expect(wrapper.text()).not.toContain('sources panel')
    expect(wrapper.text()).not.toContain('clients panel')

    const clients = wrapper.findAll('a').find((link) => link.text() === 'Download clients')!
    await clients.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('clients panel')
    expect(wrapper.text()).not.toContain('automation panel')
    expect(router.currentRoute.value.query).toEqual({ tab: 'clients', filter: 'ready' })
    expect(router.currentRoute.value.hash).toBe('#encryption')
  })

  it('keeps the current panel when a tab is opened with a modified click', async () => {
    const { router, wrapper } = await mountPage('automation')
    const sources = wrapper.findAll('a').find((link) => link.text() === 'Sources')!

    await sources.trigger('auxclick', { button: 1 })
    for (const modifiers of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }]) {
      await sources.trigger('click', modifiers)
    }
    await flushPromises()

    expect(wrapper.text()).toContain('automation panel')
    expect(wrapper.text()).not.toContain('sources panel')
    expect(router.currentRoute.value.query.tab).toBe('automation')
  })

  it('normalizes an unknown tab without losing the query or fragment', async () => {
    const { router, wrapper } = await mountPage('nonsense')

    expect(wrapper.text()).toContain('sources panel')
    expect(router.currentRoute.value.query).toEqual({ tab: 'sources', filter: 'ready' })
    expect(router.currentRoute.value.hash).toBe('#encryption')
  })
})
