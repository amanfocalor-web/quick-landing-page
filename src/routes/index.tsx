import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState, type FormEvent, type PointerEvent, type ReactNode } from 'react'
import { ArrowLeft, Bell, Camera, Check, ChevronRight, Heart, Lock, LogOut, MessageCircle, Shield, Sparkles, Star, UserRound, X, Zap } from 'lucide-react'
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
type HomeTab = 'discover' | 'matches' | 'chats' | 'profile' | 'notifications'

const interestOptions = ['Music','Photography','Movies','Coffee','Football','Gaming','Art','Books','Dance','Travel','Tech','Food','Fitness','Writing','Design','Volunteering']
const cities = ['Chennai','Bengaluru','Delhi','Kochi','Mumbai','Hyderabad','Pune','Kolkata','Ahmedabad','Jaipur']

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

  const load = async () => {
    setBusy(true); setError('')
    try {
      const { data } = await getSession()
      if (!data.session) { setScreen('welcome'); return }
      const me = await getMyProfile()
      setProfile(me)
      if (me?.eligibility === 'ineligible') { setScreen('blocked'); return }
      setCreator(await isCreator())
      setScreen(me?.profileComplete ? 'home' : 'profile')
    } catch (e: any) {
      setError(e?.message || 'Knot could not load right now')
    } finally { setBusy(false) }
  }

  useEffect(() => { void load() }, [])

  if (busy) return <div className="knot-loading"><div className="knot-logo">Knot</div><div className="loader-dot" /></div>
  if (screen === 'blocked') return <Blocked />
  if (screen === 'welcome') return <div className={welcomePreview ? 'welcome-stage transitioning' : 'welcome-stage'}>
    {welcomePreview && <div className="welcome-destination"><ProfileSetup existing={profile} preAuth={!profile} error={error} setError={setError} onAuthNeeded={() => { setWelcomePreview(false); setAuthMode('signup'); setScreen('auth') }} onDone={async () => { setWelcomePreview(false); await load() }} onLogout={async () => { setWelcomePreview(false); setScreen('welcome') }} /></div>}
    <Welcome onBegin={() => setWelcomePreview(true)} onComplete={() => { setScreen('profile') }} />
  </div>
  if (screen === 'auth') return <Auth mode={authMode} setMode={setAuthMode} email={email} setEmail={setEmail} password={password} setPassword={setPassword} error={error} setError={setError} message={message} setMessage={setMessage} onDone={load} />
  if (screen === 'profile') return <ProfileSetup existing={profile} preAuth={!profile} error={error} setError={setError} onAuthNeeded={() => { setAuthMode('signup'); setScreen('auth') }} onDone={async () => { await load() }} onLogout={async () => { await signOut(); setScreen('welcome') }} />
  if (screen === 'creator') return <CreatorCenter onBack={() => setScreen('home')} />
  return <Home profile={profile!} tab={tab} setTab={setTab} creator={creator} onCreator={() => setScreen('creator')} onRefresh={load} onLogout={async () => { await signOut(); setProfile(null); setScreen('welcome') }} />
}

function Welcome({ onBegin, onComplete }: { onBegin: () => void; onComplete: () => void }) {
  const [expanding, setExpanding] = useState(false)
  const begin = () => {
    if (expanding) return
    setExpanding(true)
    onBegin()
    window.setTimeout(onComplete, 1180)
  }

  return <div className={`welcome knot-welcome ${expanding ? 'welcome-expanding' : ''}`}>
    <div className="welcome-nebula welcome-nebula-left" aria-hidden="true" />
    <div className="welcome-nebula welcome-nebula-right" aria-hidden="true" />
    <div className="star-field">{[[7,13],[16,29],[27,9],[39,21],[52,11],[66,17],[81,8],[92,25],[11,44],[23,58],[35,39],[48,49],[61,34],[74,54],[88,42],[96,67],[6,76],[19,87],[31,70],[44,82],[57,73],[69,91],[83,78],[94,88],[13,7],[30,31],[46,6],[63,27],[78,36],[89,14],[4,56],[17,72],[28,51],[41,64],[55,43],[68,61],[80,69],[91,53],[9,94],[25,80],[38,93],[50,60],[64,84],[76,75],[87,95],[98,46]].map(([left,top],i)=><span key={i} className={`tiny-star star-${i%5}`} style={{left:`${left}%`,top:`${top}%`,animationDelay:`${(i%9)*.37}s`}}>✦</span>)}</div>

    <main className="welcome-center">
      <h1>You might be closer<br />than you think<span className="title-dot">.</span></h1>
      <div className="welcome-kicker">Welcome to Knot<span>.</span></div>
      <button className="welcome-star" onClick={begin} aria-label="Begin Knot">
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

function Auth({ mode,setMode,email,setEmail,password,setPassword,error,setError,message,setMessage,onDone }: any) {
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setMessage('')
    try {
      const result = mode==='signup' ? await signUp(email,password) : await signIn(email,password)
      if (result.error) throw result.error
      if (mode==='signup' && !result.data.session) setMessage('Check your email to confirm your Knot account')
      else await onDone()
    } catch (e:any) { setError(e?.message || 'Something went wrong') }
  }
  return <div className="auth-page knot-welcome"><div className="auth-card">
    <button className="ghost-back" onClick={() => setMode('signup')}>Knot</button>
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

function ProfileSetup({ existing,preAuth=false,error,setError,onDone,onLogout,onAuthNeeded }: any) {
  const [step,setStep]=useState(1)
  const [finishing,setFinishing]=useState(false)
  const draft = (() => { if (existing || typeof window === 'undefined') return null; try { return JSON.parse(window.sessionStorage.getItem('knot_profile_draft') || 'null') } catch { return null } })()
  const [name,setName]=useState(existing?.name||draft?.name||'')
  const [photoPath,setPhotoPath]=useState<string|null>(existing?.photoPath||null)
  const [photoUrl,setPhotoUrl]=useState<string|null>(null)
  const [dob,setDob]=useState(existing?.dob||draft?.dob||'')
  const [city,setCity]=useState(existing?.city||draft?.city||'Chennai')
  const [bio,setBio]=useState(existing?.bio||draft?.bio||'')
  const [interests,setInterests]=useState<string[]>(existing?.interests||draft?.interests||[])
  const [intent,setIntent]=useState(existing?.intent||draft?.intent||'')
  const [preference,setPreference]=useState(existing?.preference||draft?.preference||'')
  const [ageMin,setAgeMin]=useState(existing?.ageMin||draft?.ageMin||18)
  const [ageMax,setAgeMax]=useState(existing?.ageMax||draft?.ageMax||21)
  const [theme,setTheme]=useState<'light'|'dark'>(existing?.theme||draft?.theme||'dark')
  const [starColor,setStarColor]=useState(existing?.starColor||draft?.starColor||'#c084fc')
  const [incognito,setIncognito]=useState(existing?.incognito||draft?.incognito||false)
  const [saving,setSaving]=useState(false)
  const fileRef=useRef<HTMLInputElement>(null)
  const videoRef=useRef<HTMLVideoElement>(null)
  const streamRef=useRef<MediaStream|null>(null)
  const [camera,setCamera]=useState(false)
  const [cameraImage,setCameraImage]=useState<string|null>(null)

  useEffect(()=>{ if(photoPath) void getPhotoUrl(photoPath).then(setPhotoUrl) },[photoPath])
  useEffect(()=>()=>streamRef.current?.getTracks().forEach(t=>t.stop()),[])

  const chooseFile=async(file?:File)=>{ if(!file)return; try{ if(preAuth){setPhotoPath(null);setPhotoUrl(URL.createObjectURL(file));setError('');return} const p=await uploadProfilePhoto(file);setPhotoPath(p);setError('') }catch(e:any){setError(e?.message||'Photo upload failed')} }
  const startCamera=async()=>{try{const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});streamRef.current=stream;if(videoRef.current){videoRef.current.srcObject=stream;await videoRef.current.play()}setCamera(true)}catch{setError('Camera permission was not granted') }}
  const capture=async()=>{const video=videoRef.current;if(!video)return;const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;canvas.getContext('2d')?.drawImage(video,0,0);const blob=await new Promise<Blob|null>(r=>canvas.toBlob(r,'image/jpeg',.9));if(blob){setCameraImage(canvas.toDataURL('image/jpeg'));if(preAuth){setPhotoPath(null);setPhotoUrl(canvas.toDataURL('image/jpeg'))}else{await chooseFile(new File([blob],'camera.jpg',{type:'image/jpeg'}))}}streamRef.current?.getTracks().forEach(t=>t.stop());setCamera(false)}
  const finish=async()=>{setSaving(true);setError('');try{if(preAuth){window.sessionStorage.setItem('knot_profile_draft',JSON.stringify({name,dob,city,bio,interests,intent,preference,ageMin,ageMax,theme,starColor,incognito}));onAuthNeeded?.();return}const saved=await saveProfile({name,photoPath,dob,city,bio,intent,preference,ageMin,ageMax,theme,starColor,incognito,interests,complete:true});window.sessionStorage.removeItem('knot_profile_draft');if((saved as any).eligibility==='ineligible'){onDone();return}setFinishing(true);window.setTimeout(()=>void onDone(),900)}catch(e:any){setError(e?.message?.includes('KNOT_AGE_INELIGIBLE')?'Sorry, Knot isn\'t available for you yet':e?.message||'Could not save your profile');setSaving(false)}}
  const next=()=>setStep(s=>Math.min(7,s+1)), back=()=>setStep(s=>Math.max(1,s-1))
  const toggleInterest=(x:string)=>setInterests(a=>a.includes(x)?a.filter(v=>v!==x):a.length<8?[...a,x]:a)

  const stepTitle=['','Your name and photo','A couple of basics','Your interests','What are you looking for','Your discovery preferences','Your look','Your Knot is ready'][step]
  return <div className={`profile-page ${theme==='light'?'light':''} ${finishing?'profile-finishing':''}`}>
    {finishing&&<div className="profile-complete-transition" aria-hidden="true"><div className="transition-star" style={{color:starColor}}>✦</div></div>}
    <header className="setup-header"><button className="knot-word" onClick={onLogout}>Knot</button><span>{step}/7</span></header>
    <div className="setup-wrap"><div className="setup-progress"><span style={{width:`${(step/7)*100}%`}}/></div><section className="setup-card"><div className="setup-eyebrow">Profile setup</div><h1>{stepTitle}</h1>
      {step===1&&<div className="setup-content"><label>Your name<input value={name} onChange={e=>setName(e.target.value)} placeholder="What should people call you?"/></label><div className="photo-picker"><div className="avatar-preview">{photoUrl?<img src={photoUrl} alt="Profile preview"/>:<UserRound size={42}/>}</div><div><strong>Profile photo</strong><p>Choose one from your device or use your camera</p><div className="inline-actions"><button className="secondary-btn" onClick={()=>fileRef.current?.click()}>Upload</button><button className="secondary-btn" onClick={startCamera}><Camera size={17}/> Camera</button></div></div><input ref={fileRef} hidden type="file" accept="image/*" onChange={e=>chooseFile(e.target.files?.[0])}/></div>{camera&&<div className="camera-box"><video ref={videoRef} muted playsInline/><button className="primary-btn" onClick={capture}>Capture</button></div>}{cameraImage&&<div className="camera-note"><Check size={16}/> Photo captured</div>}</div>}
      {step===2&&<div className="setup-content two-col"><label>Date of birth<input type="date" value={dob} onChange={e=>setDob(e.target.value)}/><small>Knot is currently available only to people aged 18 through 21</small></label><label>City<select value={city} onChange={e=>setCity(e.target.value)}>{cities.map(c=><option key={c}>{c}</option>)}</select><small>Your city is used for Discover and is not shown on suggestion cards</small></label></div>}
      {step===3&&<div className="setup-content"><div className="verification-placeholder"><Shield size={28}/><div><strong>Identity verification</strong><p>The DigiLocker and live-camera verification connection will be plugged in here</p></div><span>Integration point</span></div><label>Bio<textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={500} placeholder="A little about you"/></label><div><strong>Interests</strong><div className="chip-grid">{interestOptions.map(x=><button key={x} className={interests.includes(x)?'chip active':'chip'} onClick={()=>toggleInterest(x)}>{x}</button>)}</div></div></div>}
      {step===4&&<div className="setup-content"><label>What are you looking for<select value={intent} onChange={e=>setIntent(e.target.value)}><option value="">Choose one</option><option>Something meaningful</option><option>Open to seeing where it goes</option><option>New connections</option></select></label><label>Preferences<input value={preference} onChange={e=>setPreference(e.target.value)} placeholder="What matters to you?"/></label></div>}
      {step===5&&<div className="setup-content"><div><strong>Preferred age range</strong><div className="range-row"><select value={ageMin} onChange={e=>setAgeMin(Number(e.target.value))}>{[18,19,20,21].map(x=><option key={x}>{x}</option>)}</select><span>to</span><select value={ageMax} onChange={e=>setAgeMax(Number(e.target.value))}>{[18,19,20,21].filter(x=>x>=ageMin).map(x=><option key={x}>{x}</option>)}</select></div></div><div className="privacy-box"><Lock size={18}/><div><strong>Incognito mode</strong><p>Stay out of Discover until you turn it off</p></div><button className={`toggle ${incognito?'on':''}`} onClick={()=>setIncognito(!incognito)}><span/></button></div></div>}
      {step===6&&<div className="setup-content"><div><strong>Theme</strong><div className="theme-row"><button className={theme==='dark'?'theme-choice active':'theme-choice'} onClick={()=>setTheme('dark')}>Dark</button><button className={theme==='light'?'theme-choice active':'theme-choice'} onClick={()=>setTheme('light')}>Light</button></div></div><div><strong>Star colour</strong><div className="star-colors">{['#c084fc','#60a5fa','#fb7185','#facc15','#34d399'].map(c=><button key={c} style={{background:c}} className={starColor===c?'star-choice active':'star-choice'} onClick={()=>setStarColor(c)}>✦</button>)}</div></div></div>}
      {step===7&&<div className="ready-state"><div className="ready-star" style={{color:starColor}}>✦</div><h2>Your Knot is ready</h2><p>Discover people, move at your own pace, and keep unreturned interest private</p></div>}
      {error&&<div className="error-box">{error}</div>}
      <div className="setup-actions">{step>1&&<button className="secondary-btn" onClick={back}>Back</button>}<button className="primary-btn" disabled={saving||!name.trim()||(step===2&&!dob)||(step===7&&saving)} onClick={step===7?finish:next}>{saving?'Saving…':step===7?'Enter Discover':'Continue'} <ChevronRight size={18}/></button></div>
    </section></div>
  </div>
}

function Home({ profile,tab,setTab,creator,onCreator,onRefresh,onLogout }: { profile:Profile;tab:HomeTab;setTab:(x:HomeTab)=>void;creator:boolean;onCreator:()=>void;onRefresh:()=>Promise<void>;onLogout:()=>Promise<void> }) {
  const [discover,setDiscover]=useState<DiscoverProfile[]>([])
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
  const loadData=async()=>{try{if(tab==='discover')setDiscover(await getDiscover());if(tab==='matches')setMatches(await getMatches());if(tab==='chats')setChats(await getChats());if(tab==='notifications')setNotifications(await getNotifications())}catch(e:any){setError(e?.message||'Could not load this section')}}
  useEffect(()=>{void loadData()},[tab])
  const current=discover[index]
  const act=async(action:'pass'|'interested'|'cupid')=>{if(!current)return;setAnimation(action);try{if(action==='cupid')await secretCrush(current.id);else await discoveryAction(current.id,action)}catch(e:any){setError(e?.message||'Action could not be saved')}setTimeout(()=>{setAnimation(null);setFlipped(false);setDragX(0);setIndex(i=>i+1)},550)}
  const pointerDown=(e:PointerEvent<HTMLDivElement>)=>{if(!flipped||animation)return;e.currentTarget.setPointerCapture(e.pointerId);setDragging(true)}
  const pointerMove=(e:PointerEvent<HTMLDivElement>)=>{if(!dragging)return;const r=e.currentTarget.getBoundingClientRect();setDragX(Math.max(-180,Math.min(180,e.clientX-(r.left+r.width/2))))}
  const pointerUp=()=>{if(!dragging)return;setDragging(false);if(dragX<-90)void act('pass');else if(dragX>90)void act('interested');else setDragX(0)}
  return <div className={`app-shell ${profile.theme==='light'?'light':''}`} style={{'--star':profile.starColor} as any}>
    <header className="app-header"><button className="knot-word" onClick={()=>setTab('discover')}>Knot</button><div className="header-actions">{creator&&<button className="header-pill creator-pill" onClick={onCreator}><Sparkles size={16}/> Cupid</button>}<button className="icon-btn" onClick={()=>setTab('notifications')}><Bell size={19}/>{notifications.some(n=>!n.read_at)&&<i/>}</button><button className="icon-btn" onClick={()=>setTab('profile')}><UserRound size={19}/></button></div></header>
    <main className="app-main">
      {tab==='discover'&&<section className="discover-section"><div className="section-heading"><div><span>Discover</span><h1>Someone you might know</h1></div><div className="privacy-chip"><Lock size={13}/> Private by design</div></div>{error&&<div className="error-box">{error}</div>}{current?<div className="card-wrap"><div className={`discover-card ${flipped?'flipped':''} ${animation?`anim-${animation}`:''}`} style={{transform:animation?undefined:`translateX(${dragX}px) rotate(${dragX/18}deg)`}} onClick={()=>{if(Math.abs(dragX)<10)setFlipped(!flipped)}} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}><div className="card-face card-front"><img src={current.photoUrl||'/favicon.ico'} alt="Profile"/><div className="photo-shade"/><div className="card-name">{current.name}<span>{current.age}</span></div></div><div className="card-face card-back"><div className="back-top"><div className="mini-avatar">{current.photoUrl?<img src={current.photoUrl} alt=""/>:<UserRound/>}</div><div><strong>{current.name}</strong><span>{current.age}</span></div></div><p className="back-bio">Interests and preferences</p><div className="back-chips">{current.interests.map(x=><span key={x}>{x}</span>)}</div><div className="swipe-hint"><span>← SWIPE PASS</span><span>SWIPE → INTERESTED</span></div><button className="cupid-btn" onClick={(e)=>{e.stopPropagation();void act('cupid')}} aria-label="Secret Crush">💘</button></div></div>{animation==='pass'&&<div className="anim-overlay split-heart">♥</div>}{animation==='interested'&&<div className="anim-overlay half-heart">♥</div>}{animation==='cupid'&&<div className="anim-overlay cupid-heart">💘</div>}</div>:<div className="empty-state"><div>✦</div><h2>That’s everyone for now</h2><p>Try again later or adjust your discovery preferences</p></div>}</section>}
      {tab==='matches'&&<Matches matches={matches} refresh={loadData}/>} 
      {tab==='chats'&&<Chats chats={chats} selected={selectedChat} setSelected={setSelectedChat}/>} 
      {tab==='notifications'&&<Notifications items={notifications} onRead={async(id)=>{await markNotificationRead(id);await loadData()}}/>}
      {tab==='profile'&&<ProfileView profile={profile} onRefresh={onRefresh} onLogout={onLogout}/>} 
    </main>
    <nav className="bottom-nav"><NavButton active={tab==='discover'} onClick={()=>setTab('discover')} icon={<Sparkles/>} label="Discover"/><NavButton active={tab==='matches'} onClick={()=>setTab('matches')} icon={<Heart/>} label="Matches"/><NavButton active={tab==='chats'} onClick={()=>setTab('chats')} icon={<MessageCircle/>} label="Chats"/><NavButton active={tab==='profile'} onClick={()=>setTab('profile')} icon={<UserRound/>} label="Profile"/></nav>
  </div>
}

function NavButton({active,onClick,icon,label}:{active:boolean;onClick:()=>void;icon:ReactNode;label:string}){return <button className={active?'nav-item active':'nav-item'} onClick={onClick}>{icon}<span>{label}</span></button>}

function Matches({matches,refresh}:{matches:any[];refresh:()=>Promise<void>}){const [busy,setBusy]=useState('');return <section className="normal-section"><div className="section-heading"><div><span>Your connections</span><h1>Matches</h1></div></div>{matches.length===0?<div className="empty-state"><div>♥</div><h2>Nothing mutual yet</h2><p>When interest meets interest, your trial chat appears here</p></div>:<div className="list-grid">{matches.map(m=><div className="person-row" key={m.match_id}><Avatar path={m.other_photo_path}/><div><strong>{m.other_name}</strong><span>{m.state==='trial'?'Trial chat':'Coupled'}</span></div>{m.state==='trial'&&<button className="small-btn" disabled={busy===m.match_id} onClick={async()=>{setBusy(m.match_id);await requestExclusive(m.match_id);await refresh();setBusy('')}}>Go Exclusive</button>}</div>)}</div>}</section>}

function Chats({chats,selected,setSelected}:{chats:any[];selected:string|null;setSelected:(x:string|null)=>void}){const chat=chats.find(x=>x.chat_id===selected);return <section className="normal-section"><div className="section-heading"><div><span>Mutual connections</span><h1>Trial chats</h1></div></div>{chat?<Chat chat={chat} back={()=>setSelected(null)}/>:chats.length===0?<div className="empty-state"><MessageCircle/><h2>No chats yet</h2><p>A mutual connection opens a text-only trial chat</p></div>:<div className="list-grid">{chats.map(c=><button className="person-row chat-row" key={c.chat_id} onClick={()=>setSelected(c.chat_id)}><Avatar path={c.other_photo_path}/><div><strong>{c.other_name}</strong><span>{c.last_message||'Start the conversation'}</span></div><ChevronRight/></button>)}</div>}</section>}

function Chat({chat,back}:{chat:any;back:()=>void}){const [messages,setMessages]=useState<any[]>([]);const [body,setBody]=useState('');const [sending,setSending]=useState(false);const load=async()=>setMessages(await getMessages(chat.chat_id));useEffect(()=>{void load()},[chat.chat_id]);useEffect(()=>{const timer=window.setInterval(()=>void load(),4000);return()=>window.clearInterval(timer)},[chat.chat_id]);const send=async()=>{if(!body.trim()||sending)return;setSending(true);try{await sendMessage(chat.chat_id,body);setBody('');await load()}finally{setSending(false)}};return <div className="chat-panel"><div className="chat-head"><button className="icon-btn" onClick={back}><ArrowLeft/></button><Avatar path={chat.other_photo_path}/><div><strong>{chat.other_name}</strong><span>Trial chat · text only</span></div></div><div className="messages">{messages.map(m=><div key={m.id} className={m.sender_id===chat.other_id?'bubble theirs':'bubble mine'}>{m.body}</div>)}</div><div className="chat-compose"><input value={body} onChange={e=>setBody(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void send()}} placeholder="Write a message" maxLength={4000}/><button className="primary-icon" onClick={send}><ChevronRight/></button></div></div>}

function Notifications({items,onRead}:{items:any[];onRead:(id:string)=>Promise<void>}){return <section className="normal-section"><div className="section-heading"><div><span>Updates</span><h1>Notifications</h1></div></div>{items.length===0?<div className="empty-state"><Bell/><h2>You’re all caught up</h2></div>:<div className="list-grid">{items.map(n=><button key={n.id} className={n.read_at?'notification-row':'notification-row unread'} onClick={()=>void onRead(n.id)}><div className="notification-icon">{n.type==='match'?<Heart/>:n.type==='message'?<MessageCircle/>:<Star/>}</div><div><strong>{n.title}</strong><span>{n.body}</span></div></button>)}</div>}</section>}

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
      await saveProfile({name:profile.name,photoPath:profile.photoPath,dob:profile.dob,city,bio:profile.bio,intent:profile.intent,preference:profile.preference,ageMin:profile.ageMin,ageMax:profile.ageMax,theme:profile.theme,starColor:profile.starColor,incognito,interests:profile.interests,complete:true})
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
        <label>City<select value={city} onChange={e=>setCity(e.target.value)}>{cities.map(c=><option key={c}>{c}</option>)}</select></label>
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

function Avatar({path}:{path:string|null}){const [url,setUrl]=useState<string|null>(null);useEffect(()=>{if(path)void getPhotoUrl(path).then(setUrl)},[path]);return <div className="avatar">{url?<img src={url} alt=""/>:<UserRound size={20}/>}</div>}
function Blocked(){return <div className="blocked-page knot-welcome"><div className="blocked-card"><div className="blocked-star">✦</div><h1>Sorry, Knot isn’t available for you yet</h1><p>Knot is currently available only to people aged 18 through 21</p><Shield size={18}/></div></div>}
function urlBase64ToUint8Array(base64String:string){const padding='='.repeat((4-base64String.length%4)%4);const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');const rawData=window.atob(base64);return Uint8Array.from([...rawData].map(c=>c.charCodeAt(0)))}

export default KnotApp
