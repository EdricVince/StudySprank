import { ref } from 'vue'
import { api } from '@/utils/api'
import type { Class } from '@/types/class'

/**
 * The signed-in teacher's classes, shared between the sidebar ("My classes") and the pages that
 * edit them, so a class created on the Classes page shows up in the sidebar straight away.
 */
const teacherClasses = ref<Class[]>([])

export function useTeacherClasses() {
  async function refreshTeacherClasses() {
    try {
      teacherClasses.value = (await api.getClasses()) as Class[]
    } catch {
      /* the sidebar list is a shortcut only; the pages report their own load errors */
    }
  }

  /** Pages that already hold the fresh list hand it over instead of fetching it twice. */
  function setTeacherClasses(list: Class[]) {
    teacherClasses.value = list
  }

  return { teacherClasses, refreshTeacherClasses, setTeacherClasses }
}
