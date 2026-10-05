/**
 * MongoDB Atlas — আলাদা কালেকশন:
 *   lawyers / staff / cases / hearings / tasks / documents / notifications / contacts
 *   admins / divisions / courtTypes / courtEntries
 */
import { MongoClient } from 'mongodb'

export const COLLECTIONS = {
  lawyers: 'lawyers',
  staff: 'staff',
  cases: 'cases',
  hearings: 'hearings',
  tasks: 'tasks',
  documents: 'documents',
  notifications: 'notifications',
  contacts: 'contacts',
  admins: 'admins',
  courtTypes: 'courtTypes',
  courtEntries: 'courtEntries',
  divisions: 'divisions',
}

const COLLECTION_KEYS = Object.keys(COLLECTIONS)

let client = null
let dbHandle = null
let connected = false

export function resolveMongoUri() {
  let uri = (process.env.MONGODB_URI || '').trim()
  const password = (process.env.MONGODB_PASSWORD || '').trim()

  if (!uri) return ''

  const placeholder = uri.match(/:(\<[^>]+\>)@/)
  if (placeholder) {
    const raw = placeholder[1].slice(1, -1)
    const pwd = password || raw
    if (!pwd || pwd === 'db_password') {
      console.warn('[MongoDB] URI-তে পাসওয়ার্ড প্লেসহোল্ডার আছে। .env এ সঠিক পাসওয়ার্ড দিন।')
      return ''
    }
    uri = uri.replace(placeholder[1], encodeURIComponent(pwd))
  } else if (uri.includes('<db_password>')) {
    if (!password) {
      console.warn('[MongoDB] MONGODB_PASSWORD সেট করুন।')
      return ''
    }
    uri = uri.replace('<db_password>', encodeURIComponent(password))
  }

  try {
    const u = new URL(uri)
    if (!u.pathname || u.pathname === '/') {
      u.pathname = '/nyaypath'
      uri = u.toString()
    }
  } catch {
    /* keep */
  }

  return uri
}

export function isMongoConnected() {
  return connected
}

export function getDb() {
  return dbHandle
}

export async function connectMongo() {
  const uri = resolveMongoUri()
  if (!uri) {
    connected = false
    return null
  }

  client = new MongoClient(uri, { serverSelectionTimeoutMS: 12000 })
  await client.connect()
  await client.db().command({ ping: 1 })
  dbHandle = client.db()
  connected = true
  console.log(`[MongoDB] Connected → ${dbHandle.databaseName}`)
  return dbHandle
}

function toDoc(item) {
  const id = item.id
  return { ...item, _id: id }
}

function fromDoc(doc) {
  if (!doc) return null
  const { _id, ...rest } = doc
  return { ...rest, id: rest.id || String(_id) }
}

async function ensureIndexes() {
  if (!dbHandle) return
  await dbHandle.collection(COLLECTIONS.lawyers).createIndex({ email: 1 }, { unique: true, sparse: true })
  await dbHandle.collection(COLLECTIONS.staff).createIndex({ email: 1 }, { unique: true, sparse: true })
  await dbHandle.collection(COLLECTIONS.staff).createIndex({ lawyerId: 1 })
  await dbHandle.collection(COLLECTIONS.cases).createIndex({ ownerLawyerId: 1 })
  await dbHandle.collection(COLLECTIONS.cases).createIndex({ caseNumber: 1 })
  await dbHandle.collection(COLLECTIONS.hearings).createIndex({ lawyerId: 1 })
  await dbHandle.collection(COLLECTIONS.hearings).createIndex({ hearingDate: 1 })
  await dbHandle.collection(COLLECTIONS.tasks).createIndex({ lawyerId: 1 })
}

async function replaceCollection(name, items) {
  const col = dbHandle.collection(name)
  const list = Array.isArray(items) ? items : []
  const ids = list.map((i) => i.id).filter(Boolean)

  if (ids.length === 0) {
    await col.deleteMany({})
    return
  }

  // remove deleted rows
  await col.deleteMany({ _id: { $nin: ids } })

  const ops = list
    .filter((i) => i && i.id)
    .map((item) => ({
      replaceOne: {
        filter: { _id: item.id },
        replacement: toDoc(item),
        upsert: true,
      },
    }))

  if (ops.length) await col.bulkWrite(ops, { ordered: false })
}

async function readCollection(name) {
  const rows = await dbHandle.collection(name).find({}).toArray()
  return rows.map(fromDoc)
}

/** Atlas-এ আলাদা কালেকশন থেকে পুরো অ্যাপ স্টেট লোড */
export async function loadStateFromMongo() {
  if (!connected || !dbHandle) return null

  const [
    lawyers,
    staff,
    cases,
    hearings,
    tasks,
    documents,
    notifications,
    contacts,
    admins,
    courtTypes,
    courtEntries,
    divisions,
  ] = await Promise.all([
    readCollection(COLLECTIONS.lawyers),
    readCollection(COLLECTIONS.staff),
    readCollection(COLLECTIONS.cases),
    readCollection(COLLECTIONS.hearings),
    readCollection(COLLECTIONS.tasks),
    readCollection(COLLECTIONS.documents),
    readCollection(COLLECTIONS.notifications),
    readCollection(COLLECTIONS.contacts),
    readCollection(COLLECTIONS.admins),
    readCollection(COLLECTIONS.courtTypes),
    readCollection(COLLECTIONS.courtEntries),
    readCollection(COLLECTIONS.divisions),
  ])

  const hasData =
    lawyers.length > 0 || staff.length > 0 || cases.length > 0 || hearings.length > 0

  if (!hasData) {
    // পুরনো একক app_state ডক থেকে মাইগ্রেট
    const legacy = await dbHandle.collection('app_state').findOne({ _id: 'nyaypath-main' })
    if (legacy) {
      const { _id, updatedAt, ...state } = legacy
      console.log('[MongoDB] Legacy app_state পাওয়া গেছে — আলাদা কালেকশনে মাইগ্রেট করা হচ্ছে…')
      await saveStateToMongo(state)
      await dbHandle.collection('app_state').deleteOne({ _id: 'nyaypath-main' }).catch(() => {})
      return state
    }
    return null
  }

  return {
    lawyers,
    staff,
    cases,
    hearings,
    tasks,
    documents,
    notifications,
    contacts: contacts || [],
    admins: admins || [],
    courtTypes: courtTypes || [],
    courtEntries: courtEntries || [],
    divisions: divisions || [],
  }
}

/** প্রতিটি এন্টিটি আলাদা কালেকশনে সেভ */
export async function saveStateToMongo(state) {
  if (!connected || !dbHandle || !state) return false

  await Promise.all([
    replaceCollection(COLLECTIONS.lawyers, state.lawyers),
    replaceCollection(COLLECTIONS.staff, state.staff),
    replaceCollection(COLLECTIONS.cases, state.cases),
    replaceCollection(COLLECTIONS.hearings, state.hearings),
    replaceCollection(COLLECTIONS.tasks, state.tasks),
    replaceCollection(COLLECTIONS.documents, state.documents),
    replaceCollection(COLLECTIONS.notifications, state.notifications),
    replaceCollection(COLLECTIONS.contacts, state.contacts || []),
    replaceCollection(COLLECTIONS.admins, state.admins || []),
    replaceCollection(COLLECTIONS.courtTypes, state.courtTypes || []),
    replaceCollection(COLLECTIONS.courtEntries, state.courtEntries || []),
    replaceCollection(COLLECTIONS.divisions, state.divisions || []),
  ])

  return true
}

/** শুধু একটা কালেকশন সেভ (দ্রুত আপডেট) */
export async function saveCollectionToMongo(key, items) {
  if (!connected || !dbHandle) return false
  const name = COLLECTIONS[key]
  if (!name) return false
  await replaceCollection(name, items)
  return true
}

export async function getCollectionCounts() {
  if (!connected || !dbHandle) return null
  const counts = {}
  for (const key of COLLECTION_KEYS) {
    counts[key] = await dbHandle.collection(COLLECTIONS[key]).countDocuments()
  }
  return counts
}

export async function prepareCollections() {
  if (!connected || !dbHandle) return
  await ensureIndexes()
  // empty collections দেখা যায় Atlas UI-তে
  for (const name of Object.values(COLLECTIONS)) {
    await dbHandle.collection(name).insertOne({ _id: '__init__', _placeholder: true }).catch(() => {})
    await dbHandle.collection(name).deleteOne({ _id: '__init__' }).catch(() => {})
  }
}

export async function closeMongo() {
  if (client) {
    await client.close().catch(() => {})
    client = null
    dbHandle = null
    connected = false
  }
}
