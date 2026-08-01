import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { nextTick, ref, type Ref } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import type { GlobalSearchResult } from '@/features/book/composables/useGlobalSearch'
import AppHeader from '../AppHeader.vue'

enableAutoUnmount(afterEach)

const mocks = vi.hoisted(() => ({
  results: null as unknown as Ref<GlobalSearchResult[]>,
  total: null as unknown as Ref<number>,
  loading: null as unknown as Ref<boolean>,
  loadingMore: null as unknown as Ref<boolean>,
  settled: null as unknown as Ref<boolean>,
  hasMore: null as unknown as Ref<boolean>,
  user: null as unknown as Ref<{ provisioningMethod: string; settings?: { achievementPreferences?: { enabled?: boolean } } }>,
  loadMore: vi.fn<() => Promise<void>>(),
  clearGlobalSearch: vi.fn<() => void>(),
}))

vi.mock('@/features/book/composables/useGlobalSearch', () => ({
  useGlobalSearch: () => ({
    results: mocks.results,
    total: mocks.total,
    loading: mocks.loading,
    loadingMore: mocks.loadingMore,
    settled: mocks.settled,
    hasMore: mocks.hasMore,
    loadMore: mocks.loadMore,
    clear: mocks.clearGlobalSearch,
  }),
}))

vi.mock('@/features/auth/composables/useAuth', async () => {
  return {
    useAuth: () => ({
      user: mocks.user,
      logout: vi.fn<() => void>(),
    }),
  }
})

vi.mock('@/composables/useChangePasswordDialog', () => ({
  useChangePasswordDialog: () => ({ open: vi.fn<() => void>() }),
}))

vi.mock('@/features/auth/composables/usePermissions', async () => {
  const { ref: vueRef } = await import('vue')
  return {
    usePermissions: () => ({
      hasPermission: () => false,
      isDemoRestrictedAccount: vueRef(false),
    }),
  }
})

vi.mock('@/features/library/composables/useLibraryUploadEvents', () => ({
  useLibraryUploadEvents: () => ({ onLibraryUploadCompleted: () => vi.fn<() => void>() }),
}))

vi.mock('@/features/notifications/composables/useNotifications', () => ({
  useNotifications: () => ({ subscribe: vi.fn<() => void>() }),
}))

vi.mock('@/features/whats-new/composables/useWhatsNew', async () => {
  const { ref: vueRef } = await import('vue')
  return {
    useWhatsNew: () => ({ hasUnseen: vueRef(false) }),
  }
})

vi.mock('@/stores/theme', () => ({
  useThemeStore: () => ({
    radius: 'rounded',
    resolvedTheme: 'light',
    glowReach: 100,
    appearanceControls: { surfacePalette: false, background: true, surfaceOpacity: true, brightness: true },
  }),
}))

vi.mock('@/stores/locale', () => ({
  useLocaleStore: () => ({ locale: 'en', setLocale: vi.fn<(...args: unknown[]) => Promise<void>>().mockResolvedValue(undefined) }),
  matchSupportedLocale: () => null,
}))

vi.mock('@/components/ui/sidebar', () => ({
  SidebarTrigger: { name: 'SidebarTrigger', template: '<button type="button"><slot /></button>' },
}))

vi.mock('@/components/ui/separator', () => ({
  Separator: { name: 'Separator', template: '<div><slot /></div>' },
}))

vi.mock('@/components/ui/popover', () => ({
  Popover: { name: 'Popover', template: '<div><slot /></div>' },
  PopoverContent: { name: 'PopoverContent', template: '<div><slot /></div>' },
  PopoverTrigger: { name: 'PopoverTrigger', template: '<div><slot /></div>' },
}))

vi.mock('@/components/ui/button', () => ({
  Button: { name: 'Button', template: '<button type="button"><slot /></button>' },
}))

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: { name: 'DropdownMenu', template: '<div><slot /></div>' },
  DropdownMenuContent: { name: 'DropdownMenuContent', template: '<div><slot /></div>' },
  DropdownMenuItem: { name: 'DropdownMenuItem', template: '<button type="button"><slot /></button>' },
  DropdownMenuLabel: { name: 'DropdownMenuLabel', template: '<div><slot /></div>' },
  DropdownMenuSeparator: { name: 'DropdownMenuSeparator', template: '<div />' },
  DropdownMenuTrigger: { name: 'DropdownMenuTrigger', template: '<div><slot /></div>' },
  DropdownMenuSub: { name: 'DropdownMenuSub', template: '<div><slot /></div>' },
  DropdownMenuSubContent: { name: 'DropdownMenuSubContent', template: '<div><slot /></div>' },
  DropdownMenuSubTrigger: { name: 'DropdownMenuSubTrigger', template: '<button type="button"><slot /></button>' },
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: { name: 'Tooltip', template: '<div><slot /></div>' },
  TooltipContent: { name: 'TooltipContent', template: '<div><slot /></div>' },
  TooltipTrigger: { name: 'TooltipTrigger', template: '<div><slot /></div>' },
}))

vi.mock('@/features/book/components/BookCoverImage.vue', () => ({
  default: { name: 'BookCoverImage', template: '<img alt="" />' },
}))

vi.mock('@/components/AccentPicker.vue', () => ({ default: { name: 'AccentPicker', template: '<div />' } }))
vi.mock('@/components/RadiusPicker.vue', () => ({ default: { name: 'RadiusPicker', template: '<div />' } }))
vi.mock('@/components/BackgroundPicker.vue', () => ({ default: { name: 'BackgroundPicker', template: '<div />' } }))
vi.mock('@/components/ThemePicker.vue', () => ({ default: { name: 'ThemePicker', template: '<div />' } }))
vi.mock('@/features/library/components/BookUploadModal.vue', () => ({ default: { name: 'BookUploadModal', template: '<div />' } }))
vi.mock('@/features/notifications/components/NotificationSheet.vue', () => ({ default: { name: 'NotificationSheet', template: '<div />' } }))
vi.mock('@/components/UserAvatar.vue', () => ({ default: { name: 'UserAvatar', template: '<div />' } }))

function makeResult(id: number, title = 'Prey'): GlobalSearchResult {
  return {
    id,
    status: 'present',
    coverAspectRatio: '2/3',
    title,
    authors: ['Author'],
    authorIds: [1],
    seriesId: null,
    seriesName: null,
    seriesIndex: null,
    files: [{ id: id * 10, format: 'epub', role: 'primary', sizeBytes: null }],
    publishedDate: null,
    publishedYear: null,
    language: null,
    genres: [],
    tags: [],
    rating: null,
    readingProgress: null,
    readStatus: null,
    addedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: null,
    coverVersion: 'legacy:2026-01-01T00:00:00.000Z',
    metadataScore: null,
    hasCover: false,
    hasMetadataLocks: false,
    lockedFields: [],
    subtitle: null,
    publisher: null,
    pageCount: null,
    isbn13: null,
    narrators: [],
    customMetadata: [],
  }
}

let router: Router

function mountHeader() {
  return mount(AppHeader, {
    global: {
      plugins: [router],
      stubs: {
        Transition: true,
      },
    },
  })
}

describe('AppHeader global search', () => {
  beforeEach(async () => {
    const view = { template: '<div />' }
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'dashboard', component: view },
        { path: '/book/:bookId', name: 'book-detail', component: view },
        { path: '/statistics', name: 'statistics', component: view },
        { path: '/achievements', name: 'achievements', component: view },
        { path: '/settings/account', name: 'settings-account', component: view },
        { path: '/settings/libraries', name: 'settings-libraries', component: view },
        { path: '/whats-new', name: 'whats-new', component: view },
      ],
    })
    await router.push('/')
    await router.isReady()
    mocks.loadMore.mockReset()
    mocks.loadMore.mockResolvedValue(undefined)
    mocks.clearGlobalSearch.mockReset()
    mocks.results = ref([makeResult(101), makeResult(102, 'Predator')])
    mocks.total = ref(42)
    mocks.loading = ref(false)
    mocks.loadingMore = ref(false)
    mocks.settled = ref(true)
    mocks.hasMore = ref(true)
    mocks.user = ref({ provisioningMethod: 'password', settings: {} })
  })

  it('does not leave the dropdown for a separate search route on Enter when no result is selected', async () => {
    const wrapper = mountHeader()
    const input = wrapper.get('input[placeholder="Search all books..."]')

    await input.trigger('focusin')
    await input.setValue('  Prey  ')
    await input.trigger('keydown', { key: 'Enter' })

    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('keeps Enter-to-open behavior when a result is selected', async () => {
    const wrapper = mountHeader()
    const input = wrapper.get('input[placeholder="Search all books..."]')

    await input.trigger('focusin')
    await input.setValue('Prey')
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'Enter' })

    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/book/101')
  })

  it.each([{ button: 1 }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }])(
    'keeps the search query and source page for a modified result click %j',
    async (modifiers) => {
      const wrapper = mountHeader()
      const input = wrapper.get('input[placeholder="Search all books..."]')
      await input.trigger('focusin')
      await input.setValue('Prey')
      const result = wrapper.get('[data-testid="global-search-dropdown"] a')

      await result.trigger('click', modifiers)
      await flushPromises()

      expect((input.element as HTMLInputElement).value).toBe('Prey')
      expect(wrapper.find('[data-testid="global-search-dropdown"]').exists()).toBe(true)
      expect(router.currentRoute.value.name).toBe('dashboard')
    },
  )

  it('keeps results available while focus moves through the search controls and links', async () => {
    const wrapper = mountHeader()
    const input = wrapper.get('input[placeholder="Search all books..."]')
    await input.trigger('focusin')
    await input.setValue('Prey')
    const container = wrapper.get('[data-tour="global-search"]')
    const clear = container.get('button')

    await input.trigger('focusout', { relatedTarget: clear.element })
    expect(wrapper.find('[data-testid="global-search-dropdown"]').exists()).toBe(true)
    const result = container.get('a')
    await clear.trigger('focusout', { relatedTarget: result.element })
    expect(wrapper.find('[data-testid="global-search-dropdown"]').exists()).toBe(true)

    await result.trigger('focusout', { relatedTarget: wrapper.get('[data-tour="statistics-btn"]').element })
    expect(wrapper.find('[data-testid="global-search-dropdown"]').exists()).toBe(false)
  })

  it('retains the result through middle mousedown and loss of document focus', async () => {
    const wrapper = mountHeader()
    const input = wrapper.get('input[placeholder="Search all books..."]')
    await input.trigger('focusin')
    await input.setValue('Prey')
    const result = wrapper.get('[data-testid="global-search-dropdown"] a')
    const middleDown = new MouseEvent('mousedown', { button: 1, bubbles: true, cancelable: true })

    result.element.dispatchEvent(middleDown)
    await input.trigger('focusout', { relatedTarget: null })
    await result.trigger('auxclick', { button: 1 })

    expect(middleDown.defaultPrevented).toBe(false)
    expect(wrapper.get('[data-testid="global-search-dropdown"] a').attributes('href')).toBe('/book/101')
    expect((input.element as HTMLInputElement).value).toBe('Prey')
    expect(router.currentRoute.value.name).toBe('dashboard')

    document.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await nextTick()
    expect(wrapper.find('[data-testid="global-search-dropdown"]').exists()).toBe(false)
  })

  it('opens a result and clears the search for a plain primary click', async () => {
    const wrapper = mountHeader()
    const input = wrapper.get('input[placeholder="Search all books..."]')
    await input.trigger('focusin')
    await input.setValue('Prey')

    await wrapper.get('[data-testid="global-search-dropdown"] a').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/book/101')
    expect((input.element as HTMLInputElement).value).toBe('')
    expect(wrapper.find('[data-testid="global-search-dropdown"]').exists()).toBe(false)
  })

  it('loads more results from the dropdown footer', async () => {
    const wrapper = mountHeader()
    const input = wrapper.get('input[placeholder="Search all books..."]')

    await input.trigger('focusin')
    await input.setValue('Prey')

    const loadMore = wrapper.findAll('button').find((button) => button.text() === 'Load more (2/42)')
    expect(loadMore).toBeDefined()
    if (!loadMore) throw new Error('Expected load more search results button')
    await loadMore.trigger('click')

    expect(mocks.loadMore).toHaveBeenCalledOnce()
  })

  it('loads more results when the dropdown scroll reaches the end', async () => {
    const wrapper = mountHeader()
    const input = wrapper.get('input[placeholder="Search all books..."]')

    await input.trigger('focusin')
    await input.setValue('Prey')

    const dropdown = wrapper.get('[data-testid="global-search-dropdown"]')
    Object.defineProperty(dropdown.element, 'scrollHeight', { configurable: true, value: 1000 })
    Object.defineProperty(dropdown.element, 'clientHeight', { configurable: true, value: 240 })
    Object.defineProperty(dropdown.element, 'scrollTop', { configurable: true, value: 680 })

    await dropdown.trigger('scroll')

    expect(mocks.loadMore).toHaveBeenCalledOnce()
  })

  it('renders only the visible virtual slice of loaded dropdown results', async () => {
    mocks.results = ref(Array.from({ length: 60 }, (_, index) => makeResult(index + 1, `Prey ${index + 1}`)))
    mocks.total = ref(60)
    mocks.hasMore = ref(false)
    const wrapper = mountHeader()
    const input = wrapper.get('input[placeholder="Search all books..."]')

    await input.trigger('focusin')
    await input.setValue('Prey')

    const renderedResults = wrapper.findAll('[data-testid="global-search-dropdown"] a')
    expect(renderedResults.length).toBeGreaterThan(0)
    expect(renderedResults.length).toBeLessThan(60)
    expect(wrapper.text()).toContain('Prey 1')
    expect(wrapper.text()).not.toContain('Prey 60')

    const dropdown = wrapper.get('[data-testid="global-search-dropdown"]')
    Object.defineProperty(dropdown.element, 'scrollTop', { configurable: true, value: 4704 })
    await dropdown.trigger('scroll')
    await nextTick()

    expect(wrapper.text()).not.toContain('Prey 1')
    expect(wrapper.text()).toContain('Prey 60')
  })

  it('does not render the destinations the sidebar now owns', () => {
    const wrapper = mountHeader()
    const text = wrapper.text()

    for (const destination of ['Book Dock', 'Annotations']) {
      expect(text).not.toContain(destination)
    }
  })

  it('keeps Statistics and Achievements in the header', () => {
    const wrapper = mountHeader()

    expect(wrapper.text()).toContain('Statistics')
    expect(wrapper.text()).toContain('Achievements')
  })

  it('hides achievement entry points when achievements are disabled', () => {
    mocks.user = ref({ provisioningMethod: 'password', settings: { achievementPreferences: { enabled: false } } })

    const wrapper = mountHeader()

    expect(wrapper.text()).not.toContain('Achievements')
  })

  it('places the desktop language control immediately before settings', () => {
    const wrapper = mountHeader()
    const buttons = wrapper.findAll('button')
    const languageIndex = buttons.findIndex((button) => button.attributes('data-testid') === 'language-control')
    const settingsIndex = buttons.findIndex((button) => button.attributes('data-tour') === 'settings-nav')

    expect(languageIndex).toBeGreaterThanOrEqual(0)
    expect(settingsIndex).toBeGreaterThanOrEqual(0)
    if (languageIndex < 0 || settingsIndex < 0) throw new Error('Expected desktop language and settings controls')

    const desktopGroup = buttons[settingsIndex]?.element.closest('[class~="md:flex"]')
    if (!desktopGroup) throw new Error('Expected desktop control group')
    const controls = Array.from(desktopGroup.children)
    const languageControlIndex = controls.findIndex((control) => control.contains(buttons[languageIndex]?.element ?? null))
    const settingsControlIndex = controls.findIndex((control) => control.contains(buttons[settingsIndex]?.element ?? null))

    expect(settingsControlIndex).toBe(languageControlIndex + 1)
  })

  it('labels the icon-only desktop destinations and preference controls', () => {
    const wrapper = mountHeader()

    expect(wrapper.get('[data-tour="statistics-btn"]').attributes('aria-label')).toBe('Statistics')
    expect(wrapper.get('[data-tour="documentation-link"]').attributes('aria-label')).toBe('Help')
    expect(wrapper.get('[data-tour="appearance-picker"]').attributes('aria-label')).toBe('Appearance')
    expect(wrapper.get('[data-tour="settings-nav"]').attributes('aria-label')).toBe('Settings')
  })
})
