<script setup lang="ts" generic="T extends string">
import { nextTick, ref, watch } from 'vue'
import { useScrollOverflow } from '@/composables/useScrollOverflow'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

interface SettingsTabItem {
  id: T
  label: string
  controls?: string
}

const props = withDefaults(
  defineProps<{
    tabs: readonly SettingsTabItem[]
    activeTab: T
    tabTo: (tab: T) => RouteLocationRaw
    variant?: 'page' | 'section'
    testIdPrefix?: string
    idPrefix?: string
  }>(),
  { variant: 'page' },
)

const container = ref<HTMLElement | null>(null)
const { hasStartOverflow, hasEndOverflow } = useScrollOverflow(container)

async function revealActiveTab(): Promise<void> {
  await nextTick()
  const tab = container.value?.querySelector<HTMLElement>('[aria-current="page"]')
  if (!tab || !container.value || container.value.scrollWidth <= container.value.clientWidth) return

  const containerRect = container.value.getBoundingClientRect()
  const tabRect = tab.getBoundingClientRect()
  if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
    container.value.scrollLeft += tabRect.left - containerRect.left
  }
}

watch(() => props.activeTab, revealActiveTab, { immediate: true })
</script>

<template>
  <!-- The section strip hides its scrollbar, so a pointer would otherwise have nothing to say that
       tabs sit past the edge. Only that variant needs the positioned wrapper, so the page variant
       keeps its exact layout box and its sticky positioning. -->
  <div :class="variant === 'section' ? 'relative shrink-0' : 'contents'">
    <nav
      ref="container"
      :class="
        variant === 'section'
          ? 'flex h-11 shrink-0 snap-x snap-mandatory items-stretch overflow-x-auto border-b px-4 scrollbar-none md:snap-none'
          : 'sticky top-0 z-20 mb-5 flex snap-x gap-1 overflow-x-auto border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:static md:mb-6 md:overflow-visible'
      "
    >
      <RouterLink
        v-for="tab in tabs"
        :key="tab.id"
        :to="tabTo(tab.id)"
        replace
        :id="idPrefix ? `${idPrefix}-${tab.id}-tab` : undefined"
        :aria-current="activeTab === tab.id ? 'page' : undefined"
        :aria-controls="tab.controls"
        :data-testid="testIdPrefix ? `${testIdPrefix}-${tab.id}` : undefined"
        :class="[
          variant === 'section'
            ? 'h-full shrink-0 snap-start whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors'
            : '-mb-px shrink-0 snap-start border-b-2 px-3 py-3 text-sm font-medium transition-colors md:py-2',
          activeTab === tab.id
            ? 'border-primary text-foreground'
            : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
        ]"
      >
        {{ tab.label }}
      </RouterLink>
    </nav>
    <div
      v-if="variant === 'section' && hasStartOverflow"
      class="pointer-events-none absolute inset-y-px start-0 w-8 bg-linear-to-r from-background to-transparent"
      aria-hidden="true"
    />
    <div
      v-if="variant === 'section' && hasEndOverflow"
      class="pointer-events-none absolute inset-y-px end-0 w-8 bg-linear-to-l from-background to-transparent"
      aria-hidden="true"
    />
  </div>
</template>
