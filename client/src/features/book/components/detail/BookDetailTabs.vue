<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { normalizeBookDetailTab, type BookDetailTab } from '@/features/book/lib/book-detail-tabs'
import { usePermissions } from '@/features/auth/composables/usePermissions'

const props = defineProps<{ bookId: number }>()
const route = useRoute()
const { t } = useI18n()
const { hasPermission } = usePermissions()

const activeTab = computed(() => normalizeBookDetailTab(route.query.tab))

const tabs = computed<{ label: string; tab: BookDetailTab }[]>(() => {
  const result: { label: string; tab: BookDetailTab }[] = [{ label: t('book.detail.tabs.details'), tab: 'details' }]
  if (hasPermission('library_edit_metadata')) {
    result.push({ label: t('book.detail.tabs.editMetadata'), tab: 'edit' })
  }
  result.push({ label: t('book.detail.tabs.files'), tab: 'files' })
  result.push({ label: t('book.detail.tabs.readingLog'), tab: 'reading-log' })
  result.push({ label: t('book.detail.tabs.highlights'), tab: 'highlights' })
  return result
})
</script>

<template>
  <div class="flex items-stretch gap-0 overflow-x-auto scrollbar-none flex-1 min-w-0">
    <RouterLink
      v-for="tabItem in tabs"
      :key="tabItem.tab"
      :to="{ name: 'book-detail', params: { bookId: props.bookId }, query: { ...route.query, tab: tabItem.tab }, hash: route.hash }"
      :aria-current="activeTab === tabItem.tab ? 'page' : undefined"
      class="inline-flex items-center px-3.5 sm:px-3 h-full text-[15px] sm:text-sm font-semibold sm:font-medium border-b-2 transition-colors whitespace-nowrap"
      :class="activeTab === tabItem.tab ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'"
    >
      {{ tabItem.label }}
    </RouterLink>
  </div>
</template>
