import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import BookDetailTabs from './BookDetailTabs.vue'

const permissions = { canEdit: true }

vi.mock('@/features/auth/composables/usePermissions', () => ({
  usePermissions: () => ({ hasPermission: () => permissions.canEdit }),
}))

async function mountTabs() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/book/:bookId', name: 'book-detail', component: { template: '<div />' } }],
  })
  await router.push({
    name: 'book-detail',
    params: { bookId: 42 },
    query: { tab: 'files', from: '/authors?q=Amy&page=2' },
    hash: '#top',
  })
  const wrapper = mount(BookDetailTabs, { props: { bookId: 42 }, global: { plugins: [router] } })
  return { wrapper, router }
}

beforeEach(() => {
  permissions.canEdit = true
})

describe('book detail tab navigation', () => {
  it('changes only the tab while preserving the return route and fragment', async () => {
    const { wrapper, router } = await mountTabs()
    expect(wrapper.findAll('a[aria-current="page"]')).toHaveLength(1)
    expect(wrapper.get('a[aria-current="page"]').attributes('href')).toContain('tab=files')

    await wrapper.get('a[href*="tab=reading-log"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.params.bookId).toBe('42')
    expect(router.currentRoute.value.query).toEqual({ tab: 'reading-log', from: '/authors?q=Amy&page=2' })
    expect(router.currentRoute.value.hash).toBe('#top')
    expect(wrapper.findAll('a[aria-current="page"]')).toHaveLength(1)
    expect(wrapper.get('a[aria-current="page"]').attributes('href')).toContain('tab=reading-log')
  })

  it.each([{ button: 1 }, { button: 0, ctrlKey: true }, { button: 0, metaKey: true }, { button: 0, shiftKey: true }, { button: 0, altKey: true }])(
    'keeps the current tab and permits native modified activation (%o)',
    async (options) => {
      const { wrapper, router } = await mountTabs()
      const link = wrapper.get('a[href*="tab=reading-log"]')
      const event = new MouseEvent('click', { ...options, bubbles: true, cancelable: true })

      link.element.dispatchEvent(event)
      await flushPromises()

      expect(event.defaultPrevented).toBe(false)
      expect(router.currentRoute.value.query.tab).toBe('files')
      expect(link.attributes('href')).toContain('from=/authors?q=Amy%26page=2')
      expect(link.attributes('href')).toContain('#top')
    },
  )

  it('does not offer the metadata editor without permission', async () => {
    permissions.canEdit = false
    const { wrapper } = await mountTabs()

    expect(wrapper.find('a[href*="tab=edit"]').exists()).toBe(false)
    expect(wrapper.findAll('a')).toHaveLength(4)
  })
})
