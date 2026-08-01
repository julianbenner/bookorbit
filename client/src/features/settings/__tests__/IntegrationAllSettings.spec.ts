import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed } from 'vue'
import { mount } from '@vue/test-utils'
import IntegrationAllSettings from '../IntegrationAllSettings.vue'

const permissionState = {
  isSuperuser: false,
  permissions: [] as string[],
}

const routerState = {
  currentQuery: {} as Record<string, string>,
  replacedQuery: null as Record<string, string> | null,
}

vi.mock('vue-router', () => ({
  RouterLink: {
    name: 'RouterLink',
    props: { to: { type: [String, Object, Array], required: true }, replace: Boolean },
    template: '<a><slot /></a>',
  },
  useRoute: () => ({ query: routerState.currentQuery }),
  useRouter: () => ({
    replace: vi.fn<(to: { name: string; query: Record<string, string> }) => void>((to) => {
      routerState.replacedQuery = to.query
    }),
  }),
}))

vi.mock('@/features/auth/composables/usePermissions', () => ({
  usePermissions: () => ({
    isSuperuser: computed(() => permissionState.isSuperuser),
    userPermissions: computed(() => permissionState.permissions),
  }),
}))

vi.mock('../SettingsPageHeader.vue', () => ({ default: { template: '<div data-testid="settings-page-header" />' } }))
vi.mock('@/features/hardcover/components/HardcoverSettings.vue', () => ({ default: { template: '<div data-testid="hardcover-settings" />' } }))
vi.mock('@/features/readwise/components/ReadwiseSettings.vue', () => ({ default: { template: '<div data-testid="readwise-settings" />' } }))
vi.mock('@/features/storygraph/components/StorygraphSettings.vue', () => ({ default: { template: '<div data-testid="storygraph-settings" />' } }))

function mountComponent(tab?: string, permissions: string[] = [], isSuperuser = false) {
  permissionState.permissions = permissions
  permissionState.isSuperuser = isSuperuser
  routerState.currentQuery = tab ? { tab } : {}
  routerState.replacedQuery = null
  return mount(IntegrationAllSettings)
}

describe('IntegrationAllSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows only the integrations the user can access', () => {
    const wrapper = mountComponent(undefined, ['readwise_sync'])

    expect(wrapper.findAll('a').map((link) => link.text())).toEqual(['Readwise'])
  })

  it('shows every integration to a superuser', () => {
    const wrapper = mountComponent(undefined, [], true)

    expect(wrapper.findAll('a').map((link) => link.text())).toEqual(['Hardcover', 'Readwise', 'StoryGraph'])
  })

  it('shows the requested accessible sub-tab', () => {
    const wrapper = mountComponent('storygraph', ['storygraph_sync'])

    expect(wrapper.find('[data-testid="storygraph-settings"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="hardcover-settings"]').exists()).toBe(false)
  })

  it('falls back to the first accessible sub-tab', () => {
    const wrapper = mountComponent('hardcover', ['readwise_sync'])

    expect(wrapper.find('[data-testid="readwise-settings"]').exists()).toBe(true)
  })

  it('renders the selected integration tab route target', () => {
    const wrapper = mountComponent('hardcover', ['hardcover_sync', 'readwise_sync'])
    const readwiseLink = wrapper.findAllComponents({ name: 'RouterLink' }).find((link) => link.text() === 'Readwise')

    expect(readwiseLink).toBeDefined()
    expect(readwiseLink?.props('to')).toEqual({ name: 'settings-integrations', query: { tab: 'readwise' } })
    expect(readwiseLink?.props('replace')).toBe(true)
  })

  it('shows a permission message when no integration is available', () => {
    const wrapper = mountComponent()

    expect(wrapper.findAll('a')).toHaveLength(0)
    expect(wrapper.text()).toContain('You do not have permission to use any integrations.')
  })
})
