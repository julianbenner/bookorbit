import { describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import type { LongWaitWidgetData } from '@bookorbit/types'
import LongWaitWidget from '../LongWaitWidget.vue'

const fetchLongWait = vi.fn<() => Promise<LongWaitWidgetData | null>>()

vi.mock('@/features/dashboard/api/dashboard-widget.api', () => ({
  fetchLongWait: () => fetchLongWait(),
}))
vi.mock('@/features/book/composables/useCoverVersions', () => ({
  useCoverVersions: () => ({ coverUrl: () => '/cover.jpg' }),
}))

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

const CoverSurfaceStub = {
  name: 'BookCoverSurface',
  props: ['isComic'],
  template: '<div data-testid="surface" :data-comic="isComic"><slot /></div>',
}
const CoverArtworkStub = {
  name: 'BookCoverArtwork',
  props: ['isComic'],
  template: '<div data-testid="artwork" :data-comic="isComic" />',
}

function data(fileFormat: string | null): LongWaitWidgetData {
  return {
    bookId: 1,
    title: 'Bone',
    hasCover: true,
    addedAt: '2024-01-01',
    waitingDays: 120,
    pageCount: 200,
    genre: 'comic',
    fileId: 9,
    fileFormat,
  }
}

function mountWidget(fileFormat: string | null) {
  fetchLongWait.mockResolvedValue(data(fileFormat))
  return mount(LongWaitWidget, {
    global: {
      stubs: {
        BookCoverSurface: CoverSurfaceStub,
        BookCoverArtwork: CoverArtworkStub,
        RouterLink: RouterLinkStub,
      },
    },
  })
}

describe('LongWaitWidget comic spine flag', () => {
  it('marks comic books as comics for the cover surface and artwork', async () => {
    const wrapper = mountWidget('cb7')
    await flushPromises()

    expect(wrapper.find('[data-testid="surface"]').attributes('data-comic')).toBe('true')
    expect(wrapper.find('[data-testid="artwork"]').attributes('data-comic')).toBe('true')
  })

  it('links the book details and reader CTA to their route targets', async () => {
    const wrapper = mountWidget('epub')
    await flushPromises()

    const links = wrapper.findAllComponents(RouterLinkStub)
    expect(links).toHaveLength(3)
    expect(links[0]!.props('to')).toEqual({ name: 'book-detail', params: { bookId: 1 } })
    expect(links[1]!.props('to')).toEqual({ name: 'book-detail', params: { bookId: 1 } })
    expect(links[2]!.props('to')).toEqual({
      name: 'reader',
      params: { bookId: 1, fileId: 9 },
      query: { format: 'epub' },
    })
  })

  it('does not mark non-comic books as comics', async () => {
    const wrapper = mountWidget('pdf')
    await flushPromises()

    expect(wrapper.find('[data-testid="surface"]').attributes('data-comic')).toBe('false')
  })
})
