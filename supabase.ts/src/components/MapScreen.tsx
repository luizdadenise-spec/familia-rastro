import { useEffect, useRef, useState, useMemo } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import type { Circle, Member } from '../supabase'
import { supabase } from '../supabase'

import 'leaflet/dist/leaflet.css'

interface MapScreenProps {
  circle: Circle
  members: Member[]
  youMember: Member | null
  onLeave: () => void
}

function createMemberIcon(member: Member): L.DivIcon {
  const isSos = member.sos_active
  const initials = member.name.charAt(0).toUpperCase()

  if (isSos) {
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <div class="sos-pulse" style="position: absolute; width: 56px; height: 56px; background: #ef4444; border-radius: 50%; opacity: 0.3;"></div>
          <div style="width: 44px; height: 44px; background: #ef4444; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 12px rgba(239,68,68,0.5); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 18px; font-family: Inter, sans-serif;">
            ${initials}
          </div>
        </div>
      `,
      iconSize: [56, 56],
      iconAnchor: [28, 28],
    })
  }

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position: relative;">
        <div style="width: 40px; height: 40px; background: ${member.avatar_color || '#3b82f6'}; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 16px; font-family: Inter, sans-serif;">
          ${initials}
        </div>
        <div style="position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%); width: 16px; height: 8px; background: ${member.avatar_color || '#3b82f6'}; border-radius: 50%; filter: blur(2px); opacity: 0.4;"></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

function RecenterMap({ members, targetCoords }: { members: Member[]; targetCoords: { lat: number; lng: number } | null }) {
  const map = useMap()
  const hasCenteredRef = useRef(false)

  useEffect(() => {
    if (targetCoords) {
      map.setView([targetCoords.lat, targetCoords.lng], 15)
      return
    }

    if (members.length === 0 || hasCenteredRef.current) return

    const validMembers = members.filter((m) => m.lat && m.lng)
    if (validMembers.length === 0) return

    if (validMembers.length === 1) {
      map.setView([validMembers[0].lat!, validMembers[0].lng!], 14)
    } else {
      const bounds = L.latLngBounds(validMembers.map((m) => [m.lat!, m.lng!]))
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15 })
    }
    hasCenteredRef.current = true
  }, [members, map, targetCoords])

  return null
}

export default function MapScreen({ circle, members, youMember, onLeave }: MapScreenProps) {
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)

  const updateMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não é suportada pelo seu navegador.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setUserCoords({ lat, lng })

        let batteryLevel = 100
        if ('getBattery' in navigator) {
          try {
            // @ts-ignore
            const battery = await navigator.getBattery()
            batteryLevel = Math.round(battery.level * 100)
          } catch {
            batteryLevel = 100
          }
        }

        if (youMember) {
          await supabase
            .from('members')
            .update({
              lat,
              lng,
              battery: batteryLevel,
              last_seen: new Date().toISOString(),
            })
            .eq('id', youMember.id)
        }
      },
      (error) => {
        console.error('Erro ao obter GPS:', error)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  useEffect(() => {
    updateMyLocation()
    const interval = setInterval(updateMyLocation, 15000)
    return () => clearInterval(interval)
  }, [youMember])

  const validMembers = useMemo(() => members.filter((m) => m.lat && m.lng), [members])
  const activeSosMembers = useMemo(() => members.filter((m) => m.sos_active), [members])

  const handleSos = async () => {
    if (!youMember) return

    const newState = !youMember.sos_active
    const updates: Partial<Member> = {
      sos_active: newState,
      sos_triggered_at: newState ? new Date().toISOString() : null,
    }

    if (newState) {
      await supabase.from('sos_events').insert({
        circle_id: circle.id,
        member_id: youMember.id,
        member_name: youMember.name,
        lat: youMember.lat,
        lng: youMember.lng,
      })
    }

    await supabase.from('members').update(updates).eq('id', youMember.id)
  }

  const onlineCount = members.filter((m) => {
    if (!m.last_seen) return false
    const lastSeen = new Date(m.last_seen).getTime()
    return Date.now() - lastSeen < 10 * 60 * 1000
  }).length

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-900">
      {/* Top bar com z-index ultra alto para garantir precedência de toque */}
      <div 
        className="absolute top-0 left-0 right-0" 
        style={{ zIndex: 99999, pointerEvents: 'auto' }}
      >
        <div className="bg-slate-900/90 backdrop-blur-lg border-b border-slate-700/50 px-4 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            {/* Botão de mira com escuta direta de toque nativa */}
            <button
              onTouchStart={(e) => {
                e.stopPropagation()
                updateMyLocation()
              }}
              onClick={(e) => {
                e.stopPropagation()
                updateMyLocation()
              }}
              className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer"
              style={{ pointerEvents: 'auto' }}
              title="Centralizar e atualizar minha localização"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
              </svg>
            </button>
            <div>
              <h2 className="text-white font-semibold text-sm leading-tight">{circle.name}</h2>
              <p className="text-slate-400 text-xs leading-tight">
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  {onlineCount} {onlineCount === 1 ? 'membro online' : 'membros online'}
                </span>
              </p>
            </div>
          </div>
          <button
            onTouchStart={(e) => {
              e.stopPropagation()
              onLeave()
            }}
            onClick={(e) => {
              e.stopPropagation()
              onLeave()
            }}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors active:scale-95 cursor-pointer"
            style={{ pointerEvents: 'auto' }}
            aria-label="Sair do círculo"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* SOS alert banner */}
      {activeSosMembers.length > 0 && (
        <div className="absolute top-[64px] left-0 right-0" style={{ zIndex: 99998 }}>
          <div className="bg-red-600/95 backdrop-blur-lg px-4 py-2.5 flex items-center gap-2 shadow-lg">
            <svg className="w-5 h-5 text-white animate-pulse" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-white text-sm font-medium flex-1">
              {activeSosMembers.length === 1
                ? `${activeSosMembers[0].name} enviou um alerta SOS!`
                : `${activeSosMembers.length} alertas SOS ativos`}
            </p>
          </div>
        </div>
      )}

      {/* Map Container Dark Theme */}
      <MapContainer
        center={[-23.5505, -46.6333]}
        zoom={13}
        zoomControl={false}
        className="w-full h-full"
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />
        {validMembers.map((member) => (
          <Marker
            key={member.id}
            position={[member.lat!, member.lng!]}
            icon={createMemberIcon(member)}
          >
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif', minWidth: '140px' }}>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b', marginBottom: '4px' }}>
                  {member.name}
                  {member.is_you && <span style={{ color: '#3b82f6', fontSize: '11px', marginLeft: '6px' }}>(Você)</span>}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  <span>Bateria: {member.battery}%</span>
                </div>
                {member.sos_active && (
                  <div style={{ marginTop: '6px', padding: '4px 8px', background: '#ef4444', color: 'white', borderRadius: '6px', fontSize: '11px', fontWeight: 600, textAlign: 'center' }}>
                    SOS ATIVO
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
        <RecenterMap members={members} targetCoords={userCoords} />
      </MapContainer>

      {/* SOS Button Overlay */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center" style={{ zIndex: 99999 }}>
        <button
          onTouchStart={(e) => {
            e.stopPropagation()
            handleSos()
          }}
          onClick={(e) => {
            e.stopPropagation()
            handleSos()
          }}
          className={`px-8 py-4 rounded-full font-bold text-white shadow-2xl transition-all flex items-center gap-3 text-lg cursor-pointer
            ${youMember?.sos_active
              ? 'bg-red-600 hover:bg-red-700 animate-pulse shadow-red-500/50 ring-4 ring-red-400/30'
              : 'bg-red-500 hover:bg-red-600 shadow-red-500/40 active:scale-95'
            }
          `}
          style={{ pointerEvents: 'auto' }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {youMember?.sos_active ? 'CANCELAR SOS' : 'BOTÃO SOS'}
        </button>
      </div>
    </div>
  )
}