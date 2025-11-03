// import React, { useState, useEffect } from 'react';
// import { View, Text, Button, StyleSheet, ActivityIndicator } from 'react-native';
// import { supabase } from '../lib/supabase';

// export default function SupabaseTest() {
//   const [loading, setLoading] = useState(false);
//   const [connected, setConnected] = useState<boolean | null>(null);
//   const [error, setError] = useState<string | null>(null);

//   const testConnection = async () => {
//     setLoading(true);
//     setError(null);
    
//     try {
//       // Simple test query to check connection
//       const { error: queryError } = await supabase
//         .from('_test_')
//         .select('*')
//         .limit(1);
      
//       // If error is "relation does not exist", connection is working
//       // If error is something else, there might be a connection issue
//       if (queryError && !queryError.message.includes('relation')) {
//         throw queryError;
//       }
      
//       setConnected(true);
//     } catch (err: any) {
//       setConnected(false);
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Supabase Connection Test</Text>
      
//       {loading && <ActivityIndicator size="large" color="#0000ff" />}
      
//       {!loading && connected === null && (
//         <Button title="Test Connection" onPress={testConnection} />
//       )}
      
//       {connected === true && (
//         <Text style={styles.success}>✓ Connected to Supabase!</Text>
//       )}
      
//       {connected === false && (
//         <View>
//           <Text style={styles.error}>✗ Connection failed</Text>
//           {error && <Text style={styles.errorDetails}>{error}</Text>}
//           <Button title="Try Again" onPress={testConnection} />
//         </View>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     padding: 20,
//     alignItems: 'center',
//     gap: 15,
//   },
//   title: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     marginBottom: 10,
//   },
//   success: {
//     color: 'green',
//     fontSize: 16,
//   },
//   error: {
//     color: 'red',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   errorDetails: {
//     color: 'red',
//     fontSize: 12,
//     marginTop: 5,
//     textAlign: 'center',
//   },
// });

