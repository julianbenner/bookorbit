import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import AccountAllSettings from '../AccountAllSettings.vue'

// --- Permission state ---
const permState = { isDemo: false }

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
    isDemoRestrictedAccount: computed(() => permState.isDemo),
  }),
}))

vi.mock('../AccountSettings.vue', () => ({ default: { template: '<div data-testid="account-settings" />' } }))
vi.mock('../PrivacySharingSettings.vue', () => ({ default: { template: '<div data-testid="privacy-sharing-settings" />' } }))
vi.mock('@/features/notifications/components/NotificationPreferences.vue', () => ({
  default: { template: '<div data-testid="notification-preferences" />' },
}))

function mountComponent(queryTab?: string, isDemo = false) {
  permState.isDemo = isDemo
  routerState.currentQuery = queryTab ? { tab: queryTab } : {}
  routerState.replacedQuery = null
  return mount(AccountAllSettings)
}

describe('AccountAllSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('non-demo user', () => {
    it('sees Profile, Privacy, and Notifications tabs', () => {
      const wrapper = mountComponent()
      const labels = wrapper.findAll('a').map((link) => link.text())
      expect(labels).toContain('Profile')
      expect(labels).toContain('Privacy & Sharing')
      expect(labels).toContain('Notifications')
    })

    it('defaults to profile tab and shows AccountSettings', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('[data-testid="account-settings"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="notification-preferences"]').exists()).toBe(false)
    })

    it('replaces URL with ?tab=profile on mount when no param', () => {
      mountComponent()
      expect(routerState.replacedQuery?.tab).toBe('profile')
    })

    it('shows NotificationPreferences when tab=notifications', () => {
      const wrapper = mountComponent('notifications')
      expect(wrapper.find('[data-testid="notification-preferences"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="account-settings"]').exists()).toBe(false)
    })

    it('shows AccountSettings when tab=profile', () => {
      const wrapper = mountComponent('profile')
      expect(wrapper.find('[data-testid="account-settings"]').exists()).toBe(true)
    })

    it('shows PrivacySharingSettings when tab=privacy', () => {
      const wrapper = mountComponent('privacy')
      expect(wrapper.find('[data-testid="privacy-sharing-settings"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="account-settings"]').exists()).toBe(false)
    })

    it('falls back to profile for unknown tab', () => {
      const wrapper = mountComponent('unknown')
      expect(wrapper.find('[data-testid="account-settings"]').exists()).toBe(true)
    })
  })

  describe('demo-restricted user', () => {
    it('keeps Privacy available while hiding Notifications', () => {
      const wrapper = mountComponent(undefined, true)
      const labels = wrapper.findAll('a').map((link) => link.text())
      expect(labels).toContain('Profile')
      expect(labels).toContain('Privacy & Sharing')
      expect(labels).not.toContain('Notifications')
    })

    it('defaults to profile', () => {
      const wrapper = mountComponent(undefined, true)
      expect(wrapper.find('[data-testid="account-settings"]').exists()).toBe(true)
    })

    it('falls back to profile when notifications tab is requested', () => {
      const wrapper = mountComponent('notifications', true)
      expect(wrapper.find('[data-testid="account-settings"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="notification-preferences"]').exists()).toBe(false)
    })
  })

  describe('tab navigation', () => {
    it('active tab link has border-primary class', () => {
      const wrapper = mountComponent('profile')
      const profileLink = wrapper.findAll('a').find((link) => link.text() === 'Profile')
      expect(profileLink?.classes()).toContain('border-primary')
    })

    it('inactive tab link has border-transparent class', () => {
      const wrapper = mountComponent('profile')
      const notifLink = wrapper.findAll('a').find((link) => link.text() === 'Notifications')
      expect(notifLink?.classes()).toContain('border-transparent')
    })

    it('renders the notifications tab route target', () => {
      const wrapper = mountComponent('profile')
      const link = wrapper.findAllComponents({ name: 'RouterLink' }).find((item) => item.text() === 'Notifications')

      expect(link).toBeDefined()
      expect(link?.props('to')).toEqual({ name: 'settings-account', query: { tab: 'notifications' } })
      expect(link?.props('replace')).toBe(true)
    })

    it('does not replace URL when tab param already set', () => {
      mountComponent('notifications')
      expect(routerState.replacedQuery).toBeNull()
    })
  })
})
