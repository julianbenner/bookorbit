import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import type { AuthorSummary } from '@bookorbit/types'
import AuthorTile from '../AuthorTile.vue'

function author(overrides: Partial<AuthorSummary> = {}): AuthorSummary {
  return { id: 1, name: 'Blake Crouch', sortName: null, bookCount: 3, lastAddedAt: null, coverBookId: null, ...overrides }
}

const authorTarget = { name: 'author-detail', params: { id: 1 }, query: { from: '/authors' } }

function mountTile(
  props: Record<string, unknown> = {},
  router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/authors', component: { template: '<div />' } },
      { path: '/authors/:id', name: 'author-detail', component: { template: '<div />' } },
    ],
  }),
) {
  return mount(AuthorTile, {
    props: { author: author(), to: authorTarget, ...props },
    global: {
      plugins: [router],
      mocks: { $t: (key: string) => key },
      stubs: {
        DropdownMenu: { template: '<div><slot /></div>' },
        DropdownMenuTrigger: { template: '<div><slot /></div>' },
        DropdownMenuContent: { template: '<div><slot /></div>' },
        DropdownMenuItem: { template: '<div><slot /></div>' },
        AuthorPortrait: { template: '<span class="portrait-stub" />' },
      },
    },
  })
}

describe('AuthorTile', () => {
  it('stretches the activate target over the whole tile, not just the artwork', () => {
    const wrapper = mountTile()
    const root = wrapper.element as HTMLElement
    const link = wrapper.get('a.inset-0')

    // Sizing the target to the artwork leaves every corner of a circular tile dead
    // and never lets anyone click the name.
    expect(link.element.parentElement).toBe(root)
    expect(link.classes()).toContain('inset-0')

    const selecting = mountTile({ selectionMode: true })
    const activate = selecting.get('button.inset-0')
    expect(activate.element.parentElement).toBe(selecting.element as HTMLElement)
  })

  it('keeps the actions menu out of the clipped artwork so the hover transform cannot bury it', () => {
    const wrapper = mountTile()
    const root = wrapper.element as HTMLElement
    const menuButton = wrapper.get('button[aria-label^="Actions for"]')

    // The artwork lifts on hover, and a transform makes that element a stacking
    // context; a menu nested inside it renders beneath the tile's activate button.
    const clipped = root.querySelector('.overflow-hidden')
    expect(clipped).not.toBeNull()
    expect(clipped!.contains(menuButton.element)).toBe(false)
  })

  it('keeps the badges out of the clipped artwork, which a circle would crop away', () => {
    const wrapper = mountTile({ selectionMode: true, selected: true, shape: 'circle' })
    const clipped = wrapper.element.querySelector('.overflow-hidden')!
    const checkbox = [...wrapper.element.querySelectorAll('span')].find((s) => s.querySelector('svg') && /rounded-md/.test(s.className))

    expect(checkbox).toBeDefined()
    expect(clipped.contains(checkbox!)).toBe(false)
  })

  it('anchors the badges to the artwork box, not to the tile below the name', () => {
    const wrapper = mountTile({ shape: 'circle' })
    const frame = wrapper.element.querySelector('.aspect-square')!
    const badge = [...frame.querySelectorAll('span')].find((s) => /tabular-nums/.test(s.className))

    // Hanging them on the tile measures from under the name, which parks the count
    // badge beside the author's name instead of on their portrait.
    expect(badge).toBeDefined()
    expect(frame.contains(badge!)).toBe(true)
  })

  it('never lets anything stacked above the activate button swallow a click', () => {
    const wrapper = mountTile({ selectionMode: true, selected: true })
    const above = [...wrapper.element.querySelectorAll('.absolute')].filter((el) => {
      if (el.tagName === 'BUTTON' || el.querySelector('button')) return false
      return /z-(2|3|4)0/.test(el.className)
    })

    expect(above.length).toBeGreaterThan(0)
    for (const el of above) expect(el.className).toContain('pointer-events-none')
  })

  it('shows a busy overlay while refreshing without needing a hover', () => {
    const wrapper = mountTile({ refreshing: true })
    const status = wrapper.get('[role="status"]')

    expect(status.find('.animate-spin').exists()).toBe(true)
    // A spinner tucked inside the hover-revealed menu button is invisible in practice.
    expect(status.element.className).not.toContain('group-hover')
  })

  it('selects instead of navigating while in selection mode', async () => {
    const wrapper = mountTile({ selectionMode: true })
    await wrapper.get('button.inset-0').trigger('click')

    expect(wrapper.emitted('select')).toHaveLength(1)
    expect(wrapper.find('a').exists()).toBe(false)
  })

  it('navigates to the author and retains the list return path on a plain click', async () => {
    const wrapper = mountTile()
    await flushPromises()

    const link = wrapper.get('a.inset-0')
    const href = link.attributes('href')
    expect(href).toBe('/authors/1?from=/authors')
    await link.trigger('click')
    await flushPromises()

    expect(wrapper.vm.$router.currentRoute.value.fullPath).toBe(href)
    expect(wrapper.emitted('select')).toBeUndefined()
    expect(link.element.querySelector('button, a')).toBeNull()
  })

  it.each([{ button: 1 }, { button: 0, ctrlKey: true }, { button: 0, metaKey: true }, { button: 0, shiftKey: true }, { button: 0, altKey: true }])(
    'leaves native link activation to the browser (%o)',
    async (options) => {
      const wrapper = mountTile()
      await flushPromises()
      const initialPath = wrapper.vm.$router.currentRoute.value.fullPath
      const event = new MouseEvent('click', { ...options, bubbles: true, cancelable: true })

      wrapper.get('a.inset-0').element.dispatchEvent(event)
      await flushPromises()

      expect(event.defaultPrevented).toBe(false)
      expect(wrapper.vm.$router.currentRoute.value.fullPath).toBe(initialPath)
      expect(wrapper.emitted('select')).toBeUndefined()
    },
  )
})
