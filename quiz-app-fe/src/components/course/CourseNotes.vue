<template>
  <div class="bg-card border-border rounded-2xl border">
    <!-- Header -->
    <div class="border-border flex items-center justify-between border-b p-4">
      <div class="flex items-center gap-3">
        <div class="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-xl">
          <StickyNote class="text-primary h-5 w-5" />
        </div>
        <div>
          <h3 class="text-foreground font-semibold">My Notes</h3>
          <p class="text-muted-foreground text-sm">{{ notes.length }} notes</p>
        </div>
      </div>
      <Button size="sm" @click="addNote">
        <Plus class="mr-1 h-4 w-4" />
        Add Note
      </Button>
    </div>

    <!-- Notes List -->
    <div class="divide-border divide-y">
      <div
        v-for="note in notes"
        :key="note.id"
        class="group p-4 transition-colors hover:bg-accent/30"
      >
        <div v-if="editingId !== note.id">
          <!-- View Mode -->
          <div class="mb-2 flex items-start justify-between">
            <div class="flex items-center gap-2">
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="getLessonTagClass(note.lessonId)"
              >
                Lesson {{ note.lessonId }}
              </span>
              <span class="text-muted-foreground text-xs">{{ formatDate(note.createdAt) }}</span>
            </div>
            <div class="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                class="text-muted-foreground hover:text-foreground rounded p-1 transition-colors hover:bg-accent"
                @click="startEdit(note)"
              >
                <Pencil class="h-4 w-4" />
              </button>
              <button
                class="text-muted-foreground rounded p-1 transition-colors hover:bg-destructive/10 hover:text-destructive"
                @click="deleteNote(note.id)"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </div>
          <p class="text-foreground whitespace-pre-wrap text-sm">{{ note.content }}</p>
          <div v-if="note.highlight" class="mt-2">
            <div class="border-primary/30 bg-primary/5 border-l-2 pl-3">
              <p class="text-muted-foreground text-xs italic">"{{ note.highlight }}"</p>
            </div>
          </div>
        </div>

        <!-- Edit Mode -->
        <div v-else>
          <textarea
            ref="editTextareaRef"
            v-model="editContent"
            class="border-border bg-background text-foreground placeholder:text-muted-foreground w-full resize-none rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            rows="3"
            placeholder="Write your note..."
          ></textarea>
          <div class="mt-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" @click="cancelEdit">
              Cancel
            </Button>
            <Button size="sm" @click="saveEdit(note.id)">
              Save
            </Button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="notes.length === 0" class="p-8 text-center">
        <div class="bg-secondary mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <StickyNote class="text-muted-foreground h-8 w-8" />
        </div>
        <h4 class="text-foreground mb-2 font-medium">No notes yet</h4>
        <p class="text-muted-foreground mb-4 text-sm">
          Start taking notes to remember key concepts from this course.
        </p>
        <Button size="sm" @click="addNote">
          <Plus class="mr-1 h-4 w-4" />
          Add Your First Note
        </Button>
      </div>
    </div>

    <!-- New Note Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showNewNote"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showNewNote = false"></div>
          <div class="bg-card border-border relative w-full max-w-lg rounded-2xl border p-6 shadow-xl">
            <h3 class="text-foreground mb-4 text-lg font-semibold">Add New Note</h3>

            <!-- Lesson Select -->
            <div class="mb-4">
              <label class="text-foreground mb-2 block text-sm font-medium">Lesson</label>
              <select
                v-model="newNote.lessonId"
                class="border-border bg-background text-foreground w-full rounded-lg border p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option v-for="lesson in lessons" :key="lesson.id" :value="lesson.id">
                  Lesson {{ lesson.id }}: {{ lesson.title }}
                </option>
              </select>
            </div>

            <!-- Note Content -->
            <div class="mb-4">
              <label class="text-foreground mb-2 block text-sm font-medium">Note</label>
              <textarea
                v-model="newNote.content"
                class="border-border bg-background text-foreground placeholder:text-muted-foreground w-full resize-none rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                rows="4"
                placeholder="Write your note here..."
              ></textarea>
            </div>

            <!-- Highlight (optional) -->
            <div class="mb-6">
              <label class="text-foreground mb-2 block text-sm font-medium">
                Highlighted Text <span class="text-muted-foreground">(optional)</span>
              </label>
              <input
                v-model="newNote.highlight"
                type="text"
                class="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-lg border p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Copy any text you want to highlight..."
              />
            </div>

            <!-- Actions -->
            <div class="flex justify-end gap-3">
              <Button variant="outline" @click="showNewNote = false">Cancel</Button>
              <Button :disabled="!newNote.content.trim()" @click="saveNewNote">
                Save Note
              </Button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { StickyNote, Plus, Pencil, Trash2 } from '@/components/icons'
import Button from '@/components/ui/button/Button.vue'
import { useToast } from '@/composables/useToast'

interface Note {
  id: number
  lessonId: number
  content: string
  highlight?: string
  createdAt: Date
}

interface Lesson {
  id: number
  title: string
}

interface Props {
  courseId: number | string
  lessons?: Lesson[]
}

withDefaults(defineProps<Props>(), {
  lessons: () => [
    { id: 1, title: 'Introduction to the Course' },
    { id: 2, title: 'Getting Started' },
    { id: 3, title: 'Core Concepts' },
    { id: 4, title: 'Working with Data' },
    { id: 5, title: 'Advanced Techniques' },
  ],
})

const toast = useToast()
const showNewNote = ref(false)
const editingId = ref<number | null>(null)
const editContent = ref('')

const newNote = reactive({
  lessonId: 1,
  content: '',
  highlight: '',
})

// Mock notes data
const notes = ref<Note[]>([
  {
    id: 1,
    lessonId: 1,
    content: 'Remember to practice the basic concepts before moving on. The foundation is crucial for understanding advanced topics.',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 2,
    lessonId: 3,
    content: 'Key takeaway: Always use proper naming conventions and follow the best practices mentioned in this lesson.',
    highlight: 'naming conventions are the foundation of readable code',
    createdAt: new Date('2024-01-18'),
  },
])

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const getLessonTagClass = (lessonId: number) => {
  const colors = [
    'bg-chart-1/10 text-chart-1',
    'bg-chart-2/10 text-chart-2',
    'bg-chart-3/10 text-chart-3',
    'bg-chart-4/10 text-chart-4',
    'bg-chart-5/10 text-chart-5',
  ]
  return colors[(lessonId - 1) % colors.length]
}

const addNote = () => {
  newNote.lessonId = 1
  newNote.content = ''
  newNote.highlight = ''
  showNewNote.value = true
}

const saveNewNote = () => {
  if (!newNote.content.trim()) return

  notes.value.unshift({
    id: Date.now(),
    lessonId: newNote.lessonId,
    content: newNote.content.trim(),
    highlight: newNote.highlight.trim() || undefined,
    createdAt: new Date(),
  })

  showNewNote.value = false
  toast.success('Note saved!')
}

const startEdit = (note: Note) => {
  editingId.value = note.id
  editContent.value = note.content
}

const cancelEdit = () => {
  editingId.value = null
  editContent.value = ''
}

const saveEdit = (noteId: number) => {
  const note = notes.value.find(n => n.id === noteId)
  if (note && editContent.value.trim()) {
    note.content = editContent.value.trim()
    toast.success('Note updated!')
  }
  cancelEdit()
}

const deleteNote = (noteId: number) => {
  notes.value = notes.value.filter(n => n.id !== noteId)
  toast.success('Note deleted!')
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
