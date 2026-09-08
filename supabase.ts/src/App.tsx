import { useState, useEffect } from 'react'
import { supabase, type Circle, type Member } from './supabase'
import LoginScreen from './components/LoginScreen'
import MapScreen from './components/MapScreen'

export default function App() {
  const [circle, setCircle] = useState<Circle | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [youMember, setYouMember] = useState<Member | null>(null)

  useEffect(() => {
    const savedCircle = localStorage.getItem('family_circle')
    if (savedCircle) {
      try {
        const parsed = JSON.parse(savedCircle) as Circle
        setCircle(parsed)
      } catch {
        localStorage.removeItem('family_circle')
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!circle) {
      setMembers([])
      setYouMember(null)
      return
    }

    const fetchMembers = async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('circle_id', circle.id)
        .order('is_you', { ascending: false })

      if (error) {
        console.error('Error fetching members:', error)
        return
      }

      if (data) {
        setMembers(data as Member[])
        const you = (data as Member[]).find((m) => m.is_you)
        if (you) setYouMember(you)
      }
    }

    fetchMembers()

    const channel = supabase
      .channel('members-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'members',
          filter: `circle_id=eq.${circle.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMembers((prev) => {
              if (prev.some((m) => m.id === (payload.new as Member).id)) return prev
              return [...prev, payload.new as Member]
            })
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Member
            setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
            if (updated.is_you) setYouMember(updated)
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as Member
            setMembers((prev) => prev.filter((m) => m.id !== deleted.id))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [circle])

  const handleJoin = (joinedCircle: Circle) => {
    setCircle(joinedCircle)
    localStorage.setItem('family_circle', JSON.stringify(joinedCircle))
  }

  const handleLeave = () => {
    setCircle(null)
    setMembers([])
    setYouMember(null)
    localStorage.removeItem('family_circle')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!circle) {
    return <LoginScreen onJoin={handleJoin} />
  }

  return (
    <MapScreen
      circle={circle}
      members={members}
      youMember={youMember}
      onLeave={handleLeave}
    />
  )
}