<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="close"
        ></div>

        <!-- Modal -->
        <div class="bg-card border-border relative w-full max-w-lg rounded-2xl border p-6 shadow-xl">
          <!-- Header -->
          <div class="mb-6 flex items-center justify-between">
            <h2 class="text-foreground text-xl font-semibold">
              {{ isEditing ? 'Edit Class' : 'Create New Class' }}
            </h2>
            <button
              class="text-muted-foreground hover:text-foreground transition-colors"
              @click="close"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <!-- Form -->
          <form class="space-y-5" @submit.prevent="handleSubmit">
            <!-- Class Name -->
            <div>
              <label class="text-foreground mb-2 block text-sm font-medium">
                Class Name <span class="text-destructive">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                placeholder="e.g., Business English 101"
                required
                class="bg-secondary text-foreground placeholder:text-muted-foreground h-12 w-full rounded-xl border-0 px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <!-- Description -->
            <div>
              <label class="text-foreground mb-2 block text-sm font-medium">
                Description
              </label>
              <textarea
                v-model="form.description"
                rows="3"
                placeholder="Brief description of the class..."
                class="bg-secondary text-foreground placeholder:text-muted-foreground w-full resize-none rounded-xl border-0 p-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
              ></textarea>
            </div>

            <!-- Subject -->
            <div>
              <label class="text-foreground mb-2 block text-sm font-medium">
                Subject
              </label>
              <select
                v-model="form.subject"
                class="bg-secondary text-foreground h-12 w-full rounded-xl border-0 px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select a subject</option>
                <option v-for="subject in subjects" :key="subject" :value="subject">
                  {{ subject }}
                </option>
              </select>
            </div>

            <!-- Student Limit -->
            <div>
              <label class="text-foreground mb-2 block text-sm font-medium">
                Student Limit <span class="text-destructive">*</span>
              </label>
              <input
                v-model.number="form.student_limit"
                type="number"
                min="1"
                max="50"
                placeholder="15-20 recommended"
                required
                class="bg-secondary text-foreground placeholder:text-muted-foreground h-12 w-full rounded-xl border-0 px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p class="text-muted-foreground mt-1 text-xs">Recommended: 15-20 students per class</p>
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-2">
              <Button type="button" variant="outline" class="flex-1" @click="close">
                Cancel
              </Button>
              <Button type="submit" class="flex-1">
                {{ isEditing ? 'Save Changes' : 'Create Class' }}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { X } from '@/components/icons'
import Button from '@/components/ui/button/Button.vue'
import { CLASS_SUBJECTS, type Class, type CreateClassDto } from '@/types/class'

interface Props {
  show: boolean
  classData?: Class | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  save: [data: CreateClassDto]
}>()

const subjects = CLASS_SUBJECTS

const form = ref<CreateClassDto>({
  name: '',
  description: '',
  subject: '',
  student_limit: 20,
})

const isEditing = computed(() => !!props.classData)

// Watch for classData changes to populate form
watch(
  () => props.classData,
  (newData) => {
    if (newData) {
      form.value = {
        name: newData.name,
        description: newData.description || '',
        subject: newData.subject || '',
        student_limit: newData.student_limit,
      }
    } else {
      form.value = {
        name: '',
        description: '',
        subject: '',
        student_limit: 20,
      }
    }
  },
  { immediate: true }
)

const close = () => {
  emit('close')
}

const handleSubmit = () => {
  if (!form.value.name.trim()) return
  emit('save', { ...form.value })
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

.modal-enter-from > div:last-child,
.modal-leave-to > div:last-child {
  transform: scale(0.95);
}
</style>
