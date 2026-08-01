import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import SettingsHeader from '../SettingsHeader.vue'

// --- Permission state ---
const permState = {
  isSuperuser: false,
  permissions: [] as string[],
}

const routeState = { name: 'settings-appearance' }

vi.mock('vue-router', () => ({
  RouterLink: { name: 'RouterLink', props: ['to'], template: '<a><slot /></a>' },
  useRoute: () => ({ name: routeState.name }),
}))

vi.mock('@/features/auth/composables/usePermissions', () => ({
  usePermissions: () => ({
    isSuperuser: computed(() => permState.isSuperuser),
    userPermissions: computed(() => permState.permissions),
  }),
}))

function mountHeader(opts?: { su?: boolean; perms?: string[]; routeName?: string }) {
  permState.isSuperuser = opts?.su ?? false
  permState.permissions = opts?.perms ?? []
  routeState.name = opts?.routeName ?? 'settings-appearance'
  return mount(SettingsHeader)
}

function getTabLabels(wrapper: ReturnType<typeof mount>): string[] {
  return wrapper.findAll('a').map((link) => link.text())
}

describe('SettingsHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('tab visibility', () => {
    it('shows Display tab', () => {
      const labels = getTabLabels(mountHeader())
      expect(labels).toContain('Display')
    })

    it('shows Reader tab', () => {
      const labels = getTabLabels(mountHeader())
      expect(labels).toContain('Reader')
    })

    it('shows Account tab', () => {
      const labels = getTabLabels(mountHeader())
      expect(labels).toContain('Account')
    })

    it('hides integration tabs when user has no integration permissions', () => {
      const labels = getTabLabels(mountHeader())
      expect(labels).not.toContain('Integrations')
      expect(labels).not.toContain('Kobo')
      expect(labels).not.toContain('KOReader')
      expect(labels).not.toContain('Hardcover')
    })

    it('shows Kobo tab for users with kobo_sync', () => {
      const labels = getTabLabels(mountHeader({ perms: ['kobo_sync'] }))
      expect(labels).toContain('Kobo')
      expect(labels).not.toContain('Integrations')
    })

    it('shows KOReader tab for users with koreader_sync', () => {
      const labels = getTabLabels(mountHeader({ perms: ['koreader_sync'] }))
      expect(labels).toContain('KOReader')
      expect(labels).not.toContain('Integrations')
    })

    it('shows Integrations tab for users with hardcover_sync', () => {
      const labels = getTabLabels(mountHeader({ perms: ['hardcover_sync'] }))
      expect(labels).toContain('Integrations')
      expect(labels).not.toContain('Hardcover')
    })

    it('shows Integrations tab for users with readwise_sync', () => {
      const labels = getTabLabels(mountHeader({ perms: ['readwise_sync'] }))
      expect(labels).toContain('Integrations')
      expect(labels).not.toContain('Readwise')
    })

    it('hides Integrations tab when user lacks integration permissions', () => {
      const labels = getTabLabels(mountHeader())
      expect(labels).not.toContain('Integrations')
    })

    it('shows Integrations tab for superusers', () => {
      const labels = getTabLabels(mountHeader({ su: true }))
      expect(labels).toContain('Kobo')
      expect(labels).toContain('KOReader')
      expect(labels).toContain('Integrations')
      expect(labels).not.toContain('Hardcover')
      expect(labels).not.toContain('Readwise')
      expect(labels).not.toContain('StoryGraph')
    })

    it('places integration tabs after OPDS', () => {
      const labels = getTabLabels(mountHeader({ su: true }))
      expect(labels.slice(labels.indexOf('OPDS'), labels.indexOf('Admin'))).toEqual(['OPDS', 'Kobo', 'KOReader', 'Integrations'])
    })

    it('places Integrations after KOReader', () => {
      const labels = getTabLabels(mountHeader({ su: true }))
      expect(labels.indexOf('Integrations')).toBe(labels.indexOf('KOReader') + 1)
    })
  })

  describe('tabs removed from top-level navigation', () => {
    it('does not show a standalone Users tab', () => {
      const labels = getTabLabels(mountHeader({ su: true }))
      expect(labels).not.toContain('Users')
    })

    it('does not show a standalone OIDC / SSO tab', () => {
      const labels = getTabLabels(mountHeader({ su: true }))
      expect(labels).not.toContain('OIDC / SSO')
    })

    it('does not show a standalone File Naming tab', () => {
      const labels = getTabLabels(mountHeader({ su: true }))
      expect(labels).not.toContain('File Naming')
    })

    it('does not show a standalone Book Dock tab', () => {
      const labels = getTabLabels(mountHeader({ su: true }))
      expect(labels).not.toContain('Book Dock')
    })

    it('does not show a standalone Maintenance tab', () => {
      const labels = getTabLabels(mountHeader({ su: true }))
      expect(labels).not.toContain('Maintenance')
    })

    it('does not show a standalone Audit Log tab', () => {
      const labels = getTabLabels(mountHeader({ su: true }))
      expect(labels).not.toContain('Audit Log')
    })

    it('does not show a standalone Notifications tab', () => {
      const labels = getTabLabels(mountHeader())
      expect(labels).not.toContain('Notifications')
    })
  })

  describe('Admin tab visibility', () => {
    it('shows Admin tab for superuser', () => {
      const labels = getTabLabels(mountHeader({ su: true }))
      expect(labels).toContain('Admin')
    })

    it('shows Admin tab for user with manage_users', () => {
      const labels = getTabLabels(mountHeader({ perms: ['manage_users'] }))
      expect(labels).toContain('Admin')
    })

    it('shows Admin tab for user with manage_app_settings', () => {
      const labels = getTabLabels(mountHeader({ perms: ['manage_app_settings'] }))
      expect(labels).toContain('Admin')
    })

    it('shows Admin tab for user with view_user_activity', () => {
      const labels = getTabLabels(mountHeader({ perms: ['view_user_activity'] }))
      expect(labels).toContain('Admin')
    })

    it('hides Admin tab without an administrative permission', () => {
      const labels = getTabLabels(mountHeader({ perms: ['kobo_sync'] }))
      expect(labels).not.toContain('Admin')
    })
  })

  describe('System tab visibility', () => {
    it('shows System tab for superuser', () => {
      const labels = getTabLabels(mountHeader({ su: true }))
      expect(labels).toContain('System')
    })

    it('shows System tab for user with manage_app_settings', () => {
      const labels = getTabLabels(mountHeader({ perms: ['manage_app_settings'] }))
      expect(labels).toContain('System')
    })

    it('shows System tab for user with book_dock_access', () => {
      const labels = getTabLabels(mountHeader({ perms: ['book_dock_access'] }))
      expect(labels).toContain('System')
    })

    it('hides System tab when user lacks manage_app_settings and book_dock_access', () => {
      const labels = getTabLabels(mountHeader({ perms: ['kobo_sync'] }))
      expect(labels).not.toContain('System')
    })
  })

  describe('conditional tabs', () => {
    it('shows Libraries tab for superuser', () => {
      const labels = getTabLabels(mountHeader({ su: true }))
      expect(labels).toContain('Libraries')
    })

    it('shows Libraries tab for user with manage_libraries', () => {
      const labels = getTabLabels(mountHeader({ perms: ['manage_libraries'] }))
      expect(labels).toContain('Libraries')
    })

    it('hides Libraries tab for user without manage_libraries', () => {
      const labels = getTabLabels(mountHeader())
      expect(labels).not.toContain('Libraries')
    })

    it('shows Metadata tab for superuser', () => {
      const labels = getTabLabels(mountHeader({ su: true }))
      expect(labels).toContain('Metadata')
    })

    it('shows Metadata tab for user with manage_metadata_config', () => {
      const labels = getTabLabels(mountHeader({ perms: ['manage_metadata_config'] }))
      expect(labels).toContain('Metadata')
    })

    it('shows Email tab for user with email_send', () => {
      const labels = getTabLabels(mountHeader({ perms: ['email_send'] }))
      expect(labels).toContain('Email')
    })

    it('shows OPDS tab for user with opds_access', () => {
      const labels = getTabLabels(mountHeader({ perms: ['opds_access'] }))
      expect(labels).toContain('OPDS')
    })
  })

  describe('active state', () => {
    it('active tab link has border-primary class when route matches', () => {
      const wrapper = mountHeader({ routeName: 'settings-appearance' })
      const displayLink = wrapper.findAll('a').find((link) => link.text() === 'Display')
      expect(displayLink?.classes()).toContain('border-primary')
    })

    it('inactive tabs have border-transparent class', () => {
      const wrapper = mountHeader({ routeName: 'settings-appearance' })
      const readerLink = wrapper.findAll('a').find((link) => link.text() === 'Reader')
      expect(readerLink?.classes()).toContain('border-transparent')
    })

    it('kobo tab is active when route is settings-kobo', () => {
      const wrapper = mountHeader({ routeName: 'settings-kobo', perms: ['kobo_sync'] })
      const link = wrapper.findAll('a').find((item) => item.text() === 'Kobo')
      expect(link?.classes()).toContain('border-primary')
    })

    it('KOReader tab is active when route is settings-koreader', () => {
      const wrapper = mountHeader({ routeName: 'settings-koreader', perms: ['koreader_sync'] })
      const link = wrapper.findAll('a').find((item) => item.text() === 'KOReader')
      expect(link?.classes()).toContain('border-primary')
    })

    it('Integrations tab is active when route is settings-integrations', () => {
      const wrapper = mountHeader({ routeName: 'settings-integrations', perms: ['storygraph_sync'] })
      const link = wrapper.findAll('a').find((item) => item.text() === 'Integrations')
      expect(link?.classes()).toContain('border-primary')
    })

    it('admin tab is active when route is settings-admin', () => {
      const wrapper = mountHeader({ su: true, routeName: 'settings-admin' })
      const link = wrapper.findAll('a').find((item) => item.text() === 'Admin')
      expect(link?.classes()).toContain('border-primary')
    })

    it('system tab is active when route is settings-system', () => {
      const wrapper = mountHeader({ su: true, routeName: 'settings-system' })
      const link = wrapper.findAll('a').find((item) => item.text() === 'System')
      expect(link?.classes()).toContain('border-primary')
    })

    it('account tab is active when route is settings-account', () => {
      const wrapper = mountHeader({ routeName: 'settings-account' })
      const link = wrapper.findAll('a').find((item) => item.text() === 'Account')
      expect(link?.classes()).toContain('border-primary')
    })
  })

  describe('navigation', () => {
    it('renders a tab route target', () => {
      const wrapper = mountHeader({ routeName: 'settings-appearance' })
      const readerLink = wrapper.findAllComponents({ name: 'RouterLink' }).find((link) => link.text() === 'Reader')

      expect(readerLink).toBeDefined()
      expect(readerLink?.props('to')).toEqual({ name: 'settings-reader-general' })
    })
  })
})
