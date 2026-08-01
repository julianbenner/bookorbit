import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, type Ref } from 'vue'
import { createMemoryHistory, createRouter, RouterLink } from 'vue-router'

import { useRouteTab } from '../useRouteTab'

type Tab = 'search' | 'mine' | 'all'

const ALL_TABS: readonly Tab[] = ['search', 'mine', 'all']

function normalize(value: unknown): Tab {
  return typeof value === 'string' && (ALL_TABS as readonly string[]).includes(value) ? (value as Tab) : 'search'
}

async function mountTab(options: { routeName?: string; available?: Ref<readonly Tab[]>; start?: string } = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/requests',
        name: 'requests',
        component: { template: '<div><router-view /></div>' },
        children: [{ path: ':id', name: 'request-detail', component: { template: '<div />' } }],
      },
    ],
  })
  await router.push(options.start ?? '/requests')
  await router.isReady()

  const availableTabs = options.available ?? ref(ALL_TABS)
  let api!: ReturnType<typeof useRouteTab<Tab>>

  const wrapper = mount(
    defineComponent({
      setup() {
        api = useRouteTab<Tab>({ routeName: options.routeName, normalize, availableTabs, fallback: 'search' })
        return () => h(RouterLink, { to: api.tabTarget('mine'), replace: true }, () => 'Mine')
      },
    }),
    { global: { plugins: [router] } },
  )

  await nextTick()
  return { router, wrapper, availableTabs, api: api as ReturnType<typeof useRouteTab<Tab>> }
}

async function settle() {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

describe('useRouteTab', () => {
  it('adopts the tab from later navigation', async () => {
    const { router, api } = await mountTab()
    expect(api.activeTab.value).toBe('search')

    await router.push('/requests?tab=all')
    await settle()

    expect(api.activeTab.value).toBe('all')
  })

  it('falls back when the named tab is unavailable', async () => {
    const available = ref<readonly Tab[]>(['search', 'mine'])
    const { router, api } = await mountTab({ available })

    await router.push('/requests?tab=all')
    await settle()

    expect(api.activeTab.value).toBe('search')
  })

  it('re-resolves when a tab stops being available', async () => {
    const available = ref<readonly Tab[]>(ALL_TABS)
    const { api } = await mountTab({ available, start: '/requests?tab=all' })
    expect(api.activeTab.value).toBe('all')

    available.value = ['search', 'mine']
    await settle()

    expect(api.activeTab.value).toBe('search')
  })

  it('keeps the current child route when no route name is given', async () => {
    const { router, api } = await mountTab({ start: '/requests/34' })

    api.selectTab('mine')
    await settle()

    expect(router.currentRoute.value.name).toBe('request-detail')
    expect(router.currentRoute.value.params.id).toBe('34')
    expect(router.currentRoute.value.query.tab).toBe('mine')
  })

  it('returns to the named route when one is given', async () => {
    const { router, api } = await mountTab({ routeName: 'requests', start: '/requests/34' })

    api.selectTab('mine')
    await settle()

    expect(router.currentRoute.value.name).toBe('requests')
  })

  it('keeps the child route, unrelated query and fragment when following a tab link', async () => {
    const { router, wrapper, api } = await mountTab({ start: '/requests/34?tab=search&filter=ready#queue' })
    await settle()
    const link = wrapper.get('a')

    await link.trigger('auxclick', { button: 1 })
    for (const modifiers of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }]) {
      await link.trigger('click', modifiers)
    }
    await settle()
    expect(api.activeTab.value).toBe('search')
    expect(router.currentRoute.value.fullPath).toBe('/requests/34?tab=search&filter=ready#queue')

    await link.trigger('click')
    await settle()
    expect(api.activeTab.value).toBe('mine')
    expect(router.currentRoute.value.fullPath).toBe('/requests/34?tab=mine&filter=ready#queue')
  })

  it('keeps the query and fragment when following a tab link to the named route', async () => {
    const { router, wrapper, api } = await mountTab({ routeName: 'requests', start: '/requests/34?tab=search&filter=ready#queue' })
    await settle()

    await wrapper.get('a').trigger('click')
    await settle()

    expect(api.activeTab.value).toBe('mine')
    expect(router.currentRoute.value.fullPath).toBe('/requests?tab=mine&filter=ready#queue')
  })
})
