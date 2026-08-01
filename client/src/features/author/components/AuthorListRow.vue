<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { formatDate, formatNumber } from '@/i18n/formatters'
import type { AuthorSummary } from '@bookorbit/types'
import { ArrowRight, BookCopy, Check, Clock3, Loader2 } from '@lucide/vue'
import { toDisplayCoverUrl } from '@/features/book/lib/metadata-fetch'

const props = defineProps<{
  author: AuthorSummary
  selectionMode?: boolean
  selected?: boolean
  refreshing?: boolean
  to: RouteLocationRaw
}>()

const emit = defineEmits<{
  select: [event: MouseEvent]
}>()

const { t } = useI18n()

const lastAddedLabel = computed(() => {
  if (!props.author.lastAddedAt) return t('author.listRow.noRecentAdditions')
  const date = new Date(props.author.lastAddedAt)
  return Number.isNaN(date.getTime()) ? t('author.listRow.noRecentAdditions') : formatDate(date)
})

const imageFailed = ref(false)
const initial = computed(() => props.author.name.trim().charAt(0).toUpperCase() || '?')
const imageSrc = computed(() => {
  const display = toDisplayCoverUrl(props.author.imageUrl)
  return display || undefined
})
watch(
  () => props.author.imageUrl,
  () => {
    imageFailed.value = false
  },
)

function handleSelectionClick(event: MouseEvent) {
  if (props.selectionMode) emit('select', event)
}
</script>

<template>
  <component
    :is="selectionMode ? 'button' : RouterLink"
    :to="selectionMode ? undefined : to"
    :type="selectionMode ? 'button' : undefined"
    class="w-full rounded-lg border border-transparent px-1 py-2 text-left transition-colors hover:border-border hover:bg-muted/40 [content-visibility:auto] [contain-intrinsic-size:56px_1000px] sm:px-3"
    :class="[selectionMode ? 'cursor-pointer select-none' : '', selected ? 'border-primary/45 bg-primary/5' : '']"
    @click="handleSelectionClick"
  >
    <span class="flex items-center gap-3">
      <span
        v-if="selectionMode"
        class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border text-[10px]"
        :class="selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-transparent'"
      >
        <Check :size="11" />
      </span>

      <span class="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted/30">
        <img
          v-if="imageSrc && !imageFailed"
          :src="imageSrc"
          :alt="t('author.listRow.portraitAlt', { name: author.name })"
          class="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          fetchpriority="low"
          @error="imageFailed = true"
        />
        <span v-else class="flex h-full w-full items-center justify-center text-xs font-semibold text-primary">
          {{ initial }}
        </span>
      </span>

      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-medium text-foreground">{{ author.name }}</span>
        <span v-if="author.sortName && author.sortName !== author.name" class="block truncate text-xs text-muted-foreground">{{
          author.sortName
        }}</span>
      </span>

      <span class="hidden md:flex items-center gap-5 text-xs text-muted-foreground">
        <span class="inline-flex items-center gap-1.5">
          <BookCopy :size="12" />
          {{ formatNumber(author.bookCount) }}
        </span>
        <span class="inline-flex items-center gap-1.5">
          <Clock3 :size="12" />
          {{ lastAddedLabel }}
        </span>
      </span>

      <Loader2 v-if="!selectionMode && refreshing" :size="14" class="animate-spin text-muted-foreground" />
      <ArrowRight v-else-if="!selectionMode" :size="14" class="text-muted-foreground" />
    </span>
  </component>
</template>
