import { supabase, assertSupabase } from './supabase/client'

export type Profile = {
  id: string
  name: string
  photoPath: string | null
  photoUrl?: string | null
  dob: string | null
  city: string
  bio: string
  intent: string
  preference: string
  ageMin: number
  ageMax: number
  theme: 'light' | 'dark'
  starColor: string
  incognito: boolean
  profileComplete: boolean
  eligibility: 'pending' | 'eligible' | 'ineligible'
  verificationStatus: string
  relationshipState: string
  partnerId: string | null
  interests: string[]
}

export type DiscoverProfile = {
  id: string
  name: string
  age: number
  photoPath: string | null
  photoUrl?: string | null
  interests: string[]
}

export async function getSession() {
  const client = assertSupabase()
  return client.auth.getSession()
}

export async function signUp(email: string, password: string) {
  const client = assertSupabase()
  return client.auth.signUp({ email, password })
}

export async function signIn(email: string, password: string) {
  const client = assertSupabase()
  return client.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  const client = assertSupabase()
  await client.auth.signOut()
}

export async function getMyProfile(): Promise<Profile | null> {
  const client = assertSupabase()
  const { data, error } = await client.from('profiles').select('*').single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  const { data: interests, error: interestError } = await client.from('profile_interests').select('interest')
  if (interestError) throw interestError
  return {
    id: data.id,
    name: data.name,
    photoPath: data.profile_photo_path,
    dob: data.date_of_birth,
    city: data.city,
    bio: data.bio,
    intent: data.intent,
    preference: data.preference,
    ageMin: data.age_min,
    ageMax: data.age_max,
    theme: data.theme,
    starColor: data.star_color,
    incognito: data.incognito,
    profileComplete: data.profile_complete,
    eligibility: data.eligibility,
    verificationStatus: data.verification_status,
    relationshipState: data.relationship_state,
    partnerId: data.partner_id,
    interests: (interests ?? []).map((x) => x.interest),
  }
}

export async function saveProfile(input: Omit<Profile, 'id' | 'photoUrl' | 'eligibility' | 'verificationStatus' | 'relationshipState' | 'partnerId' | 'interests' | 'profileComplete'> & { interests: string[]; complete: boolean }) {
  const client = assertSupabase()
  const { data, error } = await client.rpc('save_profile', {
    p_name: input.name,
    p_photo_path: input.photoPath,
    p_dob: input.dob,
    p_city: input.city,
    p_bio: input.bio,
    p_intent: input.intent,
    p_preference: input.preference,
    p_age_min: input.ageMin,
    p_age_max: input.ageMax,
    p_theme: input.theme,
    p_star_color: input.starColor,
    p_incognito: input.incognito,
    p_interests: input.interests,
    p_complete: input.complete,
  })
  if (error) throw error
  return data as Profile
}

export async function uploadProfilePhoto(file: File) {
  const client = assertSupabase()
  const { data: userData } = await client.auth.getUser()
  if (!userData.user) throw new Error('Authentication required')
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userData.user.id}/avatar.${extension}`
  const { error } = await client.storage.from('profile-photos').upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/jpeg',
  })
  if (error) throw error
  return path
}

export async function getPhotoUrl(path: string | null) {
  if (!path) return null
  const client = assertSupabase()
  const { data, error } = await client.functions.invoke('signed-profile-photo', { body: { path } })
  if (error) return null
  return data?.url ?? null
}

export async function getDiscover(): Promise<DiscoverProfile[]> {
  const client = assertSupabase()
  const { data, error } = await client.rpc('get_discover_profiles')
  if (error) throw error
  return Promise.all((data ?? []).map(async (p: any) => ({
    id: p.id,
    name: p.name,
    age: p.age,
    photoPath: p.profile_photo_path,
    photoUrl: await getPhotoUrl(p.profile_photo_path),
    interests: p.interests ?? [],
  })))
}

export async function discoveryAction(targetId: string, action: 'pass' | 'interested') {
  const client = assertSupabase()
  const { data, error } = await client.rpc('record_discovery_action', { p_target: targetId, p_action: action })
  if (error) throw error
  return data
}

export async function secretCrush(targetId: string) {
  const client = assertSupabase()
  const { data, error } = await client.rpc('add_secret_crush', { p_target: targetId })
  if (error) throw error
  return data
}

export async function getMatches() {
  const client = assertSupabase()
  const { data, error } = await client.rpc('get_my_matches')
  if (error) throw error
  return data ?? []
}

export async function getChats() {
  const client = assertSupabase()
  const { data, error } = await client.rpc('get_my_chats')
  if (error) throw error
  return data ?? []
}

export async function getMessages(chatId: string) {
  const client = assertSupabase()
  const { data, error } = await client.from('messages').select('id,sender_id,body,created_at,edited_at').eq('chat_id', chatId).order('created_at')
  if (error) throw error
  return data ?? []
}

export async function sendMessage(chatId: string, body: string) {
  const client = assertSupabase()
  const { data, error } = await client.rpc('send_message', { p_chat: chatId, p_body: body })
  if (error) throw error
  return data
}

export async function requestExclusive(matchId: string) {
  const client = assertSupabase()
  const { error } = await client.rpc('request_exclusive', { p_match: matchId })
  if (error) throw error
}

export async function acceptExclusive(matchId: string) {
  const client = assertSupabase()
  const { error } = await client.rpc('accept_exclusive', { p_match: matchId })
  if (error) throw error
}

export async function getNotifications() {
  const client = assertSupabase()
  const { data, error } = await client.rpc('get_notifications')
  if (error) throw error
  return data ?? []
}

export async function markNotificationRead(id: string) {
  const client = assertSupabase()
  const { error } = await client.rpc('mark_notification_read', { p_id: id })
  if (error) throw error
}

export async function isCreator() {
  const client = assertSupabase()
  const { data, error } = await client.rpc('is_founder')
  if (error) return false
  return Boolean(data)
}

export async function creatorOverview() {
  const client = assertSupabase()
  const { data, error } = await client.rpc('creator_overview')
  if (error) throw error
  return data
}

export async function creatorUsers(query = '') {
  const client = assertSupabase()
  const { data, error } = await client.rpc('creator_user_search', { p_query: query })
  if (error) throw error
  return data ?? []
}

export async function creatorBanUser(targetId: string, type: 'temporary' | 'permanent', hours: number, reason: string, note: string) {
  const client = assertSupabase()
  const { error } = await client.rpc('creator_ban_user', { p_target: targetId, p_type: type, p_duration_hours: hours, p_reason: reason, p_note: note })
  if (error) throw error
}

export async function creatorUnbanUser(targetId: string) {
  const client = assertSupabase()
  const { error } = await client.rpc('creator_unban_user', { p_target: targetId })
  if (error) throw error
}

export async function creatorSpark(a: string, b: string) {
  const client = assertSupabase()
  const { error } = await client.rpc('creator_spark', { p_a: a, p_b: b, p_hours: 24 })
  if (error) throw error
}

export async function savePushSubscription(subscription: PushSubscription) {
  const client = assertSupabase()
  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error('Invalid push subscription')
  const { data: user } = await client.auth.getUser()
  if (!user.user) throw new Error('Authentication required')
  const { error } = await client.from('push_subscriptions').upsert({
    profile_id: user.user.id,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    user_agent: navigator.userAgent,
    last_seen_at: new Date().toISOString(),
  }, { onConflict: 'profile_id,endpoint' })
  if (error) throw error
}

export async function removePushSubscription(subscription: PushSubscription) {
  const client = assertSupabase()
  const endpoint = subscription.endpoint
  if (!endpoint) return
  const { error } = await client
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
  if (error) throw error
}

export async function enablePushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    throw new Error('Push notifications are not available in this browser')
  }
  const key = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY as string | undefined
  if (!key) throw new Error('Push notifications are not configured yet')

  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission was not granted')

  const registration = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    })
  }
  await savePushSubscription(subscription)
  return subscription
}

export async function disablePushNotifications() {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return
  await removePushSubscription(subscription)
  await subscription.unsubscribe()
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)))
}
