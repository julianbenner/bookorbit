import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import type { BookDetail } from '@bookorbit/types'
import BookQuickView from '../BookQuickView.vue'

const displaySettings = {
  bookCoverDisplayMode: ref('blurred-fit'),
}

const permissionState = {
  canDelete: true,
  canEditMetadata: true,
}

const fetchMock = vi.fn<(bookId: number) => void>()

const detailRef = ref<BookDetail | null>(null)
const loadingRef = ref(false)
let router: Router

vi.mock('@/features/auth/composables/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: (name: string) => {
      if (name === 'library_delete_books') return permissionState.canDelete
      if (name === 'library_edit_metadata') return permissionState.canEditMetadata
      return true
    },
  }),
}))

vi.mock('@/features/book/composables/useBookDetail', () => ({
  useBookDetail: () => ({
    detail: detailRef,
    loading: loadingRef,
    fetch: fetchMock,
  }),
}))

vi.mock('@/features/book/composables/useCoverVersions', () => ({
  useCoverVersions: () => ({
    coverUrl: () => '/cover.jpg',
  }),
}))

vi.mock('@/features/book/composables/useSafeHtml', () => ({
  useSafeHtml: () => '',
}))

vi.mock('@/composables/useDisplaySettings', () => ({
  useDisplaySettings: () => displaySettings,
}))

function makeDetail(overrides: Partial<BookDetail> = {}): BookDetail {
  return {
    id: 42,
    libraryId: 1,
    libraryName: 'Library',
    status: 'present',
    folderPath: '/books',
    addedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: null,
    title: 'Quick View Book',
    subtitle: null,
    description: null,
    isbn10: null,
    isbn13: null,
    publisher: null,
    publishedDate: null,
    publishedYear: null,
    language: null,
    pageCount: null,
    seriesName: null,
    seriesIndex: null,
    rating: null,
    personalNote: null,
    personalNoteUpdatedAt: null,
    communityRatings: [],
    coverSource: null,
    coverMedia: [],
    covers: { ebook: null, audio: null },
    coverVersion: 'legacy:2026-01-01T00:00:00.000Z',
    hardcoverEditionId: null,
    providerIds: {},
    authors: [],
    genres: [],
    tags: [],
    files: [
      {
        id: 11,
        role: 'primary',
        format: 'EPUB',
        filename: 'book.epub',
        sizeBytes: 1024,
        absolutePath: '/books/book.epub',
        createdAt: '2026-01-01T00:00:00.000Z',
        durationSeconds: null,
      },
    ],
    lastWrittenAt: null,
    metadataScore: null,
    readStatus: null,
    audioMetadata: null,
    readAloudSync: {
      mode: 'auto',
      state: 'unavailable',
      unavailableReason: 'no_media_overlay_epub',
      overlayFileId: null,
      audioDurationSeconds: null,
      overlayDurationSeconds: null,
      durationDifferenceSeconds: null,
      durationDifferenceRatio: null,
      koreaderDownloadAvailable: false,
    },
    formatPriority: [],
    comicMetadata: null,
    customMetadata: [],
    lockedFields: [],
    collections: [],
    ...overrides,
  }
}

const globalStubs = {
  get plugins() {
    return [router]
  },
  stubs: {
    Sheet: { template: '<div><slot /></div>' },
    SheetContent: { template: '<div><slot /></div>' },
    SheetTitle: { template: '<div><slot /></div>' },
    SheetDescription: { template: '<div><slot /></div>' },
    TooltipProvider: { template: '<div><slot /></div>' },
    Tooltip: { template: '<div><slot /></div>' },
    TooltipTrigger: { template: '<div><slot /></div>' },
    TooltipContent: { template: '<div><slot /></div>' },
    DialogRoot: { template: '<div><slot /></div>' },
    DialogPortal: { template: '<div><slot /></div>' },
    DialogOverlay: { template: '<div />' },
    DialogContent: { template: '<div><slot /></div>' },
    DialogTitle: { template: '<div><slot /></div>' },
    DialogDescription: { template: '<div><slot /></div>' },
    DialogClose: { template: '<button><slot /></button>' },
    BookCoverPlaceholder: { template: '<div />' },
    Skeleton: { template: '<div />' },
  },
}

describe('BookQuickView', () => {
  beforeEach(async () => {
    permissionState.canDelete = true
    permissionState.canEditMetadata = true
    fetchMock.mockReset()
    loadingRef.value = false
    displaySettings.bookCoverDisplayMode.value = 'blurred-fit'
    detailRef.value = makeDetail()
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/book/:bookId', name: 'book-detail', component: { template: '<div />' } },
        { path: '/read/:bookId/:fileId', name: 'reader', component: { template: '<div />' } },
      ],
    })
    await router.push('/')
  })

  it('fetches detail when mounted with a book id', () => {
    mount(BookQuickView, {
      props: {
        open: true,
        bookId: 42,
      },
      global: globalStubs,
    })

    expect(fetchMock).toHaveBeenCalledWith(42)
  })

  it('emits close and add-to-collection action from the add button', async () => {
    const wrapper = mount(BookQuickView, {
      props: {
        open: true,
        bookId: 42,
      },
      global: globalStubs,
    })

    await wrapper.get('[data-testid="quick-view-action-add-to-collection"]').trigger('click')

    expect(wrapper.emitted('update:open')).toEqual([[false]])
    expect(wrapper.emitted('action')).toEqual([['add-to-collection']])
  })

  it('emits close and delete action from the delete button', async () => {
    const wrapper = mount(BookQuickView, {
      props: {
        open: true,
        bookId: 42,
      },
      global: globalStubs,
    })

    await wrapper.get('[data-testid="quick-view-action-delete"]').trigger('click')

    expect(wrapper.emitted('update:open')).toEqual([[false]])
    expect(wrapper.emitted('action')).toEqual([['delete']])
  })
  it.each(['/read/42/11?format=EPUB', '/book/42', '/book/42?tab=edit', '/read/42/11?format=EPUB&mode=peek'])(
    'navigates and dismisses quick view on plain activation of %s',
    async (href) => {
      const wrapper = mount(BookQuickView, {
        props: { open: true, bookId: 42 },
        global: globalStubs,
      })
      const link = wrapper.get(`a[href="${href}"]`)

      await link.trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.fullPath).toBe(href)
      expect(wrapper.emitted('update:open')).toEqual([[false]])
      expect(link.element.querySelector('a, button')).toBeNull()
    },
  )

  it.each([{ button: 1 }, { button: 0, ctrlKey: true }, { button: 0, metaKey: true }, { button: 0, shiftKey: true }, { button: 0, altKey: true }])(
    'keeps quick view open and allows the browser to follow modified links (%o)',
    async (options) => {
      const wrapper = mount(BookQuickView, {
        props: { open: true, bookId: 42 },
        global: globalStubs,
      })

      for (const href of ['/read/42/11?format=EPUB', '/book/42', '/book/42?tab=edit', '/read/42/11?format=EPUB&mode=peek']) {
        const event = new MouseEvent('click', { ...options, bubbles: true, cancelable: true })
        wrapper.get(`a[href="${href}"]`).element.dispatchEvent(event)
        await flushPromises()

        expect(event.defaultPrevented).toBe(false)
        expect(router.currentRoute.value.fullPath).toBe('/')
        expect(wrapper.emitted('update:open')).toBeUndefined()
      }
    },
  )

  it('disables reader and peek when there is no openable file', () => {
    detailRef.value = makeDetail({ files: [] })
    const wrapper = mount(BookQuickView, {
      props: { open: true, bookId: 42 },
      global: globalStubs,
    })

    expect(wrapper.find('a[href^="/read/"]').exists()).toBe(false)
    expect(wrapper.get('button[aria-label="Read"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('button[aria-label="Peek"]').attributes('disabled')).toBeDefined()
  })

  it('hides delete action when delete permission is missing', () => {
    permissionState.canDelete = false

    const wrapper = mount(BookQuickView, {
      props: {
        open: true,
        bookId: 42,
      },
      global: globalStubs,
    })

    expect(wrapper.find('[data-testid="quick-view-action-delete"]').exists()).toBe(false)
  })

  it('renders RanobeDB provider icon link', () => {
    detailRef.value = makeDetail({
      providerIds: {
        ranobedb: '1287',
      },
    })

    const wrapper = mount(BookQuickView, {
      props: {
        open: true,
        bookId: 42,
      },
      global: globalStubs,
    })

    const ranobedbLink = wrapper.find('a[title="Open in RanobeDB"]')
    expect(ranobedbLink.exists()).toBe(true)
    expect(ranobedbLink.attributes('href')).toBe('https://ranobedb.org/book/1287')
    expect(ranobedbLink.find('img[alt="RanobeDB"][src="/assets/provider-icons/ranobedb.svg"]').exists()).toBe(true)
  })

  it('renders a direct ComicVine issue link with the monogram fallback', () => {
    detailRef.value = makeDetail({ providerIds: { comicvine: '1126983' } })

    const wrapper = mount(BookQuickView, {
      props: { open: true, bookId: 42 },
      global: globalStubs,
    })

    const comicVineLink = wrapper.find('a[title="Open in ComicVine"]')
    expect(comicVineLink.exists()).toBe(true)
    expect(comicVineLink.attributes()).toMatchObject({
      href: 'https://comicvine.gamespot.com/issue/4000-1126983/',
      target: '_blank',
      rel: 'noopener noreferrer',
    })
    expect(comicVineLink.find('img').exists()).toBe(false)
    expect(comicVineLink.text()).toBe('CV')
  })

  it('renders Libro.fm provider icon link', () => {
    detailRef.value = makeDetail({ providerIds: { librofm: '9781234567890' } })

    const wrapper = mount(BookQuickView, {
      props: { open: true, bookId: 42 },
      global: globalStubs,
    })

    const libroFmLink = wrapper.find('a[title="Open in Libro.fm"]')
    expect(libroFmLink.exists()).toBe(true)
    expect(libroFmLink.attributes('href')).toBe('https://libro.fm/audiobooks/9781234567890')
    expect(libroFmLink.find('img[alt="Libro.fm"][src="/assets/provider-icons/librofm.svg"]').exists()).toBe(true)
  })

  it('shrinks natural-bottom quick-view cover to the loaded cover ratio', async () => {
    displaySettings.bookCoverDisplayMode.value = 'natural-bottom'
    detailRef.value = makeDetail({ coverSource: 'extracted' })

    const wrapper = mount(BookQuickView, {
      props: {
        open: true,
        bookId: 42,
      },
      global: globalStubs,
    })
    const image = wrapper.get('img[alt="Quick View Book"]')
    Object.defineProperty(image.element, 'naturalWidth', { configurable: true, value: 1200 })
    Object.defineProperty(image.element, 'naturalHeight', { configurable: true, value: 600 })

    await image.trigger('load')

    const surface = wrapper.get('.book-cover-surface')
    expect(surface.attributes('style')).toContain('aspect-ratio: 2 / 1')
  })
})
