import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

/**
 * Custom hook for fetching data from a Supabase table
 * @param {string} table - The name of the table to query
 * @param {object} options - Query options (select, filter, order, etc.)
 * @returns {object} - { data, loading, error, refetch }
 */
export function useSupabaseQuery(table, options = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase.from(table).select(options.select || '*')

      // Apply filters if provided
      if (options.filter) {
        Object.entries(options.filter).forEach(([key, value]) => {
          query = query.eq(key, value)
        })
      }

      // Apply ordering if provided
      if (options.order) {
        query = query.order(options.order.column, {
          ascending: options.order.ascending ?? true
        })
      }

      // Apply limit if provided
      if (options.limit) {
        query = query.limit(options.limit)
      }

      const { data: result, error: queryError } = await query

      if (queryError) throw queryError

      setData(result)
    } catch (err) {
      setError(err.message)
      console.error('Supabase query error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [table, JSON.stringify(options)])

  return { data, loading, error, refetch: fetchData }
}

/**
 * Custom hook for Supabase authentication state
 * @returns {object} - { user, session, loading }
 */
export function useSupabaseAuth() {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, session, loading }
}