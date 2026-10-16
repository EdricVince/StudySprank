<template>
  <Teleport to="body">
    <Transition name="search-modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm"
        @click.self="$emit('close')"
        @keydown.escape="$emit('close')"
      >
        <div
          class="bg-card border-border w-full max-w-2xl overflow-hidden rounded-2xl border shadow-2xl"
          @keydown.arrow-up.prevent="moveSelection(-1)"
          @keydown.arrow-down.prevent="moveSelection(1)"
          @keydown.enter.prevent="activateSelected"
        >
          <!-- Search Input -->
          <div class="border-border flex items-center gap-3 border-b px-5 py-4">
            <Search class="text-muted-foreground h-5 w-5 shrink-0" />
            <input
              ref="searchInput"
              v-model="query"
              type="text"
              :placeholder="$t('common.search') + '...'"
              class="text-foreground placeholder:text-muted-foreground flex-1 bg-transparent text-base outline-none"
              @keydown.escape="$emit('close')"
            />
            <span v-if="query" class="text-muted-foreground text-xs">{{ allResults.length }} results</span>
            <kbd class="bg-secondary text-muted-foreground rounded-md px-2 py-1 text-xs font-medium">ESC</kbd>
          </div>

          <!-- Results -->
          <div ref="resultsList" class="max-h-[55vh] overflow-y-auto">

            <!-- Empty state: show quick links + recent -->
            <div v-if="!query" class="p-4">
              <!-- Recent Searches -->
              <div v-if="recentSearches.length > 0" class="mb-5">
                <div class="mb-2 flex items-center justify-between">
                  <h4 class="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Recent</h4>
                  <button class="text-muted-foreground hover:text-foreground text-xs transition-colors" @click="clearRecent">Clear</button>
                </div>
                <div class="space-y-0.5">
                  <button
                    v-for="item in recentSearches"
                    :key="item"
                    class="text-foreground hover:bg-accent flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
                    @click="query = item"
                  >
                    <Clock class="text-muted-foreground h-4 w-4 shrink-0" />
                    {{ item }}
                  </button>
                </div>
              </div>

              <!-- Quick Links -->
              <div>
                <h4 class="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">Quick Links</h4>
                <div class="grid grid-cols-2 gap-1.5">
                  <button
                    v-for="link in quickLinks"
                    :key="link.path"
                    class="hover:bg-accent flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors"
                    @click="navigateTo(link.path)"
                  >
                    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" :class="link.bgClass">
                      <component :is="link.icon" class="h-4 w-4" :class="link.iconClass" />
                    </div>
                    <span class="text-foreground text-sm font-medium">{{ link.label }}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Search Results -->
            <div v-else-if="allResults.length > 0" class="p-2">
              <div v-for="group in groupedResults" :key="group.category" class="mb-1">
                <h4 class="text-muted-foreground px-3 py-1.5 text-xs font-semibold uppercase tracking-wider">{{ group.category }}</h4>
                <button
                  v-for="item in group.items"
                  :key="item.id"
                  :ref="el => { if (el) resultRefs[item.globalIdx] = el as HTMLElement }"
                  class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors"
                  :class="selectedIndex === item.globalIdx ? 'bg-accent' : 'hover:bg-accent/60'"
                  @click="selectResult(item)"
                  @mouseenter="selectedIndex = item.globalIdx"
                >
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" :class="item.bgClass ?? 'bg-primary/10'">
                    <component :is="item.icon" class="h-4 w-4" :class="item.iconClass ?? 'text-primary'" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-foreground truncate text-sm font-medium" v-html="highlight(item.title)" />
                    <p class="text-muted-foreground truncate text-xs">{{ item.description }}</p>
                  </div>
                  <ArrowRight
class="text-muted-foreground h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    :class="selectedIndex === item.globalIdx ? 'opacity-100' : ''" />
                </button>
              </div>
            </div>

            <!-- No Results -->
            <div v-else class="px-5 py-12 text-center">
              <SearchX class="text-muted-foreground mx-auto mb-3 h-10 w-10" />
              <p class="text-foreground font-medium">No results found</p>
              <p class="text-muted-foreground mt-1 text-sm">Try searching for courses, quizzes, or features</p>
            </div>
          </div>

          <!-- Footer -->
          <div class="border-border bg-muted/30 flex items-center justify-between border-t px-5 py-2.5">
            <div class="text-muted-foreground flex items-center gap-4 text-xs">
              <span class="flex items-center gap-1.5">
                <kbd class="bg-secondary rounded px-1.5 py-0.5 font-mono font-medium">↑↓</kbd> Navigate
              </span>
              <span class="flex items-center gap-1.5">
                <kbd class="bg-secondary rounded px-1.5 py-0.5 font-mono font-medium">↵</kbd> Open
              </span>
              <span class="flex items-center gap-1.5">
                <kbd class="bg-secondary rounded px-1.5 py-0.5 font-mono font-medium">Esc</kbd> Close
              </span>
            </div>
            <span class="text-muted-foreground text-xs">StudySpark Search</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, type Component } from 'vue'
import { useRouter } from 'vue-router'
import {
  Search, Clock, ArrowRight, SearchX,
  BookOpen, Layers, Gamepad2, Target, Trophy, BarChart3,
  GraduationCap, Headphones, Languages, PenTool, MessageCircle,
  FileText, Calendar, Video, Radio, LayoutDashboard, Settings, User,
} from '@/components/icons'

interface SearchResult {
  id: string
  title: string
  description: string
  category: string
  icon: Component
  path: string
  bgClass?: string
  iconClass?: string
  globalIdx: number
}

interface QuickLink {
  label: string
  icon: Component
  path: string
  bgClass: string
  iconClass: string
}

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ close: [] }>()

const router = useRouter()
const query = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const selectedIndex = ref(0)
const resultRefs = ref<Record<number, HTMLElement>>({})

// Persist recent searches in localStorage
const STORAGE_KEY = 'studyspark-recent-searches'
const recentSearches = ref<string[]>(
  (() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] } })()
)
function saveRecent() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recentSearches.value))
}

const quickLinks: QuickLink[] = [
  { label: 'Dashboard',     icon: LayoutDashboard, path: '/dashboard',      bgClass: 'bg-primary/10',      iconClass: 'text-primary' },
  { label: 'My Courses',    icon: BookOpen,         path: '/courses',        bgClass: 'bg-blue-500/10',     iconClass: 'text-blue-500' },
  { label: 'Flashcards',    icon: Layers,           path: '/flashcards',     bgClass: 'bg-violet-500/10',   iconClass: 'text-violet-500' },
  { label: 'Quizzes',       icon: Gamepad2,         path: '/quizzes',        bgClass: 'bg-orange-500/10',   iconClass: 'text-orange-500' },
  { label: 'Entrance Exam', icon: FileText,         path: '/entrance-exam',  bgClass: 'bg-indigo-500/10',   iconClass: 'text-indigo-500' },
  { label: 'AI Study Plan', icon: Calendar,         path: '/schedule',       bgClass: 'bg-green-500/10',    iconClass: 'text-green-500' },
  { label: 'Achievements',  icon: Trophy,           path: '/achievements',   bgClass: 'bg-amber-500/10',    iconClass: 'text-amber-500' },
  { label: 'Goals',         icon: Target,           path: '/goals',          bgClass: 'bg-red-500/10',      iconClass: 'text-red-500' },
]

const rawItems = [
  // Navigation pages
  { id: 'n1',  title: 'Dashboard',         description: 'Your learning overview and stats',             category: 'Pages',    icon: LayoutDashboard, path: '/dashboard',                bgClass: 'bg-primary/10',    iconClass: 'text-primary' },
  { id: 'n2',  title: 'My Courses',        description: 'All your enrolled courses',                    category: 'Pages',    icon: BookOpen,        path: '/courses',                  bgClass: 'bg-blue-500/10',   iconClass: 'text-blue-500' },
  { id: 'n3',  title: 'Flashcards',        description: 'Create and study vocabulary cards',            category: 'Pages',    icon: Layers,          path: '/flashcards',               bgClass: 'bg-violet-500/10', iconClass: 'text-violet-500' },
  { id: 'n4',  title: 'Quizzes',           description: 'Interactive quiz games',                       category: 'Pages',    icon: Gamepad2,        path: '/quizzes',                  bgClass: 'bg-orange-500/10', iconClass: 'text-orange-500' },
  { id: 'n5',  title: 'Goals',             description: 'Set and track learning objectives',            category: 'Pages',    icon: Target,          path: '/goals',                    bgClass: 'bg-red-500/10',    iconClass: 'text-red-500' },
  { id: 'n6',  title: 'Achievements',      description: 'Your earned badges and milestones',            category: 'Pages',    icon: Trophy,          path: '/achievements',             bgClass: 'bg-amber-500/10',  iconClass: 'text-amber-500' },
  { id: 'n7',  title: 'Statistics',        description: 'Detailed learning progress charts',            category: 'Pages',    icon: BarChart3,       path: '/statistics',               bgClass: 'bg-cyan-500/10',   iconClass: 'text-cyan-500' },
  { id: 'n8',  title: 'Classroom',         description: 'Online classes with your teacher',             category: 'Pages',    icon: Video,           path: '/classroom',                bgClass: 'bg-pink-500/10',   iconClass: 'text-pink-500' },
  { id: 'n9',  title: 'Live Lesson',       description: 'Join or host real-time teacher-led lessons',   category: 'Pages',    icon: Radio,           path: '/live-quiz',                bgClass: 'bg-rose-500/10',   iconClass: 'text-rose-500' },
  { id: 'n10', title: 'Entrance Exam',     description: 'IELTS & TOEIC proficiency assessment',         category: 'Pages',    icon: FileText,        path: '/entrance-exam',            bgClass: 'bg-indigo-500/10', iconClass: 'text-indigo-500' },
  { id: 'n11', title: 'AI Study Plan',     description: 'Personalized AI-generated study schedule',    category: 'Pages',    icon: Calendar,        path: '/schedule',                 bgClass: 'bg-green-500/10',  iconClass: 'text-green-500' },
  { id: 'n12', title: 'Settings',          description: 'Account and app preferences',                  category: 'Pages',    icon: Settings,        path: '/settings',                 bgClass: 'bg-muted',         iconClass: 'text-muted-foreground' },
  { id: 'n13', title: 'Profile',           description: 'View and edit your profile',                   category: 'Pages',    icon: User,            path: '/profile',                  bgClass: 'bg-muted',         iconClass: 'text-muted-foreground' },
  // Courses
  { id: 'c1',  title: 'English Grammar Basics',     description: 'Fundamental English grammar rules',  category: 'Courses',  icon: GraduationCap,   path: '/courses/1',                bgClass: 'bg-blue-500/10',   iconClass: 'text-blue-500' },
  { id: 'c2',  title: 'English Vocabulary Builder', description: 'Expand your English vocabulary',     category: 'Courses',  icon: Languages,       path: '/courses/2',                bgClass: 'bg-blue-500/10',   iconClass: 'text-blue-500' },
  { id: 'c3',  title: 'IELTS Preparation',          description: 'Prepare for the IELTS exam',        category: 'Courses',  icon: BookOpen,        path: '/courses/3',                bgClass: 'bg-blue-500/10',   iconClass: 'text-blue-500' },
  { id: 'c4',  title: 'Business English',           description: 'English for professional settings', category: 'Courses',  icon: PenTool,         path: '/courses/4',                bgClass: 'bg-blue-500/10',   iconClass: 'text-blue-500' },
  { id: 'c5',  title: 'Listening Practice',         description: 'Improve English listening skills',  category: 'Courses',  icon: Headphones,      path: '/courses/5',                bgClass: 'bg-blue-500/10',   iconClass: 'text-blue-500' },
  // Flashcard decks
  { id: 'f1',  title: 'Essential Vocabulary',  description: '500 most common English words',           category: 'Flashcards',icon: Layers,          path: '/flashcards/1',             bgClass: 'bg-violet-500/10', iconClass: 'text-violet-500' },
  { id: 'f2',  title: 'English Idioms',        description: 'Common idioms and expressions',           category: 'Flashcards',icon: MessageCircle,   path: '/flashcards/2',             bgClass: 'bg-violet-500/10', iconClass: 'text-violet-500' },
  { id: 'f3',  title: 'Phrasal Verbs',         description: 'Essential English phrasal verbs',         category: 'Flashcards',icon: Layers,          path: '/flashcards/3',             bgClass: 'bg-violet-500/10', iconClass: 'text-violet-500' },
  // Quizzes
  { id: 'q1',  title: 'Multiple Choice Quiz',  description: 'Test grammar and vocabulary',             category: 'Quizzes',  icon: Gamepad2,        path: '/quizzes/multiple-choice',  bgClass: 'bg-orange-500/10', iconClass: 'text-orange-500' },
  { id: 'q2',  title: 'Word Scramble',         description: 'Unscramble English words',                category: 'Quizzes',  icon: Gamepad2,        path: '/quizzes/word-scramble',    bgClass: 'bg-orange-500/10', iconClass: 'text-orange-500' },
  { id: 'q3',  title: 'Speed Round',           description: 'Quick English quiz challenge',            category: 'Quizzes',  icon: Gamepad2,        path: '/quizzes/speed-round',      bgClass: 'bg-orange-500/10', iconClass: 'text-orange-500' },
  { id: 'q4',  title: 'Matching Pairs',        description: 'Match words with definitions',            category: 'Quizzes',  icon: Gamepad2,        path: '/quizzes/matching-pairs',   bgClass: 'bg-orange-500/10', iconClass: 'text-orange-500' },
  { id: 'q5',  title: 'True or False',         description: 'Decide if statements are correct',        category: 'Quizzes',  icon: Gamepad2,        path: '/quizzes/true-false',       bgClass: 'bg-orange-500/10', iconClass: 'text-orange-500' },
  // Exams
  { id: 'e1',  title: 'IELTS Academic Exam',   description: 'Cambridge standard assessment',           category: 'Exam & Schedule', icon: FileText, path: '/entrance-exam',           bgClass: 'bg-indigo-500/10', iconClass: 'text-indigo-500' },
  { id: 'e2',  title: 'TOEIC Exam',            description: 'ETS standard business English',           category: 'Exam & Schedule', icon: FileText, path: '/entrance-exam',           bgClass: 'bg-indigo-500/10', iconClass: 'text-indigo-500' },
  { id: 'e3',  title: 'AI Study Schedule',     description: 'Generate a personalized study plan',      category: 'Exam & Schedule', icon: Calendar, path: '/schedule',               bgClass: 'bg-green-500/10',  iconClass: 'text-green-500' },
]

const allResults = computed<SearchResult[]>(() => {
  if (!query.value.trim()) return []
  const q = query.value.toLowerCase()
  return rawItems
    .filter(i => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.category.toLowerCase().includes(q))
    .map((item, idx) => ({ ...item, globalIdx: idx }))
})

const groupedResults = computed(() => {
  const groups: Record<string, SearchResult[]> = {}
  allResults.value.forEach(item => {
    if (!groups[item.category]) groups[item.category] = []
    groups[item.category]!.push(item)
  })
  return Object.entries(groups).map(([category, items]) => ({ category, items }))
})

function highlight(text: string): string {
  if (!query.value.trim()) return text
  const escaped = query.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="bg-primary/20 text-primary rounded px-0.5">$1</mark>')
}

function moveSelection(dir: number) {
  const max = allResults.value.length - 1
  if (max < 0) return
  selectedIndex.value = Math.max(0, Math.min(max, selectedIndex.value + dir))
  nextTick(() => resultRefs.value[selectedIndex.value]?.scrollIntoView({ block: 'nearest' }))
}

function activateSelected() {
  const item = allResults.value[selectedIndex.value]
  if (item) selectResult(item)
}

function selectResult(item: SearchResult) {
  const q = query.value.trim()
  if (q && !recentSearches.value.includes(q)) {
    recentSearches.value.unshift(q)
    if (recentSearches.value.length > 6) recentSearches.value.pop()
    saveRecent()
  }
  router.push(item.path)
  emit('close')
  query.value = ''
}

function navigateTo(path: string) {
  router.push(path)
  emit('close')
  query.value = ''
}

function clearRecent() {
  recentSearches.value = []
  saveRecent()
}

watch(() => props.show, (val) => {
  if (val) {
    selectedIndex.value = 0
    nextTick(() => searchInput.value?.focus())
  } else {
    query.value = ''
  }
})

watch(query, () => { selectedIndex.value = 0 })
</script>

<style scoped>
.search-modal-enter-active,
.search-modal-leave-active {
  transition: all 0.2s ease;
}
.search-modal-enter-from,
.search-modal-leave-to {
  opacity: 0;
}
.search-modal-enter-from > div,
.search-modal-leave-to > div {
  transform: scale(0.96) translateY(-16px);
}
</style>
