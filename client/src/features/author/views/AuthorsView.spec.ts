import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import type { AuthorListSort, AuthorSummary, SortDirection } from '../types/author'
import AuthorsView from './AuthorsView.vue'
import AuthorFilters from '../components/AuthorFilters.vue'
import AuthorCard from '../components/AuthorCard.vue'
import AuthorListRow from '../components/AuthorListRow.vue'

class MockIntersectionObserver {
  observe = vi.fn<(target: Element) => void>()
  unobserve = vi.fn<(target: Element) => void>()
  disconnect = vi.fn<() => void>()
  takeRecords = vi.fn<() => IntersectionObserverEntry[]>(() => [])
}

const mocks = vi.hoisted(() => ({
  route: { params: {} as Record<string, string>, query: {} as Record<string, unknown>, fullPath: '/authors' },
  routerReplace: vi.fn<(to: unknown) => Promise<void>>(),
  fetchLibraries: vi.fn<() => Promise<void>>(),
  load: vi.fn<(reset?: boolean) => Promise<void>>(),
  q: null as unknown as { value: string },
  sort: null as unknown as { value: AuthorListSort },
  order: null as unknown as { value: SortDirection },
  libraryId: null as unknown as { value: number | null },
  hasPhoto: null as unknown as { value: boolean | null },
  minBookCount: null as unknown as { value: number | null },
}))

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return {
    ...actual,
    useRoute: () => mocks.route,
    useRouter: () => ({ replace: mocks.routerReplace }),
  }
})

vi.mock('vue-sonner', () => ({
  toast: { success: vi.fn<(message: string) => void>(), error: vi.fn<(message: string) => void>(), warning: vi.fn<(message: string) => void>() },
}))

vi.mock('@/composables/useDisplaySettings', () => ({
  useDisplaySettings: () => ({
    gridGap: ref(16),
    viewMode: ref('grid'),
    authorCoverSize: ref(160),
    authorCoverShape: ref('circle'),
  }),
}))

vi.mock('@/features/library/composables/useLibraries', () => ({
  useLibraries: () => ({ libraries: ref([]), fetchLibraries: mocks.fetchLibraries }),
}))

vi.mock('@/features/auth/composables/usePermissions', () => ({
  usePermissions: () => ({ hasPermission: () => true, isDemoRestrictedAccount: ref(false), isSuperuser: ref(false) }),
}))

vi.mock('../composables/useAuthorsList', () => ({
  useAuthorsList: () => ({
    items: ref([]),
    total: ref(0),
    loading: ref(false),
    error: ref(null),
    hasMore: ref(false),
    q: mocks.q,
    sort: mocks.sort,
    order: mocks.order,
    libraryId: mocks.libraryId,
    hasPhoto: mocks.hasPhoto,
    minBookCount: mocks.minBookCount,
    load: mocks.load,
  }),
}))

vi.mock('../composables/useAuthorSelection', () => ({
  useAuthorSelection: () => ({
    selectionMode: ref(false),
    selectedIds: ref<number[]>([]),
    selectedCount: ref(0),
    enterSelectionMode: vi.fn<() => void>(),
    exitSelectionMode: vi.fn<() => void>(),
    toggleAuthor: vi.fn<(id: number) => void>(),
    rangeSelectTo: vi.fn<(id: number, ids: number[]) => void>(),
    selectAll: vi.fn<(ids: number[]) => void>(),
    isSelected: () => false,
  }),
}))

vi.mock('../composables/useRefreshingAuthors', () => ({
  useRefreshingAuthors: () => ({
    markRefreshing: vi.fn<(id: number) => void>(),
    clearRefreshing: vi.fn<(id: number) => void>(),
    isRefreshing: () => false,
  }),
}))

async function mountView() {
  const wrapper = shallowMount(AuthorsView)
  await flushPromises()
  return wrapper
}

describe('AuthorsView filters panel placement', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
    mocks.route.query = {}
    mocks.routerReplace.mockResolvedValue()
    mocks.fetchLibraries.mockResolvedValue()
    mocks.load.mockResolvedValue()
    mocks.q = ref('')
    mocks.sort = ref('name')
    mocks.order = ref('asc')
    mocks.libraryId = ref(null)
    mocks.hasPhoto = ref(null)
    mocks.minBookCount = ref(null)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('renders the desktop filters panel outside the scrolling <main> so it stays anchored when scrolled', async () => {
    mocks.route.query = { libraryId: '5' }
    const wrapper = await mountView()

    const main = wrapper.find('main')
    expect(main.exists()).toBe(true)

    const filters = wrapper.findComponent(AuthorFilters)
    expect(filters.exists()).toBe(true)
    // Regression guard for #326: the panel must NOT live inside the scroll container.
    expect(filters.element.closest('main')).toBeNull()
  })

  it('does not render the desktop filters panel when no filter is active', async () => {
    mocks.route.query = {}
    const wrapper = await mountView()

    expect(wrapper.findComponent(AuthorFilters).exists()).toBe(false)
  })
})

const RouterLinkStub = defineComponent({
  name: 'RouterLink',
  props: {
    to: {
      type: [String, Object],
      required: true,
    },
  },
  template: '<a><slot /></a>',
})

const PassthroughStub = defineComponent({
  template: '<div><slot /></div>',
})

const author: AuthorSummary = {
  id: 7,
  name: 'Author',
  sortName: null,
  description: null,
  imageUrl: null,
  bookCount: 4,
  lastAddedAt: '2026-01-01T00:00:00.000Z',
}

const authorTarget = { name: 'author-detail', params: { id: author.id }, query: { from: '/authors' } }

function mountAuthorCard(props: { selectionMode?: boolean } = {}) {
  return mount(AuthorCard, {
    props: { author, to: authorTarget, ...props },
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
        DropdownMenu: PassthroughStub,
        DropdownMenuTrigger: PassthroughStub,
        DropdownMenuContent: PassthroughStub,
        DropdownMenuItem: PassthroughStub,
      },
    },
  })
}

function mountAuthorListRow(props: { selectionMode?: boolean } = {}) {
  return mount(AuthorListRow, {
    props: { author, to: authorTarget, ...props },
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
      },
    },
  })
}

describe('author destination links and selection mode', () => {
  it('renders author cards and list rows with their detail route targets', () => {
    const card = mountAuthorCard()
    const cardLinks = card.findAllComponents(RouterLinkStub)
    expect(cardLinks).toHaveLength(2)
    expect(cardLinks.map((link) => link.props('to'))).toEqual([authorTarget, authorTarget])

    const row = mountAuthorListRow()
    expect(row.getComponent(RouterLinkStub).props('to')).toEqual(authorTarget)
  })

  it('uses explicit selection mode instead of rendering navigation links', async () => {
    const card = mountAuthorCard({ selectionMode: true })
    expect(card.findComponent(RouterLinkStub).exists()).toBe(false)
    expect(card.find('[role="button"]').exists()).toBe(true)
    await card.find('[role="button"]').trigger('click')
    expect(card.emitted('select')).toHaveLength(1)

    const row = mountAuthorListRow({ selectionMode: true })
    expect(row.findComponent(RouterLinkStub).exists()).toBe(false)
    expect(row.element.tagName).toBe('BUTTON')
    await row.trigger('click')
    expect(row.emitted('select')).toHaveLength(1)
  })
})
