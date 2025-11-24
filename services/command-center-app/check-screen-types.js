import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kfrvxoxdehduqrpcbibl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmcnZ4b3hkZWhkdXFycGNiaWJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQwNjY0OTgsImV4cCI6MjA0OTY0MjQ5OH0.8G_zF_KzqrGScwZexygZiYZprVWePIvq3M8v3qhiuoM'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function getScreenTypes() {
  try {
    // Let's try both possible table names
    const tables = ['onboarding_steps', 'onboarding_flow_steps']
    
    for (const tableName of tables) {
      console.log(`Trying table: ${tableName}`)
      
      const { data: allData, error: allError } = await supabase
        .from(tableName)
        .select('*')
        .limit(10)

      if (allError) {
        console.log(`Error with ${tableName}:`, allError.message)
        continue
      }

      console.log(`Sample data from ${tableName}:`, allData)
      
      // Now get unique screen types
      const { data, error } = await supabase
        .from(tableName)
        .select('screen_type')
        .order('screen_type')

      if (error) {
        console.log(`Error fetching screen_type from ${tableName}:`, error)
        continue
      }
      
      const uniqueScreenTypes = [...new Set(data.map(row => row.screen_type))]
      
      console.log(`Unique screen types found in ${tableName}:`)
      uniqueScreenTypes.forEach(screenType => {
        console.log(`- ${screenType}`)
      })
      
      return uniqueScreenTypes
    }
    
    console.log('No valid table found')
  } catch (error) {
    console.error('Error fetching screen types:', error)
  }
}

getScreenTypes()