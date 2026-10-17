import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FlashcardCardModal from './FlashcardCardModal.vue'

// Regression: the immediate `card` watcher called resetForm before it was defined,
// which crashed setup and left the whole deck page blank.
describe('FlashcardCardModal', () => {
  it('mounts without a card (create mode)', () => {
    expect(() => mount(FlashcardCardModal, { props: { modelValue: false, card: null } })).not.toThrow()
  })

  it('mounts with a card (edit mode)', () => {
    const card = { id: 1, term: 'apple', definition: 'quả táo', isFavorite: false, status: 'New' as const }
    expect(() => mount(FlashcardCardModal, { props: { modelValue: false, card } })).not.toThrow()
  })
})
