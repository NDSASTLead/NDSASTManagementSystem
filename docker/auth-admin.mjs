#!/usr/bin/env node

// Local development helper for managing Supabase Auth users.
// Reads service credentials from docker/supabase/.env and never prints them.

import { readFile } from 'node:fs/promises'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { createClient } from '@supabase/supabase-js'

const envFile = new URL('./supabase/.env', import.meta.url)
let rl = createInterface({ input: stdin, output: stdout })

function parseEnv(contents) {
  const values = {}
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (!match) continue
    let value = match[2]
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    } else {
      value = value.replace(/\s+#.*$/, '')
    }
    values[match[1]] = value
  }
  return values
}

function question(prompt) {
  return rl.question(prompt)
}

async function secret(prompt) {
  rl.close()
  stdout.write(prompt)
  stdin.setRawMode?.(true)
  stdin.resume()
  let value = ''
  value = await new Promise((resolve, reject) => {
    const onData = (chunk) => {
      const key = chunk.toString()
      if (key === '\u0003') {
        cleanup()
        reject(new Error('Cancelled.'))
      } else if (key === '\r' || key === '\n') {
        cleanup()
        stdout.write('\n')
        resolve(value)
      } else if (key === '\u007f' || key === '\b') {
        value = value.slice(0, -1)
      } else if (key >= ' ') {
        value += key
      }
    }
    const cleanup = () => {
      stdin.off('data', onData)
      stdin.setRawMode?.(false)
      stdin.pause()
    }
    stdin.on('data', onData)
  })
  rl = createInterface({ input: stdin, output: stdout })
  return value
}

async function findUserIdByEmail(admin, email) {
  const perPage = 200
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.listUsers({ page, perPage })
    if (error) throw error
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase())
    if (user) return user.id
    if (data.users.length < perPage) return null
  }
}

async function main() {
  const contents = await readFile(envFile, 'utf8').catch(() => {
    throw new Error('Missing docker/supabase/.env. Start the local Docker setup first.')
  })
  const env = parseEnv(contents)
  const url = process.env.SUPABASE_INTERNAL_URL || env.SUPABASE_PUBLIC_URL
  const serviceKey = env.SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Supabase URL or SERVICE_ROLE_KEY is missing from docker/supabase/.env.')

  const client = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  try {
    stdout.write('NDSAST local Supabase user administration\n')
    stdout.write('1) Set/reset a user password\n2) Create a user\n')
    const action = (await question('Choose 1 or 2: ')).trim()
    if (action !== '1' && action !== '2') throw new Error('Choose 1 or 2.')

    const email = (await question('User email: ')).trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.')

    if (action === '1') {
      const userId = await findUserIdByEmail(client.auth.admin, email)
      if (!userId) throw new Error(`No Auth user found for ${email}.`)
      const password = await secret('New password (8+ characters, hidden): ')
      if (password.length < 8) throw new Error('Use a password with at least 8 characters.')
      const confirm = await secret('Confirm new password (hidden): ')
      if (password !== confirm) throw new Error('Passwords do not match.')
      const { error } = await client.auth.admin.updateUserById(userId, { password })
      if (error) throw error
      stdout.write(`Password updated for ${email}.\n`)
      return
    }

    const fullName = (await question('Full name: ')).trim()
    if (!fullName) throw new Error('Full name is required.')
    const role = (await question('Role (volunteer/owner/ast_lead/trustee) [volunteer]: ')).trim() || 'volunteer'
    if (!['volunteer', 'owner', 'ast_lead', 'trustee'].includes(role)) {
      throw new Error('Role must be volunteer, owner, ast_lead, or trustee.')
    }
    const password = await secret('Temporary password (8+ characters, hidden): ')
    if (password.length < 8) throw new Error('Use a password with at least 8 characters.')
    const confirm = await secret('Confirm temporary password (hidden): ')
    if (password !== confirm) throw new Error('Passwords do not match.')

    const { data, error } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    })
    if (error) throw error
    stdout.write(`Created ${email} (${role}); the app profile was created by the database trigger.\n`)
    if (data.user) stdout.write(`User ID: ${data.user.id}\n`)
  } finally {
    rl.close()
  }
}

main().catch((error) => {
  stdout.write(`Error: ${error.message}\n`)
  process.exitCode = 1
})
