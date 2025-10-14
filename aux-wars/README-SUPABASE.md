# Supabase Integration Guide

This project has been set up with Supabase integration. Follow the steps below to get started.

## Setup Instructions

### 1. Configure Environment Variables

1. Copy your Supabase credentials from your [Supabase Dashboard](https://supabase.com/dashboard)
2. Open the `.env` file in the project root
3. Replace the placeholder values with your actual credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 2. Restart Development Server

After updating the `.env` file, restart your development server:
```bash
npm run dev
```

## Files Created

- **`src/supabaseClient.js`**: Supabase client configuration
- **`src/hooks/useSupabase.js`**: Custom React hooks for Supabase
- **`.env`**: Environment variables (DO NOT commit this file)
- **`.env.example`**: Example environment variables template

## Usage Examples

### Querying Data

```jsx
import { useSupabaseQuery } from './hooks/useSupabase'

function MyComponent() {
  const { data, loading, error } = useSupabaseQuery('your_table_name', {
    select: '*',
    order: { column: 'created_at', ascending: false },
    limit: 10
  })

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <ul>
      {data?.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  )
}
```

### Authentication

```jsx
import { useSupabaseAuth } from './hooks/useSupabase'
import { supabase } from './supabaseClient'

function AuthComponent() {
  const { user, loading } = useSupabaseAuth()

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) console.error('Error signing in:', error)
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Error signing out:', error)
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      {user ? (
        <div>
          <p>Logged in as: {user.email}</p>
          <button onClick={signOut}>Sign Out</button>
        </div>
      ) : (
        <div>Not logged in</div>
      )}
    </div>
  )
}
```

### Direct Database Operations

```jsx
import { supabase } from './supabaseClient'

// Insert data
const insertData = async () => {
  const { data, error } = await supabase
    .from('your_table')
    .insert([{ column_name: 'value' }])
    .select()

  if (error) console.error('Error:', error)
  return data
}

// Update data
const updateData = async (id, updates) => {
  const { data, error } = await supabase
    .from('your_table')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) console.error('Error:', error)
  return data
}

// Delete data
const deleteData = async (id) => {
  const { error } = await supabase
    .from('your_table')
    .delete()
    .eq('id', id)

  if (error) console.error('Error:', error)
}
```

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [React Integration Guide](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs)