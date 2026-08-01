import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'

import AccountActivityPage from '../AccountActivityPage.vue'

const apiMock = vi.fn<(input: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>>()

vi.mock('@/lib/api', () => ({ api: (input: string) => apiMock(input) }))

const componentStubs = {
  Button: { props: ['variant'], template: '<button :data-variant="variant"><slot /></button>' },
  RouterLink: false,
}

let router: Router

function mountPage() {
  return shallowMount(AccountActivityPage, { global: { plugins: [router], stubs: componentStubs } })
}

describe('AccountActivityPage', () => {
  beforeEach(async () => {
    const view = { template: '<div />' }
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/settings/admin/account-activity', name: 'settings-admin-account-activity', component: view },
        { path: '/settings/admin/account-activity/:userId/insights', name: 'settings-admin-shared-insights', component: view },
      ],
    })
    await router.push('/settings/admin/account-activity')
    await router.isReady()
    vi.clearAllMocks()
    apiMock.mockImplementation(async (input: string) => {
      if (input === '/api/v1/account-activity/summary') {
        return { ok: true, json: async () => ({ recent: 1, dormant: 2, never: 3, disabled: 4 }) }
      }
      if (input.startsWith('/api/v1/account-activity?')) {
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                id: 1,
                username: 'reader',
                name: 'Reader',
                active: true,
                isSuperuser: false,
                provisioningMethod: 'local',
                createdAt: '2026-01-01T00:00:00.000Z',
                lastLoginAt: null,
                lastAuthenticatedAt: null,
                state: 'never',
                readingInsightsSharingLevel: 'private',
              },
              {
                id: 2,
                username: 'maya',
                name: 'Maya',
                active: true,
                isSuperuser: false,
                provisioningMethod: 'oidc',
                createdAt: '2025-01-01T00:00:00.000Z',
                lastLoginAt: '2026-07-01T00:00:00.000Z',
                lastAuthenticatedAt: '2026-07-02T00:00:00.000Z',
                state: 'recent',
                readingInsightsSharingLevel: 'detailed',
              },
            ],
            total: 2,
            page: 1,
            pageSize: 50,
          }),
        }
      }
      return { ok: false, json: async () => ({}) }
    })
  })

  it('renders account activity without duplicating the settings page header', async () => {
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.find('h2').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Review account authentication activity without exposing reading history.')
    expect(wrapper.text()).toContain('Reader')
    expect(wrapper.text()).toContain('No recorded activity')
    expect(wrapper.text()).not.toContain('Details')
    const insightsLink = wrapper.find('a[aria-label="Open shared reading insights for Maya"]')
    expect(insightsLink.exists()).toBe(true)
    expect(wrapper.find('table').classes()).toContain('table-fixed')
  })

  it('opens shared insights without moving the activity page for modified clicks', async () => {
    const wrapper = mountPage()
    await flushPromises()
    const link = wrapper.get('a[aria-label="Open shared reading insights for Maya"]')

    await link.trigger('click', { ctrlKey: true })
    await link.trigger('click', { metaKey: true })
    await link.trigger('auxclick', { button: 1 })
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('settings-admin-account-activity')
    expect(wrapper.text()).toContain('Maya')

    await link.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/settings/admin/account-activity/2/insights')
  })

  it('renders a localized empty state', async () => {
    apiMock.mockImplementation(async (input: string) => ({
      ok: true,
      json: async () =>
        input === '/api/v1/account-activity/summary'
          ? { recent: 0, dormant: 0, never: 0, disabled: 0 }
          : { items: [], total: 0, page: 1, pageSize: 50 },
    }))

    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('No accounts found')
  })
})
