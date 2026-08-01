import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { computed, ref } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import type { BookCard } from '@bookorbit/types'
import type { PaletteSection } from '../../composables/useCommandPaletteResults'
import { useCommandPalette } from '../../composables/useCommandPalette'
import CommandPalette from '../CommandPalette.vue'

enableAutoUnmount(afterEach)

const mocks = vi.hoisted(() => ({ runAction: vi.fn<() => void>() }))

vi.mock('reka-ui', () => ({
  DialogRoot: { props: ['open'], template: '<div v-if="open"><slot /></div>' },
  DialogPortal: { template: '<div><slot /></div>' },
  DialogOverlay: { template: '<div />' },
  DialogContent: { template: '<section><slot /></section>' },
  DialogTitle: { template: '<h2><slot /></h2>' },
  DialogDescription: { template: '<p><slot /></p>' },
}))

vi.mock('../../composables/useCommandPaletteResults', () => ({
  useCommandPaletteResults: () => {
    const sections = computed<PaletteSection[]>(() => [
      {
        id: 'books',
        label: 'Books',
        items: [{ kind: 'book', key: 'book:101', book: { id: 101, title: 'Prey', authors: ['Author'], files: [] } as unknown as BookCard }],
      },
      { id: 'actions', label: 'Actions', items: [{ kind: 'action', key: 'action:test', label: 'Run action', icon: {}, run: mocks.runAction }] },
    ])
    return {
      sections,
      tabs: computed(() => []),
      isSearching: ref(true),
      loading: ref(false),
      settled: ref(true),
      hasMoreBooks: ref(false),
      loadingMoreBooks: ref(false),
      loadMoreBooks: vi.fn<() => Promise<void>>(),
      clear: vi.fn<() => void>(),
    }
  },
}))

let router: Router

function mountPalette() {
  return mount(CommandPalette, {
    global: {
      plugins: [router],
      stubs: { BookCoverImage: true, BookFormatChip: true, AuthorPortrait: true, AppIcon: true, BookUploadModal: true },
    },
  })
}

describe('CommandPalette result links', () => {
  beforeEach(async () => {
    const view = { template: '<div />' }
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'dashboard', component: view },
        { path: '/book/:bookId', name: 'book-detail', component: view },
      ],
    })
    await router.push('/')
    await router.isReady()
    mocks.runAction.mockReset()
    useCommandPalette().openPalette()
  })

  it('renders a book result as a link to its details', () => {
    const wrapper = mountPalette()

    expect(wrapper.get('a[role="option"]').attributes('href')).toBe('/book/101')
  })

  it.each([{ button: 1 }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }])(
    'keeps the palette and the source page for a modified result click %j',
    async (modifiers) => {
      const wrapper = mountPalette()

      await wrapper.get('a[role="option"]').trigger('click', modifiers)
      await flushPromises()

      expect(useCommandPalette().isOpen.value).toBe(true)
      expect(router.currentRoute.value.name).toBe('dashboard')
    },
  )

  it('opens a result and closes the palette for a plain primary click', async () => {
    const wrapper = mountPalette()

    await wrapper.get('a[role="option"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/book/101')
    expect(useCommandPalette().isOpen.value).toBe(false)
  })

  it('keeps actions as palette rows that run on click', async () => {
    const wrapper = mountPalette()
    const action = wrapper.findAll('[role="option"]').find((row) => row.text().includes('Run action'))

    expect(action?.element.tagName).toBe('DIV')
    await action?.trigger('click')

    expect(mocks.runAction).toHaveBeenCalledTimes(1)
    expect(useCommandPalette().isOpen.value).toBe(false)
  })
})
