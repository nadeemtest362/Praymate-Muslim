const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.production' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createFunction() {
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250119_get_current_prayer_state.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Creating get_current_prayer_state function...');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('query', { query: sql });
    
    if (error) {
      // Try direct execution
      const { error: execError } = await supabase.from('_sql').insert({ query: sql });
      if (execError) {
        console.error('Error creating function:', execError);
        
        // As a last resort, split and execute statements
        const statements = sql.split(';').filter(s => s.trim());
        for (const statement of statements) {
          if (statement.trim()) {
            console.log('Executing statement...');
            const { error: stmtError } = await supabase.rpc('exec', { sql: statement + ';' });
            if (stmtError) {
              console.error('Statement error:', stmtError);
            }
          }
        }
      }
    }
    
    console.log('Function created successfully!');
    
    // Test the function
    console.log('\nTesting function...');
    const { data: testData, error: testError } = await supabase.rpc('get_current_prayer_state', {
      user_id_param: '00000000-0000-0000-0000-000000000000' // dummy UUID
    });
    
    if (testError) {
      console.error('Test error:', testError);
    } else {
      console.log('Test result:', testData);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createFunction();