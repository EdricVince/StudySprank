import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import DeleteAccountModal from './DeleteAccountModal.vue'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en: {} }, missingWarn: false, fallbackWarn: false })
const mountModal = (props: Record<string, unknown> = {}) =>
  mount(DeleteAccountModal, {
    props: { show: true, ...props },
    global: { plugins: [i18n], stubs: { Teleport: true, Transition: false } },
  })

describe('DeleteAccountModal', () => {
  it('needs both the word DELETE and the password before it can confirm', async () => {
    const w = mountModal()
    const confirm = w.find('[data-test="delete-confirm"]')
    expect(confirm.attributes('disabled')).toBeDefined()

    await w.find('[data-test="delete-confirm-text"]').setValue('DELETE')
    expect(confirm.attributes('disabled')).toBeDefined() // still no password

    await w.find('[data-test="delete-password"]').setValue('my-password')
    expect(confirm.attributes('disabled')).toBeUndefined()
  })

  it('sends the password with the confirmation', async () => {
    const w = mountModal()
    await w.find('[data-test="delete-confirm-text"]').setValue('DELETE')
    await w.find('[data-test="delete-password"]').setValue('my-password')
    await w.find('[data-test="delete-confirm"]').trigger('click')
    expect(w.emitted('confirm')![0]).toEqual(['my-password'])
  })

  it('does not confirm while the request is running and shows why a try failed', async () => {
    const w = mountModal({ busy: true, error: 'The password is incorrect.' })
    await w.find('[data-test="delete-confirm-text"]').setValue('DELETE')
    await w.find('[data-test="delete-password"]').setValue('x')
    expect(w.find('[data-test="delete-confirm"]').attributes('disabled')).toBeDefined()
    expect(w.find('[data-test="delete-error"]').text()).toBe('The password is incorrect.')
  })

  it('forgets what was typed when it is closed', async () => {
    const w = mountModal()
    await w.find('[data-test="delete-password"]').setValue('secret')
    await w.setProps({ show: false })
    await w.setProps({ show: true })
    expect((w.find('[data-test="delete-password"]').element as HTMLInputElement).value).toBe('')
  })
})
