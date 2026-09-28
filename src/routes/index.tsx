import { createFileRoute } from '@tanstack/react-router'
import { cloneElement, isValidElement, useEffect, useRef, useState, type FormEvent, type PointerEvent, type ReactNode } from 'react'
import { Activity, ArrowLeft, Bell, Camera, Check, ChevronRight, Heart, Lock, LogOut, Menu, MessageCircle, Shield, Sparkles, Star, Trash2, UserRound, X, Zap } from 'lucide-react'
import {
  acceptExclusive, creatorBanUser, creatorOverview, creatorSpark, creatorUnbanUser, creatorUsers, discoveryAction, enablePushNotifications, disablePushNotifications, getChats, getDiscover, getMatches, getMessages, getMyProfile, getNotifications, getPhotoUrl, getSession, isCreator, markNotificationRead, requestExclusive, saveProfile, secretCrush, sendMessage, signIn, signOut, signUp, uploadProfilePhoto,
  type DiscoverProfile, type Profile,
} from '../lib/knot'

export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'Knot — Find your people' },
    { name: 'description', content: 'A private, mutual-first social experience for people aged 18 to 21' },
  ] }),
  component: KnotApp,
})

type Screen = 'welcome' | 'auth' | 'profile' | 'home' | 'creator' | 'blocked'
type HomeTab = 'discover' | 'matches' | 'chats' | 'profile' | 'notifications' | 'security'

type Gender = 'man' | 'woman'

const interestOptions = ['Music','Photography','Movies','Coffee','Sports','Gaming','Art','Books','Dance','Travel','Tech','Food','Fitness','Writing','Design','Others']
const cities = ['Ahmedabad','Agra','Ajmer','Aligarh','Amritsar','Aurangabad','Bengaluru','Bhopal','Bhubaneswar','Chandigarh','Chennai','Coimbatore','Cuttack','Dehradun','Delhi','Dhanbad','Durgapur','Erode','Faridabad','Gandhinagar','Ghaziabad','Gorakhpur','Gurugram','Guwahati','Gwalior','Hubballi','Hyderabad','Indore','Jabalpur','Jaipur','Jalandhar','Jammu','Jamshedpur','Jhansi','Jodhpur','Kanpur','Kochi','Kolhapur','Kolkata','Kota','Kozhikode','Lucknow','Ludhiana','Madurai','Mangaluru','Meerut','Moradabad','Mumbai','Mysuru','Nagpur','Nashik','Navi Mumbai','New Delhi','Noida','Patna','Pondicherry','Prayagraj','Pune','Raipur','Rajkot','Ranchi','Salem','Siliguri','Solapur','Srinagar','Surat','Thane','Thanjavur','Thiruvananthapuram','Thoothukudi','Tiruchirappalli','Tirunelveli','Tiruppur','Udaipur','Vadodara','Varanasi','Vasai-Virar','Vellore','Vijayawada','Visakhapatnam','Warangal']

function KnotApp() {
  const [screen, setScreen] = useState<Screen>('welcome')
  const [tab, setTab] = useState<HomeTab>('discover')
  const [authMode, setAuthMode] = useState<'signin'|'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [creator, setCreator] = useState(false)
  const [busy, setBusy] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [welcomePreview, setWelcomePreview] = useState(false)
  const [authTheme, setAuthTheme] = useState<'light'|'dark'>('light')
  const [returnToReady, setReturnToReady] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)

  const load = async (afterLogin = false) => {
    setBusy(true); setError('')
    try {
      const { data } = await getSession()
      if (!data.session) { setAuthenticated(false); setScreen('welcome'); return }
      // A cached browser session must not silently unlock an account on a fresh app start.
      // Once the user has explicitly signed in during this app session, continue to their profile.
      if (!afterLogin) {
        setAuthenticated(false)
        setProfile(null)
        setError('')
        setMessage('')
        setAuthMode('signin')
        setScreen('auth')
        return
      }
      setAuthenticated(true)
      const me = await getMyProfile()
      setProfile(me)
      if (me?.eligibility === 'ineligible') { setScreen('blocked'); return }
      setCreator(await isCreator())
      setScreen(me?.profileComplete ? 'home' : 'profile')
    } catch (e: any) {
      const message = e?.message || ''
      if (message.includes('Supabase is not configured')) {
        setError('')
        setScreen('welcome')
      } else {
        setError(message || 'Knot could not load right now')
      }
    } finally { setBusy(false) }
  }

  useEffect(() => {
    // Every fresh app launch starts at the public welcome screen.
    // A cached Supabase session must never silently open somebody else's Knot account.
    void (async () => {
      await signOut().catch(() => {})
      setAuthenticated(false)
      setProfile(null)
      setCreator(false)
      setScreen('welcome')
      setBusy(false)
    })()
  }, [])

  const openLogin = () => {
    setError(''); setMessage(''); setEmail(''); setPassword(''); setAuthMode('signin'); setAuthTheme('light'); setReturnToReady(false); setScreen('auth')
  }
  const openSignup = () => {
    setError(''); setMessage(''); setEmail(''); setPassword(''); setAuthMode('signup'); setAuthTheme('light'); setReturnToReady(false); setScreen('auth')
  }

  if (busy) return <div className="knot-loading"><div className="knot-loading-inner"><div className="knot-logo">Knot</div><Heart className="loader-heart" aria-hidden="true" /></div></div>
  if (screen === 'blocked') return <Blocked />
  if (screen === 'welcome') return <Welcome onLogin={openLogin} />
  if (screen === 'auth') return <Auth mode={authMode} setMode={setAuthMode} email={email} setEmail={setEmail} password={password} setPassword={setPassword} error={error} setError={setError} message={message} setMessage={setMessage} theme={authTheme} onDone={() => load(true)} onSignupCreated={async (hasSession: boolean) => { setAuthenticated(hasSession); setProfile(null); setReturnToReady(false); setScreen('profile') }} onBack={() => { setReturnToReady(false); setScreen('welcome') }} />
  if (screen === 'profile') return <ProfileSetup existing={profile} preAuth={!authenticated} initialStep={returnToReady ? 7 : (authenticated ? 7 : 1)} error={error} setError={setError} onAuthNeeded={async (selectedTheme: 'light'|'dark') => { setAuthenticated(false); setProfile(null); setAuthTheme(selectedTheme); setAuthMode('signin'); setReturnToReady(false); setMessage('Your profile is saved. Log in to finish opening Discover.'); setScreen('auth') }} onDone={async () => { setReturnToReady(false); await load(true) }} onLogout={async () => { setReturnToReady(false); setAuthenticated(false); setProfile(null); await signOut().catch(() => {}); setScreen('welcome') }} />
  if (screen === 'creator') return <CreatorCenter onBack={() => setScreen('home')} />
  return <Home profile={profile!} authPassword={password} tab={tab} setTab={setTab} creator={creator} onCreator={() => setScreen('creator')} onRefresh={() => load(true)} onLogout={async () => { await signOut(); setAuthenticated(false); setProfile(null); setScreen('welcome') }} />
}

function Welcome({ onLogin }: { onLogin: () => void }) {
  const [expanding, setExpanding] = useState(false)
  const [starGlows, setStarGlows] = useState<Record<number, 'white' | 'pink' | 'navy'>>({})

  useEffect(() => {
    const chooseGlows = () => {
      const count = 5 + Math.floor(Math.random() * 3)
      const next: Record<number, 'white' | 'pink' | 'navy'> = {}
      const used = new Set<number>()
      while (used.size < count) used.add(Math.floor(Math.random() * 47))
      used.forEach((index) => {
        const roll = Math.random()
        next[index] = roll < 0.34 ? 'white' : roll < 0.67 ? 'pink' : 'navy'
      })
      setStarGlows(next)
    }

    chooseGlows()
    const timer = window.setInterval(chooseGlows, 1350)
    return () => window.clearInterval(timer)
  }, [])

  const begin = () => {
    if (expanding) return
    setExpanding(true)
    window.setTimeout(onLogin, 1200)
  }

  return <div className={`welcome knot-welcome ${expanding ? 'welcome-expanding' : ''}`}>
    <div className="star-field">{[[7,13],[16,29],[27,9],[39,21],[52,11],[66,17],[81,8],[92,25],[11,44],[23,58],[35,39],[48,49],[61,34],[74,54],[88,42],[96,67],[6,76],[19,87],[31,70],[44,82],[57,73],[69,91],[83,78],[94,88],[13,7],[30,31],[46,6],[63,27],[78,36],[89,14],[4,56],[17,72],[28,51],[41,64],[55,43],[68,61],[80,69],[91,53],[9,94],[25,80],[38,93],[50,60],[64,84],[76,75],[87,95],[98,46],[72,12]].map(([left,top],i)=><span key={i} className={`tiny-star star-${i%5} glow-${starGlows[i] || 'none'}`} style={{left:`${left}%`,top:`${top}%`,animationDelay:`${(i%9)*.37}s`}}>✦</span>)}</div>

    <main className="welcome-center">
      <h1>You might be closer<br />than you think<span className="title-dot">.</span></h1>
      <div className="welcome-kicker">Welcome to Knot<span>.</span></div>
      <button className="welcome-star" onClick={begin} aria-label="Create your Knot account">
        <svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
          <defs>
            <radialGradient id="knotStarFill" cx="50%" cy="50%" r="58%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="16%" stopColor="#fffaff" />
              <stop offset="38%" stopColor="#e9d5ff" />
              <stop offset="66%" stopColor="#b98cff" />
              <stop offset="84%" stopColor="#7e72ff" />
              <stop offset="100%" stopColor="#e58cff" />
            </radialGradient>
            <filter id="knotStarGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="7" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <path className="welcome-star-glow" d="M100 4 C102 56 108 82 151 96 C166 99 181 100 196 100 C181 101 166 102 151 104 C108 118 102 144 100 196 C98 144 92 118 49 104 C34 102 19 101 4 100 C19 99 34 98 49 96 C92 82 98 56 100 4 Z" />
          <path className="welcome-star-shape" d="M100 4 C102 56 108 82 151 96 C166 99 181 100 196 100 C181 101 166 102 151 104 C108 118 102 144 100 196 C98 144 92 118 49 104 C34 102 19 101 4 100 C19 99 34 98 49 96 C92 82 98 56 100 4 Z" />
        </svg>
      </button>
    </main>
  </div>
}

function Auth({ mode,setMode,email,setEmail,password,setPassword,error,setError,message,setMessage,theme='light',onDone,onSignupCreated,onBack }: any) {
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setMessage('')
    try {
      const result = mode==='signup' ? await signUp(email,password) : await signIn(email,password)
      if (result.error) throw result.error
      if (mode==='signup') {
        if (!result.data.session) setMessage('Account created. Complete your profile, then confirm your email if prompted.')
        await onSignupCreated?.(!!result.data.session)
      } else {
        await onDone()
      }
    } catch (e:any) { setError(e?.message || 'Something went wrong') }
  }
  return <div className={`auth-page ${theme==='light'?'light':''}`}><div className="auth-card">
    <button className="ghost-back" onClick={onBack} aria-label="Back to welcome"><ArrowLeft size={18}/><span>Knot</span></button>
    <div className="auth-icon"><Lock size={22}/></div>
    <h1>{mode==='signup' ? 'Make your Knot' : 'Welcome back'}</h1>
    <p>{mode==='signup' ? 'Your account comes first, then the rest' : 'Pick up where you left off'}</p>
    <form onSubmit={submit} className="stack">
      <label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" /></label>
      <label>Password<input type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" /></label>
      {error && <div className="error-box">{error}</div>}{message && <div className="success-box">{message}</div>}
      <button className="primary-btn" type="submit">{mode==='signup'?'Create account':'Sign in'} <ChevronRight size={18}/></button>
    </form>
    <button className="switch-link" onClick={()=>setMode(mode==='signup'?'signin':'signup')}>{mode==='signup'?'Already have an account? Sign in':'New here? Create an account'}</button>
  </div></div>
}

function ProfileSetup({ existing,preAuth=false,initialStep=1,error,setError,onDone,onLogout,onAuthNeeded }: any) {
  const [step,setStep]=useState(initialStep)
  const [finishing,setFinishing]=useState(false)
  const draft = (() => { if (existing || typeof window === 'undefined') return null; try { return JSON.parse(window.sessionStorage.getItem('knot_profile_draft') || 'null') } catch { return null } })()
  const hasDraft = !!draft
  const value = <T,>(key: string, fallback: T): T => hasDraft && Object.prototype.hasOwnProperty.call(draft, key) ? (draft[key] as T) : fallback
  const [name,setName]=useState(value('name', existing?.name ?? ''))
  const [photoPath,setPhotoPath]=useState<string|null>(value('photoPath', existing?.photoPath ?? null))
  const [photoUrl,setPhotoUrl]=useState<string|null>(value('photoDataUrl', null))
  const [dob,setDob]=useState(value('dob', existing?.dob ?? ''))
  const [gender,setGender]=useState<Gender | ''>(value('gender', existing?.gender ?? ''))
  const [city,setCity]=useState(value('city', existing?.city ?? ''))
  const [bio,setBio]=useState(value('bio', existing?.bio ?? ''))
  const [interests,setInterests]=useState<string[]>(value('interests', existing?.interests ?? []))
  const [intent,setIntent]=useState(value('intent', existing?.intent ?? ''))
  const [preference,setPreference]=useState(value('preference', existing?.preference ?? ''))
  const [ageMin,setAgeMin]=useState(value('ageMin', existing?.ageMin ?? 18))
  const [ageMax,setAgeMax]=useState(value('ageMax', existing?.ageMax ?? 21))
  const [theme,setTheme]=useState<'light'|'dark'>(value('theme', existing?.theme ?? 'light'))
  const [starColor,setStarColor]=useState(value('starColor', existing?.starColor ?? '#c084fc'))
  const [incognito,setIncognito]=useState(value('incognito', existing?.incognito ?? false))
  const [saving,setSaving]=useState(false)
  const fileRef=useRef<HTMLInputElement>(null)
  const videoRef=useRef<HTMLVideoElement>(null)
  const streamRef=useRef<MediaStream|null>(null)
  const [camera,setCamera]=useState(false)
  const [cameraImage,setCameraImage]=useState<string|null>(null)

  useEffect(()=>{ if(photoPath) void getPhotoUrl(photoPath).then(setPhotoUrl) },[photoPath])
  useEffect(()=>()=>streamRef.current?.getTracks().forEach(t=>t.stop()),[])
  useEffect(()=>{
    if(!camera || !streamRef.current || !videoRef.current) return
    const video=videoRef.current
    video.srcObject=streamRef.current
    const play=()=>video.play().catch(()=>{})
    if(video.readyState>=1) play(); else video.onloadedmetadata=play
    return ()=>{ video.onloadedmetadata=null }
  },[camera])

  const fileToDataUrl=async(file:File)=>await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(file)})
  const dataUrlToFile=(dataUrl:string)=>{const [meta,data]=dataUrl.split(',');const mime=meta.match(/data:(.*?);base64/)?.[1]||'image/jpeg';const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));return new File([bytes],'profile.jpg',{type:mime})}
  const chooseFile=async(file?:File)=>{ if(!file)return; try{ const dataUrl=await fileToDataUrl(file); if(preAuth){setPhotoPath(null);setPhotoUrl(dataUrl);setCameraImage(null);setError('');return} const p=await uploadProfilePhoto(file);setPhotoPath(p);setPhotoUrl(dataUrl);setError('') }catch(e:any){setError(e?.message||'Photo upload failed')} }
  const removePhoto=()=>{streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;setCamera(false);setCameraImage(null);setPhotoPath(null);setPhotoUrl(null);setError('')}
  const startCamera=async()=>{try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera is not supported in this browser');const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'user'},width:{ideal:1280},height:{ideal:720}},audio:false});streamRef.current=stream;setCamera(true);setError('')}catch(e:any){setError(e?.message||'Camera permission was not granted') }}
  const capture=async()=>{const video=videoRef.current;if(!video||video.readyState<2||!video.videoWidth){setError('Camera is still starting. Please try Capture again.');return}const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;canvas.getContext('2d')?.drawImage(video,0,0);const blob=await new Promise<Blob|null>(r=>canvas.toBlob(r,'image/jpeg',.9));if(blob){const dataUrl=canvas.toDataURL('image/jpeg');setCameraImage(dataUrl);if(preAuth){setPhotoPath(null);setPhotoUrl(dataUrl)}else{await chooseFile(new File([blob],'camera.jpg',{type:'image/jpeg'}))}}streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;setCamera(false)}
  const finish=async()=>{setSaving(true);setError('');try{if(preAuth){window.sessionStorage.setItem('knot_profile_draft',JSON.stringify({name,dob,gender,city,bio,interests,intent,preference,ageMin,ageMax,theme,starColor,incognito,photoPath:null,photoDataUrl:photoUrl}));onAuthNeeded?.(theme);return}let finalPhotoPath=photoPath;if(!finalPhotoPath&&photoUrl?.startsWith('data:')) finalPhotoPath=await uploadProfilePhoto(dataUrlToFile(photoUrl));const saved=await saveProfile({name,photoPath:finalPhotoPath,dob,gender,city,bio,intent,preference,ageMin,ageMax,theme,starColor,incognito,interests,complete:true});window.sessionStorage.removeItem('knot_profile_draft');if((saved as any).eligibility==='ineligible'){onDone();return}setFinishing(true);window.setTimeout(()=>void onDone(),900)}catch(e:any){setError(e?.message?.includes('KNOT_AGE_INELIGIBLE')?'Sorry, Knot isn\'t available for you yet':e?.message||'Could not save your profile');setSaving(false)}}
  const next=()=>setStep(s=>Math.min(7,s+1)), back=()=>setStep(s=>Math.max(1,s-1))
  const toggleInterest=(x:string)=>setInterests(a=>a.includes(x)?a.filter(v=>v!==x):a.length<8?[...a,x]:a)

  const stepTitle=['','Let’s set up your profile','A couple of basics','Your interests','What are you looking for','Your discovery preferences','Your look','Your Knot is ready'][step]
  const effectiveTheme = step >= 6 ? theme : 'light'
  return <div className={`profile-page ${effectiveTheme==='light'?'light':''} ${finishing?'profile-finishing':''}`} style={{'--star':starColor} as any}>
    {finishing&&<div className="profile-complete-transition" aria-hidden="true"><div className="transition-star" style={{color:starColor}}>✦</div></div>}
    <header className="setup-header"><button className="knot-word" onClick={onLogout}>Knot</button><span>{step}/7</span></header>
    <div className="setup-wrap"><div className="setup-progress"><span style={{width:`${(step/7)*100}%`}}/></div><section className="setup-card"><div className="setup-reference-star" style={{color:starColor}} aria-hidden="true">✦</div><div className="setup-eyebrow">Profile setup</div><h1>{stepTitle}</h1>{step===1&&<p className="setup-subtitle">Tell us a bit about you</p>}
      {step===1&&<div className="setup-content"><div className="photo-picker"><div className="avatar-preview">{photoUrl?<img src={photoUrl} alt="Profile preview"/>:<UserRound size={42}/>}</div><div><strong>Profile photo</strong><p>Choose one from your device or use your camera</p><div className="inline-actions"><button className="secondary-btn" onClick={()=>fileRef.current?.click()}>Upload</button><button className="secondary-btn" onClick={startCamera}><Camera size={17}/> Camera</button>{photoUrl&&<button className="secondary-btn photo-remove-btn" onClick={removePhoto}>Remove photo</button>}</div></div><input ref={fileRef} hidden type="file" accept="image/*" onChange={e=>chooseFile(e.target.files?.[0])}/></div><label>Your name<input value={name} onChange={e=>setName(e.target.value)} placeholder="What should people call you?"/></label>{camera&&<div className="camera-box"><video key={camera ? 'camera-active' : 'camera-idle'} ref={videoRef} muted playsInline autoPlay/><button className="primary-btn" onClick={capture}>Capture</button></div>}{cameraImage&&<div className="camera-note"><Check size={16}/> Photo captured</div>}</div>}
      {step===2&&<div className="setup-content two-col"><label>Date of birth<input type="date" value={dob} onChange={e=>setDob(e.target.value)}/><small>Knot is currently available only to people aged 18 through 21</small></label><label>Gender<select value={gender} onChange={e=>setGender(e.target.value as Gender)}><option value="">Choose one</option><option value="man">Man</option><option value="woman">Woman</option></select><small>Knot currently supports straight matching</small></label><label>City<select value={cities.includes(city)?city:'__other__'} onChange={e=>setCity(e.target.value==='__other__'?'':e.target.value)}>{cities.map(c=><option key={c} value={c}>{c}</option>)}<option value="__other__">Other city</option></select>{!cities.includes(city)&&<input value={city} onChange={e=>setCity(e.target.value)} placeholder="Type your city"/>}<small>Your city is used for Discover and is not shown on suggestion cards</small></label></div>}
      {step===3&&<div className="setup-content"><div className="verification-placeholder"><Shield size={28}/><div><strong>Identity verification</strong><p>The DigiLocker and live-camera verification connection will be plugged in here</p></div><span>Integration point</span></div><label>Bio<textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={500} placeholder="A little about you"/></label><div><strong>Interests</strong><div className="chip-grid">{interestOptions.map(x=><button key={x} className={interests.includes(x)?'chip active':'chip'} onClick={()=>toggleInterest(x)}>{x}</button>)}</div></div></div>}
      {step===4&&<div className="setup-content"><label>What are you looking for<select value={intent} onChange={e=>setIntent(e.target.value)}><option value="">Choose one</option><option>Something meaningful</option><option>Open to seeing where it goes</option><option>New connections</option></select></label><label>Preferences<input value={preference} onChange={e=>setPreference(e.target.value)} placeholder="What matters to you?"/></label></div>}
      {step===5&&<div className="setup-content"><div><strong>Preferred age range</strong><div className="range-row"><select value={ageMin} onChange={e=>setAgeMin(Number(e.target.value))}>{[18,19,20,21].map(x=><option key={x}>{x}</option>)}</select><span>to</span><select value={ageMax} onChange={e=>setAgeMax(Number(e.target.value))}>{[18,19,20,21].filter(x=>x>=ageMin).map(x=><option key={x}>{x}</option>)}</select></div></div><div className="privacy-box"><Lock size={18}/><div><strong>Incognito mode</strong><p>Stay out of Discover until you turn it off</p></div><button className={`toggle ${incognito?'on':''}`} onClick={()=>setIncognito(!incognito)}><span/></button></div></div>}
      {step===6&&<div className="setup-content"><div><strong>Theme</strong><div className="theme-row"><button className={theme==='dark'?'theme-choice active':'theme-choice'} onClick={()=>setTheme('dark')}>Dark</button><button className={theme==='light'?'theme-choice active':'theme-choice'} onClick={()=>setTheme('light')}>Light</button></div></div><div><strong>Star colour</strong><div className="star-colors">{['#c084fc','#60a5fa','#fb7185','#facc15','#34d399'].map(c=><button key={c} style={{background:c}} className={starColor===c?'star-choice active':'star-choice'} onClick={()=>setStarColor(c)}>✦</button>)}</div></div></div>}
      {step===7&&<div className="ready-state"><div className="ready-star" style={{color:starColor}}>✦</div><h2>Your Knot is ready</h2><p>Discover people, move at your own pace, and let mutual interest reveal the connection</p></div>}
      {error&&<div className="error-box">{error}</div>}
      <div className="setup-actions">{step>1&&<button className="secondary-btn" onClick={back}>Back</button>}<button className="primary-btn" disabled={saving||!name.trim()||(step===2&&(!dob||!gender))||(step===7&&saving)} onClick={step===7?finish:next}>{saving?'Saving…':step===7?'Enter Discover':'Continue'} <ChevronRight size={18}/></button></div>
    </section></div>
  </div>
}

const DEMO_DISCOVER_PROFILES: DiscoverProfile[] = [
  { id:'demo-ira', name:'Ira', age:21, photoPath:null, photoUrl:'/discover/ira.jpg', interests:['Books','Music','Travel','Photography'], school:'Delhi University', tag:'New here' },
  { id:'demo-maya', name:'Maya', age:20, photoPath:null, photoUrl:'/discover/maya.jpg', interests:['Art','Coffee','Movies','Dance'], school:'Ashoka University', tag:'New here' },
  { id:'demo-anika', name:'Anika', age:19, photoPath:null, photoUrl:'/discover/anika.jpg', interests:['Sports','Gaming','Tech','Food'], school:'BITS Pilani', tag:'New here' },
  { id:'demo-sara', name:'Sara', age:21, photoPath:null, photoUrl:'/discover/sara.jpg', interests:['Writing','Fitness','Music','Design'], school:'St Xavier’s', tag:'New here' },
  { id:'demo-nila', name:'Nila', age:20, photoPath:null, photoUrl:'/discover/nila.jpg', interests:['Cinema','Travel','Art','Books'], school:'Christ University', tag:'New here' },
  { id:'demo-meera', name:'Meera', age:19, photoPath:null, photoUrl:'/discover/meera.jpg', interests:['Dance','Music','Food','Photography'], school:'Loyola College', tag:'New here' },
  { id:'demo-tara', name:'Tara', age:21, photoPath:null, photoUrl:'/discover/tara.jpg', interests:['Science','Reading','Coffee','Design'], school:'IIT Delhi', tag:'New here' },
  { id:'demo-rhea', name:'Rhea', age:20, photoPath:null, photoUrl:'/discover/rhea.jpg', interests:['Fitness','Movies','Travel','Music'], school:'Symbiosis', tag:'New here' },
  { id:'demo-isha', name:'Isha', age:19, photoPath:null, photoUrl:'/discover/isha.jpg', interests:['Gaming','Tech','Drawing','Food'], school:'Manipal University', tag:'New here' },
  { id:'demo-zoya', name:'Zoya', age:21, photoPath:null, photoUrl:'/discover/zoya.jpg', interests:['Fashion','Music','Writing','Photography'], school:'Delhi University', tag:'New here' },
]

function Home({ profile, authPassword, tab, setTab, creator, onCreator, onRefresh, onLogout }: { profile:Profile; authPassword:string; tab:HomeTab; setTab:(x:HomeTab)=>void; creator:boolean; onCreator:()=>void; onRefresh:()=>Promise<void>; onLogout:()=>Promise<void> }) {
  const [discover,setDiscover]=useState<DiscoverProfile[]>(DEMO_DISCOVER_PROFILES)
  const [index,setIndex]=useState(0)
  const [flipped,setFlipped]=useState(false)
  const [animation,setAnimation]=useState<string|null>(null)
  const [dragX,setDragX]=useState(0)
  const [dragging,setDragging]=useState(false)
  const [matches,setMatches]=useState<any[]>([])
  const [chats,setChats]=useState<any[]>([])
  const [notifications,setNotifications]=useState<any[]>([])
  const [selectedChat,setSelectedChat]=useState<string|null>(null)
  const [error,setError]=useState('')
  const [sectionError,setSectionError]=useState('')
  const [menuOpen,setMenuOpen]=useState(false)
  const [crushNotice,setCrushNotice]=useState(false)
  const [crushPasswordOpen,setCrushPasswordOpen]=useState(false)
  const [crushUnlocked,setCrushUnlocked]=useState(false)
  const [crushPassword,setCrushPassword]=useState('')
  const [secretCrushIds,setSecretCrushIds]=useState<string[]>([])
  const [demoMode,setDemoMode]=useState(true)
  const [demoNotifications,setDemoNotifications]=useState<any[]>(DEMO_NOTIFICATIONS)
  const [demoNotificationClicks,setDemoNotificationClicks]=useState<Record<string,number>>({})
  const [selectedPerson,setSelectedPerson]=useState<DiscoverProfile|null>(null)

  const loadData=async()=>{
    setSectionError('')
    try{
      if(tab==='discover' && !demoMode) setDiscover(await getDiscover())
      if(tab==='matches' && !demoMode) setMatches(await getMatches())
      if(tab==='chats' && !demoMode) setChats(await getChats())
      if(tab==='notifications' && !demoMode) setNotifications(await getNotifications())
    }catch(e:any){setSectionError(e?.message||'Could not load this section')}
  }
  useEffect(()=>{void loadData()},[tab,demoMode])

  const current=discover[index]
  const addDemoMutual=()=>{
    if(!current)return
    const match={match_id:`demo-match-${current.id}`,other_id:current.id,other_name:current.name,other_photo_path:current.photoUrl,state:'trial'}
    const chat={chat_id:`demo-chat-${current.id}`,other_id:current.id,other_name:current.name,other_photo_path:current.photoUrl,last_message:'Start the conversation'}
    setMatches(old=>old.some(x=>x.match_id===match.match_id)?old:[...old,match])
    setChats(old=>old.some(x=>x.chat_id===chat.chat_id)?old:[...old,chat])
    setDemoNotifications(old=>old.some(x=>x.personId===current.id&&x.type==='match')?old:[
      {id:`demo-match-notification-${current.id}`,type:'match',title:'Mutual interest',body:`${current.name} returned your interest`,personId:current.id,read_at:null},
      ...old,
    ])
  }

  const act=async(action:'pass'|'interested'|'cupid')=>{
    if(!current || animation)return
    if(action==='cupid' && secretCrushIds.length>=3){setCrushNotice(true);return}
    setAnimation(action)
    try{
      if(demoMode){
        if(action==='cupid') setSecretCrushIds(ids=>ids.includes(current.id)?ids:[...ids,current.id])
        if(action==='interested') addDemoMutual()
      }else{
        if(action==='cupid'){await secretCrush(current.id);setSecretCrushIds(ids=>ids.includes(current.id)?ids:[...ids,current.id])}
        else await discoveryAction(current.id,action)
      }
    }catch(e:any){
      const msg=e?.message||'Action could not be saved'
      if(action==='cupid' && (msg.includes('KNOT_SECRET_CRUSH_LIMIT') || msg.toLowerCase().includes('three'))) setCrushNotice(true)
      else setError(msg)
    }
    window.setTimeout(()=>{setAnimation(null);setFlipped(false);setDragX(0);setIndex(i=>i+1)},300)
  }

  const pointerDown=(e:PointerEvent<HTMLDivElement>)=>{
    if(!flipped||animation)return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
  }
  const pointerMove=(e:PointerEvent<HTMLDivElement>)=>{
    if(!dragging)return
    const r=e.currentTarget.getBoundingClientRect()
    setDragX(Math.max(-180,Math.min(180,e.clientX-(r.left+r.width/2))))
  }
  const pointerUp=()=>{
    if(!dragging)return
    setDragging(false)
    if(dragX<-90)void act('pass')
    else if(dragX>90)void act('interested')
    else setDragX(0)
  }

  const openCrushes=()=>{
    setCrushPassword('')
    setCrushPasswordOpen(true)
  }
  const unlockCrushes=()=>{
    if(!crushPassword.trim())return
    if(authPassword && crushPassword===authPassword){setCrushUnlocked(true);setCrushPasswordOpen(false);setCrushPassword('');return}
    setError('That password does not match your Knot account')
  }
  const openPersonInDiscover=(person:DiscoverProfile)=>{
    const i=DEMO_DISCOVER_PROFILES.findIndex(p=>p.id===person.id)
    if(i>=0){setIndex(i);setFlipped(true);setTab('discover')}
    setSelectedPerson(null)
  }
  const openPersonChat=(person:DiscoverProfile)=>{
    const chatId=`demo-chat-${person.id}`
    setSelectedChat(chatId)
    setTab('chats')
    setSelectedPerson(null)
  }

  const unread=demoMode?demoNotifications.some(n=>!n.read_at):notifications.some(n=>!n.read_at)
  const visibleNotifications=demoMode?demoNotifications:notifications

  return <div className={`app-shell ${profile.theme==='dark'?'':'light'}`} style={{'--star':profile.starColor || '#c084fc'} as any}>
    <header className="app-header">
      <button className="icon-btn menu-btn" onClick={()=>setMenuOpen(v=>!v)} aria-label="Open menu"><Menu size={21}/></button>
      <button className="home-top-star" onClick={()=>{setCrushUnlocked(false);setTab('discover')}} aria-label="Discover"><KnotStar color={profile.starColor || '#c084fc'}/></button>
      <div className="header-actions">
        <button className="top-secret-crush" onClick={openCrushes} aria-label="Secret Crush"><CupidIcon/></button>
        <button className={`icon-btn notification-btn ${tab==='notifications'?'top-active':''}`} onClick={()=>setTab('notifications')} aria-label="Activity"><Activity size={20}/>{unread&&<i/>}</button>
        <button className="icon-btn" onClick={()=>setTab('profile')} aria-label="Profile"><UserRound size={19}/></button>
      </div>
    </header>
    {menuOpen&&<div className="app-menu">
      <button onClick={()=>{setTab('profile');setMenuOpen(false)}}><UserRound/> Profile</button>
      <button onClick={()=>{setTab('notifications');setMenuOpen(false)}}><Activity/> Activity</button>
      <button onClick={()=>{setTab('security');setMenuOpen(false)}}><Shield/> Safety & Security</button>
      {creator&&<button onClick={()=>{setMenuOpen(false);onCreator()}}><Sparkles/> Creator Command Center</button>}
      <button onClick={()=>{setMenuOpen(false);void onLogout()}}><LogOut/> Sign out</button>
    </div>}

    <main className="app-main">
      {crushUnlocked ? <SecretCrushPage profiles={DEMO_DISCOVER_PROFILES} crushIds={secretCrushIds} onRemove={id=>setSecretCrushIds(ids=>ids.filter(x=>x!==id))} onBack={()=>setCrushUnlocked(false)} onOpenProfile={openPersonInDiscover}/> : <>
      {tab==='discover'&&<section className="discover-section">
        <div className="discover-welcome"><h1>Welcome back, {profile.name}</h1><div className="discover-underline" /></div>
        {error&&<div className="error-box">{error}</div>}
        {current? <>
          <div className="card-stack">
            <div className="card-stack-backdrop" aria-hidden="true">
              {discover.slice(index+1,index+5).map((p,i)=><div key={p.id} className={`stack-card stack-${i+2}`}><img src={p.photoUrl||'/favicon.ico'} alt=""/><div/></div>)}
            </div>
            <div className="card-wrap">
              <div className={`discover-card ${flipped?'flipped':''} ${animation?`anim-${animation}`:''}`} style={{transform:animation?undefined:(dragX!==0?`translateX(${dragX}px) rotate(${dragX/18}deg)${flipped?' rotateY(180deg)':''}`:undefined)}} onClick={()=>{if(!animation && Math.abs(dragX)<10)setFlipped(v=>!v)}} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}>
                <div className="card-face card-front"><img src={current.photoUrl||'/favicon.ico'} alt="Profile"/><div className="photo-shade"/><div className="card-profile-info"><div className="card-name">{current.name}</div></div></div>
                <div className="card-face card-back">
                  <img className="back-large-photo" src={current.photoUrl||'/favicon.ico'} alt=""/>
                  <div className="back-info-panel"><h2>{current.name}, {current.age}</h2><p>{(current as any).school || 'Student'}</p><div className="back-chips">{current.interests.map(x=><span key={x}>{x}</span>)}</div></div>
                </div>
              </div>
              {animation==='pass'&&<div className="anim-overlay split-heart">♥</div>}{animation==='interested'&&<div className="anim-overlay half-heart">♥</div>}{animation==='cupid'&&<div className="anim-overlay cupid-heart"><CupidIcon/></div>}
            </div>
          </div>
          <div className="discover-actions">
            <button className="action-btn pass" onClick={()=>void act('pass')}><X/><span>Pass</span></button>
            {flipped&&<button className="action-btn secret" onClick={()=>void act('cupid')}><CupidIcon/><span>Secret Crush</span></button>}
            <button className="action-btn interested" onClick={()=>void act('interested')}><Heart/><span>Interested</span></button>
          </div>
          <div className="privacy-box homepage-privacy"><Lock size={17}/><div><strong>Your moves are private</strong><span>Only mutual interest reveals the connection</span></div></div>
          <div className="quick-grid"><button onClick={()=>setTab('matches')}><Heart/><strong>Matches</strong><span>Mutual connections</span></button><button onClick={()=>setTab('chats')}><MessageCircle/><strong>Chats</strong><span>Your conversations</span></button><button onClick={()=>setTab('profile')}><UserRound/><strong>Profile</strong><span>Your space</span></button><button onClick={()=>setMenuOpen(true)}><Shield/><strong>Safety</strong><span>Stay in control</span></button></div>
        </> : <div className="empty-state"><div>✦</div><h2>That’s everyone for now</h2><p>Come back later for more Discover profiles</p><button className="primary-btn" onClick={()=>{setIndex(0);setFlipped(false)}}>Restart Discover</button></div>}
      </section>}
      {tab==='matches'&&<Matches matches={matches} refresh={loadData} demo={demoMode} onOpenChat={person=>openPersonChat(person)}/>} 
      {tab==='chats'&&<Chats chats={chats} selected={selectedChat} setSelected={setSelectedChat} demo={demoMode}/>} 
      {tab==='notifications'&&<Notifications items={visibleNotifications} onRead={async(id)=>{
        if(demoMode){
          const notice=demoNotifications.find(n=>n.id===id)
          setDemoNotificationClicks(old=>{const next=(old[id]||0)+1;return {...old,[id]:next}})
          const clicks=(demoNotificationClicks[id]||0)+1
          setDemoNotifications(old=>old.map(n=>n.id===id?{...n,read_at:new Date().toISOString()}:n))
          if(notice?.personId){const person=DEMO_DISCOVER_PROFILES.find(p=>p.id===notice.personId);if(person)setSelectedPerson(person)}
          else if(notice?.type==='message'){setSelectedChat(notice.chatId || `demo-chat-${notice.personId||'demo-maya'}`);setTab('chats')}
          if(clicks>=2)setDemoNotifications(old=>old.filter(n=>n.id!==id))
        }else{await markNotificationRead(id);await loadData()}
      }} />}
      {tab==='profile'&&<ProfileView profile={profile} onRefresh={onRefresh} onLogout={onLogout}/>} 
      {tab==='security'&&<SecurityCenter profile={profile} onOpenProfile={()=>setTab('profile')} onOpenNotifications={()=>setTab('notifications')}/>} 
      </>}
    </main>
    <nav className="bottom-nav"><svg className="nav-gradient-defs" width="0" height="0" aria-hidden="true"><defs><linearGradient id="knotNavGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff70b1"/><stop offset=".5" stopColor="#a56cff"/><stop offset="1" stopColor="#4da8ff"/></linearGradient></defs></svg><NavButton active={tab==='discover'&&!crushUnlocked} onClick={()=>{setCrushUnlocked(false);setTab('discover')}} icon={<Sparkles/>} label="Discover"/><NavButton active={tab==='chats'&&!crushUnlocked} onClick={()=>{setCrushUnlocked(false);setTab('chats')}} icon={<MessageCircle/>} label="Chats"/><NavButton active={tab==='matches'&&!crushUnlocked} onClick={()=>{setCrushUnlocked(false);setTab('matches')}} icon={<Heart/>} label="Matches"/><NavButton active={tab==='notifications'&&!crushUnlocked} onClick={()=>{setCrushUnlocked(false);setTab('notifications')}} icon={<Bell/>} label="Activity"/><NavButton active={tab==='profile'&&!crushUnlocked} onClick={()=>{setCrushUnlocked(false);setTab('profile')}} icon={<UserRound/>} label="Profile"/></nav>

    {crushPasswordOpen&&<div className="modal-backdrop" onClick={()=>setCrushPasswordOpen(false)}><div className="limit-modal crush-panel" onClick={e=>e.stopPropagation()}><div className="limit-icon"><Lock/></div><h2>Secret Crush</h2><p>Re-enter your Knot password to open your private Secret Crushes</p><input className="modal-password-input" type="password" value={crushPassword} onChange={e=>setCrushPassword(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')unlockCrushes()}} placeholder="Your password" autoFocus/><button className="primary-btn" onClick={unlockCrushes}>Unlock <ChevronRight size={18}/></button></div></div>}
    {crushNotice&&<div className="modal-backdrop" onClick={()=>setCrushNotice(false)}><div className="limit-modal" onClick={e=>e.stopPropagation()}><div className="limit-icon"><CupidIcon/></div><h2>Your Secret Crush list is full</h2><p>You can have up to 3 Secret Crushes at a time</p><button className="primary-btn" onClick={()=>setCrushNotice(false)}>Got it</button></div></div>}
    {selectedPerson&&<PersonNotificationModal person={selectedPerson} onClose={()=>setSelectedPerson(null)} onOpenDiscover={()=>openPersonInDiscover(selectedPerson)} onOpenChat={()=>openPersonChat(selectedPerson)} />}
  </div>
}

function SecretCrushPage({profiles,crushIds,onRemove,onBack,onOpenProfile}:{profiles:DiscoverProfile[];crushIds:string[];onRemove:(id:string)=>void;onBack:()=>void;onOpenProfile:(p:DiscoverProfile)=>void}){
  const crushes=profiles.filter(p=>crushIds.includes(p.id))
  return <section className="secret-crush-page normal-section"><div className="section-heading"><button className="icon-btn" onClick={onBack}><ArrowLeft/></button><div><span>Private</span><h1>Secret Crushes</h1></div></div>{crushes.length===0?<div className="empty-state"><CupidIcon/><h2>No Secret Crushes yet</h2><p>Secret Crushes you add from Discover will appear here</p></div>:<div className="secret-crush-grid">{crushes.map(p=><article className="secret-crush-card" key={p.id}><img src={p.photoUrl||'/favicon.ico'} alt={p.name}/><div className="secret-crush-card-body"><h2>{p.name}, {p.age}</h2><p>{p.school}</p><div className="back-chips">{p.interests.map(x=><span key={x}>{x}</span>)}</div><div className="secret-crush-card-actions"><button className="secondary-btn" onClick={()=>onOpenProfile(p)}>View card</button><button className="danger-btn" onClick={()=>onRemove(p.id)}><Trash2 size={16}/> Remove</button></div></div></article>)}</div>}</section>
}

function KnotStar({color}:{color:string}){return <svg className="knot-star-svg" viewBox="0 0 200 200" aria-hidden="true"><defs><linearGradient id="homeKnotStar" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#182b59"/><stop offset=".34" stopColor="#e85f9e"/><stop offset=".62" stopColor="#8b5cf6"/><stop offset="1" stopColor="#f59a52"/></linearGradient><filter id="homeKnotGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="homeKnotShadow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="7"/></filter></defs><path className="knot-star-shadow" d="M100 4 C102 56 108 82 151 96 C166 99 181 100 196 100 C181 101 166 102 151 104 C108 118 102 144 100 196 C98 144 92 118 49 104 C34 102 19 101 4 100 C19 99 34 98 49 96 C92 82 98 56 100 4 Z" fill={color} opacity=".62" filter="url(#homeKnotShadow)"/><path d="M100 4 C102 56 108 82 151 96 C166 99 181 100 196 100 C181 101 166 102 151 104 C108 118 102 144 100 196 C98 144 92 118 49 104 C34 102 19 101 4 100 C19 99 34 98 49 96 C92 82 98 56 100 4 Z" fill="url(#homeKnotStar)" filter="url(#homeKnotGlow)"/></svg>}
function CupidIcon(){return <svg className="cupid-icon" viewBox="0 0 64 64" aria-hidden="true"><path d="M31 50C20 43 11 36 11 25c0-7 5-12 12-12 4 0 7 2 9 6 2-4 5-6 9-6 7 0 12 5 12 12 0 5-2 9-6 13" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/><path d="M14 51L48 17" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/><path d="M42 17h9v9" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>}

function NavButton({active,onClick,icon,label}:{active:boolean;onClick:()=>void;icon:ReactNode;label:string}){const rendered=active&&isValidElement(icon)?cloneElement(icon as any,{stroke:'url(#knotNavGradient)' }):icon;return <button className={active?'nav-item active':'nav-item'} onClick={onClick}><span className="nav-icon">{rendered}</span><span>{label}</span></button>}

function Matches({matches,refresh,demo,onOpenChat}:{matches:any[];refresh:()=>Promise<void>;demo:boolean;onOpenChat:(p:DiscoverProfile)=>void}){const [busy,setBusy]=useState('');const list=demo?matches:matches;return <section className="normal-section"><div className="section-heading"><div><span>Your connections</span><h1>Matches</h1></div></div>{list.length===0?<div className="empty-state"><div>♥</div><h2>Nothing mutual yet</h2><p>When interest meets interest, your trial chat appears here</p></div>:<div className="list-grid">{list.map(m=>{const person=DEMO_DISCOVER_PROFILES.find(p=>p.id===m.other_id);return <div className="person-row" key={m.match_id}><Avatar path={m.other_photo_path}/><div><strong>{m.other_name}</strong><span>{m.state==='trial'?'Trial chat':'Coupled'}</span></div>{m.state==='trial'&&<button className="small-btn" onClick={()=>person&&onOpenChat(person)}>Open trial chat</button>}{!demo&&m.state!=='trial'&&<button className="small-btn" disabled={busy===m.match_id} onClick={async()=>{setBusy(m.match_id);await requestExclusive(m.match_id);await refresh();setBusy('')}}>Go Exclusive</button>}</div>})}</div>}</section>}

function Chats({chats,selected,setSelected,demo}:{chats:any[];selected:string|null;setSelected:(x:string|null)=>void;demo:boolean}){const chat=chats.find(x=>x.chat_id===selected);return <section className="normal-section"><div className="section-heading"><div><span>Mutual connections</span><h1>Trial chats</h1></div></div>{chat?<>{demo?<DemoChat chat={chat} back={()=>setSelected(null)}/>:<Chat chat={chat} back={()=>setSelected(null)}/>}</>:chats.length===0?<div className="empty-state"><MessageCircle/><h2>No chats yet</h2><p>A mutual connection opens a text-only trial chat</p></div>:<div className="list-grid">{chats.map(c=><button className="person-row chat-row" key={c.chat_id} onClick={()=>setSelected(c.chat_id)}><Avatar path={c.other_photo_path}/><div><strong>{c.other_name}</strong><span>{c.last_message||'Start the conversation'}</span></div><ChevronRight/></button>)}</div>}</section>}

function DemoChat({chat,back}:{chat:any;back:()=>void}){const [messages,setMessages]=useState<any[]>([{id:'welcome',sender_id:chat.other_id,body:'Hey — looks like we both wanted to connect ✨'},{id:'starter',sender_id:'me',body:'Hey!'}]);const [body,setBody]=useState('');const send=()=>{if(!body.trim())return;setMessages(m=>[...m,{id:crypto.randomUUID(),sender_id:'me',body:body.trim()}]);setBody('')};return <div className="chat-panel"><div className="chat-head"><button className="icon-btn" onClick={back}><ArrowLeft/></button><Avatar path={chat.other_photo_path}/><div><strong>{chat.other_name}</strong><span>Trial chat · text only</span></div></div><div className="messages">{messages.map(m=><div key={m.id} className={m.sender_id===chat.other_id?'bubble theirs':'bubble mine'}>{m.body}</div>)}</div><div className="chat-compose"><input value={body} onChange={e=>setBody(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')send()}} placeholder="Write a message" maxLength={4000}/><button className="primary-icon" onClick={send}><ChevronRight/></button></div></div>}

function Chat({chat,back}:{chat:any;back:()=>void}){const [messages,setMessages]=useState<any[]>([]);const [body,setBody]=useState('');const [sending,setSending]=useState(false);const load=async()=>setMessages(await getMessages(chat.chat_id));useEffect(()=>{void load()},[chat.chat_id]);useEffect(()=>{const timer=window.setInterval(()=>void load(),4000);return()=>window.clearInterval(timer)},[chat.chat_id]);const send=async()=>{if(!body.trim()||sending)return;setSending(true);try{await sendMessage(chat.chat_id,body);setBody('');await load()}finally{setSending(false)}};return <div className="chat-panel"><div className="chat-head"><button className="icon-btn" onClick={back}><ArrowLeft/></button><Avatar path={chat.other_photo_path}/><div><strong>{chat.other_name}</strong><span>Trial chat · text only</span></div></div><div className="messages">{messages.map(m=><div key={m.id} className={m.sender_id===chat.other_id?'bubble theirs':'bubble mine'}>{m.body}</div>)}</div><div className="chat-compose"><input value={body} onChange={e=>setBody(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void send()}} placeholder="Write a message" maxLength={4000}/><button className="primary-icon" onClick={send}><ChevronRight/></button></div></div>}

const DEMO_NOTIFICATIONS = [
  {id:'demo-notification-1',type:'match',title:'Mutual interest',body:'Maya returned your interest',personId:'demo-maya',read_at:null},
  {id:'demo-notification-2',type:'message',title:'New trial chat',body:'Your mutual connection is ready to start a conversation',personId:'demo-maya',chatId:'demo-chat-demo-maya',read_at:null},
]
function Notifications({items,onRead}:{items:any[];onRead:(id:string)=>Promise<void>}){return <section className="normal-section notifications-section"><div className="section-heading"><div><span>Activity</span><h1>Notifications</h1></div></div>{items.length===0?<div className="empty-state"><Bell/><h2>You’re all caught up</h2></div>:<div className="list-grid">{items.map(n=><button key={n.id} className={n.read_at?'notification-row':'notification-row unread'} onClick={()=>void onRead(n.id)}><div className="notification-icon">{n.type==='match'?<Heart/>:n.type==='message'?<MessageCircle/>:<Star/>}</div><div><strong>{n.title}</strong><span>{n.body}</span></div><ChevronRight/></button>)}</div>}</section>}
function PersonNotificationModal({person,onClose,onOpenDiscover,onOpenChat}:{person:DiscoverProfile;onClose:()=>void;onOpenDiscover:()=>void;onOpenChat:()=>void}){return <div className="modal-backdrop" onClick={onClose}><div className="person-notification-modal" onClick={e=>e.stopPropagation()}><button className="person-modal-close" onClick={onClose} aria-label="Close"><X/></button><img src={person.photoUrl||'/favicon.ico'} alt={person.name}/><div className="person-modal-body"><span className="person-modal-kicker">Mutual interest</span><h2>{person.name}, {person.age}</h2><p>{person.school}</p><div className="person-modal-chips">{person.interests.map(x=><span key={x}>{x}</span>)}</div><div className="person-modal-actions"><button className="secondary-btn" onClick={onClose}>Close</button><button className="secondary-btn" onClick={onOpenDiscover}>View card</button><button className="primary-btn" onClick={onOpenChat}>Start trial chat</button></div></div></div></div>}

function SecurityCenter({profile,onOpenProfile,onOpenNotifications}:{profile:Profile;onOpenProfile:()=>void;onOpenNotifications:()=>void}){
  return <section className="normal-section security-section">
    <div className="section-heading"><div><span>Privacy & control</span><h1>Safety & Security</h1></div></div>
    <div className="security-grid">
      <div className="security-card"><div className="security-icon"><Shield/></div><div><h2>Your account</h2><p>Your account is protected by Supabase authentication and server-side profile access</p></div><span className="status-pill">Active</span></div>
      <button className="security-card security-button" onClick={onOpenProfile}><div className="security-icon"><Lock/></div><div><h2>Privacy controls</h2><p>Manage Incognito mode and your profile visibility</p></div><ChevronRight/></button>
      <button className="security-card security-button" onClick={onOpenNotifications}><div className="security-icon"><Bell/></div><div><h2>Notifications</h2><p>Open your Knot activity and notification settings</p></div><ChevronRight/></button>
      <div className="security-card"><div className="security-icon"><Check/></div><div><h2>Age & identity verification</h2><p>{profile.verificationStatus==='verified'?'Verification complete':'Verification will be connected here before launch'}</p></div><span className="status-pill">{profile.verificationStatus==='verified'?'Verified':'Pending'}</span></div>
      <div className="security-card"><div className="security-icon"><UserRound/></div><div><h2>Discover visibility</h2><p>{profile.incognito?'Incognito is currently on':'Your profile can appear in Discover'}</p></div><span className="status-pill">{profile.incognito?'Hidden':'Visible'}</span></div>
    </div>
  </section>
}

function ProfileView({profile,onRefresh,onLogout}:{profile:Profile;onRefresh:()=>Promise<void>;onLogout:()=>Promise<void>}){
  const [city,setCity]=useState(profile.city)
  const [incognito,setIncognito]=useState(profile.incognito)
  const [saving,setSaving]=useState(false)
  const [pushBusy,setPushBusy]=useState(false)
  const [pushEnabled,setPushEnabled]=useState(false)
  const [pushMessage,setPushMessage]=useState('')

  useEffect(()=>{
    let mounted=true
    const check=async()=>{
      try{
        const registration=await navigator.serviceWorker?.getRegistration('/sw.js')
        const subscription=await registration?.pushManager.getSubscription()
        if(mounted)setPushEnabled(Boolean(subscription))
      }catch{}
    }
    void check()
    return()=>{mounted=false}
  },[])

  const save=async()=>{
    setSaving(true)
    try{
      await saveProfile({name:profile.name,photoPath:profile.photoPath,dob:profile.dob,gender:profile.gender,city,bio:profile.bio,intent:profile.intent,preference:profile.preference,ageMin:profile.ageMin,ageMax:profile.ageMax,theme:profile.theme,starColor:profile.starColor,incognito,interests:profile.interests,complete:true})
      await onRefresh()
    }finally{setSaving(false)}
  }

  const togglePush=async()=>{
    setPushBusy(true);setPushMessage('')
    try{
      if(pushEnabled){
        await disablePushNotifications()
        setPushEnabled(false)
        setPushMessage('Push notifications are off')
      }else{
        await enablePushNotifications()
        setPushEnabled(true)
        setPushMessage('Push notifications are on')
      }
    }catch(e:any){setPushMessage(e?.message||'Push notifications could not be changed')}finally{setPushBusy(false)}
  }

  return <section className="normal-section">
    <div className="section-heading"><div><span>Your space</span><h1>Profile</h1></div></div>
    <div className="profile-card">
      <div className="profile-hero"><Avatar path={profile.photoPath}/><div><h2>{profile.name}</h2><p>{profile.city}</p></div></div>
      <div className="profile-fields">
        <label>City<input list="knot-city-list-profile" value={city} onChange={e=>setCity(e.target.value)} placeholder="Search or type your city"/><datalist id="knot-city-list-profile">{cities.map((c,i)=><option key={`${c}-${i}`} value={c}/>)}</datalist></label>
        <div className="privacy-box"><Lock size={18}/><div><strong>Incognito</strong><p>Hide your profile from Discover</p></div><button className={`toggle ${incognito?'on':''}`} onClick={()=>setIncognito(!incognito)}><span/></button></div>
        <div className="profile-meta"><span>Age preference {profile.ageMin}–{profile.ageMax}</span><span>{profile.interests.length} interests</span></div>
        <button className="primary-btn" onClick={save} disabled={saving}>{saving?'Saving…':'Save profile'}</button>
        <div className="push-setting">
          <div className="push-setting-copy"><Bell size={18}/><div><strong>Push notifications</strong><p>{pushEnabled?'Get Knot updates even when the app is closed':'Stay updated when the app is closed'}</p></div></div>
          <button className={`toggle ${pushEnabled?'on':''}`} onClick={()=>void togglePush()} disabled={pushBusy}><span/></button>
        </div>
        {pushMessage&&<div className="success-box">{pushMessage}</div>}
        <button className="danger-link" onClick={()=>void onLogout()}><LogOut size={16}/> Sign out</button>
      </div>
    </div>
  </section>
}
function CreatorCenter({onBack}:{onBack:()=>void}){
  const [overview,setOverview]=useState<any>(null)
  const [users,setUsers]=useState<any[]>([])
  const [q,setQ]=useState('')
  const [selected,setSelected]=useState<any>(null)
  const [selectedA,setSelectedA]=useState<any>(null)
  const [selectedB,setSelectedB]=useState<any>(null)
  const [notice,setNotice]=useState('')
  const [loading,setLoading]=useState(true)
  const [loadError,setLoadError]=useState('')

  const load=async()=>{
    setLoading(true)
    setLoadError('')
    try{
      const [nextOverview,nextUsers]=await Promise.all([creatorOverview(),creatorUsers(q)])
      setOverview(nextOverview)
      setUsers(nextUsers)
    }catch(e:any){
      setLoadError(e?.message||'Creator data could not be loaded')
    }finally{setLoading(false)}
  }

  useEffect(()=>{void load()},[])

  return <div className="creator-shell">
    <header className="creator-header">
      <button className="creator-back" onClick={onBack}><ArrowLeft/> Knot</button>
      <div><span>Creator Command Center</span><h1>Cupid</h1></div>
      <div className="creator-lock"><Shield size={16}/> Protected</div>
    </header>
    <main className="creator-main">
      {notice&&<div className="creator-notice">{notice}</div>}
      {loadError&&<div className="error-box">{loadError}</div>}
      <div className="metric-grid">{[['Users',overview?.users],['Eligible',overview?.eligible],['Active',overview?.active],['Trial matches',overview?.trial_matches],['Couples',overview?.couples],['Open reports',overview?.open_reports],['Banned',overview?.banned]].map(([a,b])=><div className="metric" key={a as string}><span>{a}</span><strong>{b??'—'}</strong></div>)}</div>
      <div className="creator-grid">
        <section className="creator-panel">
          <div className="panel-head"><div><span>Account controls</span><h2>Users</h2></div><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void load()}} placeholder="Search name or city"/></div>
          {loading?<div className="empty-state compact"><div className="loader-dot"/><p>Loading creator data…</p></div>:<div className="admin-list">{users.map(u=><div className="admin-user" key={u.id}><div><strong>{u.name||'Unnamed'}</strong><span>{u.city||'No city'} · {u.relationship_state} · {u.eligibility}</span></div><div className="admin-actions"><button onClick={()=>setSelected(u)}>Open</button><button onClick={()=>setSelectedA(u)} className={selectedA?.id===u.id?'selected-admin':''}>A</button><button onClick={()=>setSelectedB(u)} className={selectedB?.id===u.id?'selected-admin':''}>B</button><button onClick={async()=>{await creatorBanUser(u.id,'temporary',24,'Safety review','Creator action');setNotice('Temporary ban applied');await load()}} className="ban-btn">Ban 24h</button>{u.relationship_state==='banned'&&<button onClick={async()=>{await creatorUnbanUser(u.id);setNotice('User restored');await load()}}>Restore</button>}</div></div>)}</div>}
        </section>
        <section className="creator-panel">
          <div className="panel-head"><div><span>Founder powers</span><h2>Quiet Cupid tools</h2></div></div>
          <div className="creator-tool"><Zap/><div><strong>Cupid Spark</strong><p>Give a pair a gentle discovery nudge without forcing a match or revealing private interest</p></div>{selectedA&&selectedB&&selectedA.id!==selectedB.id&&<button onClick={async()=>{await creatorSpark(selectedA.id,selectedB.id);setNotice('Spark queued')}}>Spark selected pair</button>}</div>
          <div className="creator-tool"><Shield/><div><strong>Privacy boundary</strong><p>Secret Crush records and private chat bodies are not available in this command center</p></div><Check/></div>
        </section>
      </div>
      {selected&&<div className="creator-drawer"><button onClick={()=>setSelected(null)} aria-label="Close user details"><X/></button><h2>{selected.name||'User'}</h2><p>{selected.city}</p><div className="drawer-facts"><span>{selected.eligibility}</span><span>{selected.relationship_state}</span><span>{selected.verification_status}</span></div></div>}
    </main>
  </div>
}

function Avatar({path}:{path:string|null}){const [url,setUrl]=useState<string|null>(null);useEffect(()=>{if(!path){setUrl(null);return}if(path.startsWith('/')||path.startsWith('http')){setUrl(path);return}void getPhotoUrl(path).then(setUrl)},[path]);return <div className="avatar">{url?<img src={url} alt=""/>:<UserRound size={20}/>}</div>}
function Blocked(){return <div className="blocked-page knot-welcome"><div className="blocked-card"><div className="blocked-star">✦</div><h1>Sorry, Knot isn’t available for you yet</h1><p>Knot is currently available only to people aged 18 through 21</p><Shield size={18}/></div></div>}
function urlBase64ToUint8Array(base64String:string){const padding='='.repeat((4-base64String.length%4)%4);const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');const rawData=window.atob(base64);return Uint8Array.from([...rawData].map(c=>c.charCodeAt(0)))}

export default KnotApp
