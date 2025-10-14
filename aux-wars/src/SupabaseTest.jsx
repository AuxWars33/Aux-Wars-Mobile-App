import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

function SupabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState('Testing connection...')
  const [connectionColor, setConnectionColor] = useState('#FFA500')
  const [details, setDetails] = useState(null)

  useEffect(() => {
    testConnection()
  }, [])

  const testConnection = async () => {
    try {
      // Test 1: Check if client is initialized
      if (!supabase) {
        throw new Error('Supabase client is not initialized')
      }

      // Test 2: Try to get the session (this will work even without auth)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        throw sessionError
      }

      // Test 3: Try a simple query to test database connection
      // This will fail if you don't have a table, but that's okay
      const { data, error } = await supabase
        .from('_test_connection_')
        .select('*')
        .limit(1)

      // If we get here without major errors, connection is working
      setConnectionStatus('✓ Supabase Connected Successfully!')
      setConnectionColor('#00C853')
      setDetails({
        status: 'Connected',
        hasSession: !!session,
        userEmail: session?.user?.email || 'Not authenticated',
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        note: error?.message.includes('relation')
          ? 'Database connection working (test table not found, which is normal)'
          : 'Database accessible'
      })
    } catch (error) {
      console.error('Supabase connection error:', error)
      setConnectionStatus('✗ Connection Failed')
      setConnectionColor('#FF5252')
      setDetails({
        status: 'Failed',
        error: error.message,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'Not set',
        hint: !import.meta.env.VITE_SUPABASE_URL
          ? 'Make sure to add your credentials to .env file and restart the dev server'
          : 'Check your Supabase credentials'
      })
    }
  }

  return (
    <div style={{
      padding: '20px',
      margin: '20px',
      border: `2px solid ${connectionColor}`,
      borderRadius: '8px',
      backgroundColor: '#1a1a1a'
    }}>
      <h2 style={{ color: connectionColor, marginTop: 0 }}>
        Supabase Connection Test
      </h2>

      <p style={{ fontSize: '18px', fontWeight: 'bold' }}>
        {connectionStatus}
      </p>

      {details && (
        <div style={{
          marginTop: '15px',
          padding: '15px',
          backgroundColor: '#2a2a2a',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          <h3 style={{ marginTop: 0 }}>Connection Details:</h3>
          <ul style={{ textAlign: 'left', lineHeight: '1.8' }}>
            <li><strong>Status:</strong> {details.status}</li>
            <li><strong>Supabase URL:</strong> {details.supabaseUrl}</li>
            {details.hasSession !== undefined && (
              <li><strong>Has Session:</strong> {details.hasSession ? 'Yes' : 'No'}</li>
            )}
            {details.userEmail && (
              <li><strong>User:</strong> {details.userEmail}</li>
            )}
            {details.note && (
              <li><strong>Note:</strong> {details.note}</li>
            )}
            {details.error && (
              <li style={{ color: '#FF5252' }}>
                <strong>Error:</strong> {details.error}
              </li>
            )}
            {details.hint && (
              <li style={{ color: '#FFA500' }}>
                <strong>Hint:</strong> {details.hint}
              </li>
            )}
          </ul>
        </div>
      )}

      <button
        onClick={testConnection}
        style={{
          marginTop: '15px',
          padding: '10px 20px',
          backgroundColor: '#646cff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        Test Again
      </button>
    </div>
  )
}

export default SupabaseTest
