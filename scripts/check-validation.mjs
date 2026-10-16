// Validation rules shared by client and (later) server. Plain assertions, no test framework.
import assert from 'node:assert/strict'
import {
  LIMITS, normalizeContact, validateCollab, validateContact, validateIdeaStep1, validateIdeaStep2, validateJoin,
} from '../src/shared/validation.ts'

const contact = (over = {}) => ({ name: '', method: 'email', contact: 'a@b.kz', consent: true, ...over })
let n = 0
const check = (name, fn) => { fn(); n++; console.log('PASS', name) }

check('problem: required / short / ok / long', () => {
  assert.equal(validateIdeaStep1({ problem: '', beneficiary: '' }).problem, 'required')
  assert.equal(validateIdeaStep1({ problem: '   ', beneficiary: '' }).problem, 'required')
  assert.equal(validateIdeaStep1({ problem: 'коротко', beneficiary: '' }).problem, 'tooShort')
  assert.deepEqual(validateIdeaStep1({ problem: 'x'.repeat(LIMITS.problemMin), beneficiary: '' }), {})
  assert.equal(validateIdeaStep1({ problem: 'x'.repeat(LIMITS.problemMax + 1), beneficiary: '' }).problem, 'tooLong')
})
check('beneficiary max 200', () => {
  assert.equal(validateIdeaStep1({ problem: 'x'.repeat(20), beneficiary: 'y'.repeat(201) }).beneficiary, 'tooLong')
})
check('solution max 1800, skipped when only the problem', () => {
  assert.equal(validateIdeaStep2({ solution: 'x'.repeat(1801), onlyProblem: false }).solution, 'tooLong')
  assert.deepEqual(validateIdeaStep2({ solution: 'x'.repeat(5000), onlyProblem: true }), {})
})
check('email', () => {
  assert.equal(validateContact(contact({ contact: 'nope' })).contact, 'invalidEmail')
  assert.equal(validateContact(contact({ contact: 'a@b' })).contact, 'invalidEmail')
  assert.deepEqual(validateContact(contact({ contact: ' student@kaznu.edu.kz ' })), {})
})
check('telegram', () => {
  assert.equal(validateContact(contact({ method: 'telegram', contact: '@ab' })).contact, 'invalidTelegram')
  assert.equal(validateContact(contact({ method: 'telegram', contact: '@1abcde' })).contact, 'invalidTelegram')
  assert.deepEqual(validateContact(contact({ method: 'telegram', contact: '@kaznu_enact' })), {})
  assert.equal(normalizeContact('telegram', ' @kaznu_enact '), 'kaznu_enact')
})
check('instagram', () => {
  assert.equal(validateContact(contact({ method: 'instagram', contact: 'bad name' })).contact, 'invalidInstagram')
  assert.deepEqual(validateContact(contact({ method: 'instagram', contact: '@kaznu_enact.us' })), {})
})
check('contact is required and checked against the SELECTED method only', () => {
  assert.equal(validateContact(contact({ contact: '' })).contact, 'required')
  assert.equal(validateContact(contact({ method: 'instagram', contact: 'a@b.kz' })).contact, 'invalidInstagram')
})
check('consent required; name max 80', () => {
  assert.equal(validateContact(contact({ consent: false })).consent, 'consentRequired')
  assert.equal(validateContact(contact({ name: 'n'.repeat(81) })).name, 'tooLong')
})
check('join: message max, contact rules reused', () => {
  assert.equal(validateJoin({ ...contact(), skills: [], message: 'm'.repeat(LIMITS.messageMax + 1) }).message, 'tooLong')
  assert.deepEqual(validateJoin({ ...contact(), skills: ['design'], message: '' }), {})
})
check('collab: organization and proposal required', () => {
  const e = validateCollab({ ...contact(), organization: '', proposal: '' })
  assert.equal(e.organization, 'required')
  assert.equal(e.proposal, 'required')
  assert.deepEqual(validateCollab({ ...contact(), organization: 'KazNU Lab', proposal: 'Давайте вместе сделать проект' }), {})
})
console.log(`\n${n} validation groups passed`)
