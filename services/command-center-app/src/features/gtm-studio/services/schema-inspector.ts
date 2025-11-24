import { createClient } from '@supabase/supabase-js'

// Viral Video Supabase configuration
const viralVideoSupabaseUrl = 'https://molydcrzwsoeyqkiofwe.supabase.co'
const viralVideoSupabaseAnonKey = import.meta.env
  .VITE_VIRAL_VIDEO_SUPABASE_ANON_KEY

if (!viralVideoSupabaseAnonKey) {
  throw new Error(
    'VITE_VIRAL_VIDEO_SUPABASE_ANON_KEY is not set. Please check your .env file.'
  )
}

const viralVideoSupabase = createClient(
  viralVideoSupabaseUrl,
  viralVideoSupabaseAnonKey
)

interface TableInfo {
  table_name: string
  column_name: string
  data_type: string
  is_nullable: string
  column_default: string | null
  ordinal_position: number
}

interface ForeignKeyInfo {
  table_name: string
  column_name: string
  foreign_table_name: string
  foreign_column_name: string
  constraint_name: string
}

interface SchemaReport {
  tables: Record<string, TableInfo[]>
  foreignKeys: ForeignKeyInfo[]
  workflowRelatedTables: string[]
  timestamp: string
}

export async function inspectDatabaseSchema(): Promise<SchemaReport> {
  try {
    console.log('🔍 Inspecting viral video database schema...')

    // Query to get all table and column information
    const tablesQuery = `
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `

    const { data: tableData, error: tableError } = await viralVideoSupabase.rpc(
      'query_database',
      { query: tablesQuery }
    )

    if (tableError) {
      // If RPC doesn't exist, try direct query
      const { data: directData, error: directError } = await viralVideoSupabase
        .from('information_schema.columns' as any)
        .select('*')
        .eq('table_schema', 'public')
        .order('table_name')
        .order('ordinal_position')

      if (directError) {
        throw new Error(
          `Failed to query table information: ${directError.message}`
        )
      }
    }

    // Query to get foreign key relationships
    const foreignKeysQuery = `
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public';
    `

    const { data: fkData, error: fkError } = await viralVideoSupabase.rpc(
      'query_database',
      { query: foreignKeysQuery }
    )

    // Alternative approach: Get table list first
    const { data: tables, error: listError } = await viralVideoSupabase
      .from('information_schema.tables' as any)
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE')

    if (listError) {
      console.error('Error listing tables:', listError)
      // Try a different approach - query a known system table
      const { data: pgTables } = await viralVideoSupabase
        .rpc('get_tables')
        .single()

      if (!pgTables) {
        throw new Error('Unable to retrieve table list')
      }
    }

    // Group table data by table name
    const groupedTables: Record<string, TableInfo[]> = {}
    if (tableData) {
      tableData.forEach((row: TableInfo) => {
        if (!groupedTables[row.table_name]) {
          groupedTables[row.table_name] = []
        }
        groupedTables[row.table_name].push(row)
      })
    }

    // Identify tables that might be related to workflows
    const workflowRelatedTables: string[] = []
    const workflowKeywords = [
      'workflow',
      'flow',
      'process',
      'step',
      'stage',
      'pipeline',
      'automation',
      'task',
      'job',
    ]

    Object.keys(groupedTables).forEach((tableName) => {
      const lowerTableName = tableName.toLowerCase()
      if (
        workflowKeywords.some((keyword) => lowerTableName.includes(keyword))
      ) {
        workflowRelatedTables.push(tableName)
      }

      // Also check if any columns reference workflows
      const columns = groupedTables[tableName]
      const hasWorkflowColumn = columns.some((col) =>
        workflowKeywords.some((keyword) =>
          col.column_name.toLowerCase().includes(keyword)
        )
      )
      if (hasWorkflowColumn && !workflowRelatedTables.includes(tableName)) {
        workflowRelatedTables.push(tableName)
      }
    })

    const report: SchemaReport = {
      tables: groupedTables,
      foreignKeys: fkData || [],
      workflowRelatedTables,
      timestamp: new Date().toISOString(),
    }

    return report
  } catch (error) {
    console.error('❌ Error inspecting database schema:', error)
    throw error
  }
}

// Function to generate a markdown report of the schema
export function generateSchemaReport(schema: SchemaReport): string {
  let report = `# Viral Video Database Schema Report\n\n`
  report += `Generated: ${schema.timestamp}\n\n`

  // Table of Contents
  report += `## Table of Contents\n\n`
  report += `1. [Tables Overview](#tables-overview)\n`
  report += `2. [Foreign Key Relationships](#foreign-key-relationships)\n`
  report += `3. [Workflow-Related Tables](#workflow-related-tables)\n`
  report += `4. [Detailed Table Schemas](#detailed-table-schemas)\n\n`

  // Tables Overview
  report += `## Tables Overview\n\n`
  report += `Total tables: ${Object.keys(schema.tables).length}\n\n`
  report += `| Table Name | Column Count |\n`
  report += `|------------|-------------|\n`
  Object.entries(schema.tables).forEach(([tableName, columns]) => {
    report += `| ${tableName} | ${columns.length} |\n`
  })
  report += `\n`

  // Foreign Key Relationships
  report += `## Foreign Key Relationships\n\n`
  if (schema.foreignKeys.length > 0) {
    report += `| Source Table | Source Column | Target Table | Target Column |\n`
    report += `|--------------|---------------|--------------|---------------|\n`
    schema.foreignKeys.forEach((fk) => {
      report += `| ${fk.table_name} | ${fk.column_name} | ${fk.foreign_table_name} | ${fk.foreign_column_name} |\n`
    })
  } else {
    report += `No foreign key relationships found (may need different query approach).\n`
  }
  report += `\n`

  // Workflow-Related Tables
  report += `## Workflow-Related Tables\n\n`
  if (schema.workflowRelatedTables.length > 0) {
    report += `The following tables appear to be related to workflows based on naming:\n\n`
    schema.workflowRelatedTables.forEach((table) => {
      report += `- **${table}**\n`
    })
  } else {
    report += `No workflow-related tables identified by naming convention.\n`
  }
  report += `\n`

  // Detailed Table Schemas
  report += `## Detailed Table Schemas\n\n`
  Object.entries(schema.tables).forEach(([tableName, columns]) => {
    report += `### ${tableName}\n\n`
    report += `| Column | Type | Nullable | Default |\n`
    report += `|--------|------|----------|----------|\n`
    columns.forEach((col) => {
      report += `| ${col.column_name} | ${col.data_type} | ${col.is_nullable} | ${col.column_default || 'NULL'} |\n`
    })
    report += `\n`
  })

  return report
}

// Main execution function
export async function runSchemaInspection() {
  try {
    const schema = await inspectDatabaseSchema()
    const report = generateSchemaReport(schema)

    // Save the report to a file
    const fs = await import('fs').catch(() => null)
    if (fs) {
      const path = await import('path').catch(() => null)
      if (path) {
        const reportPath = path.join(
          process.cwd(),
          'viral-video-schema-report.md'
        )
        await fs.promises.writeFile(reportPath, report)
        console.log(`📄 Schema report saved to: ${reportPath}`)
      }
    }

    // Return both the schema object and report
    return { schema, report }
  } catch (error) {
    console.error('Failed to run schema inspection:', error)
    throw error
  }
}
