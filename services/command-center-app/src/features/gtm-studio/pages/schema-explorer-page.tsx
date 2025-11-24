import { SchemaExplorer } from '../components/schema-explorer'

export function SchemaExplorerPage() {
  return (
    <div className='container mx-auto py-6'>
      <div className='mb-6'>
        <h1 className='text-3xl font-bold'>Database Schema Explorer</h1>
        <p className='text-muted-foreground mt-2'>
          Explore the Viral Video database schema to understand table
          relationships and plan workflow integrations.
        </p>
      </div>

      <SchemaExplorer />

      <div className='bg-muted mt-8 rounded-lg p-4'>
        <h2 className='mb-2 text-lg font-semibold'>About This Tool</h2>
        <ul className='text-muted-foreground space-y-1 text-sm'>
          <li>• Discovers tables by testing common table names</li>
          <li>• Identifies potential workflow-related tables</li>
          <li>• Detects potential foreign key relationships</li>
          <li>• Generates recommendations for workflow table integration</li>
          <li>• Exports findings as a markdown report</li>
        </ul>
      </div>
    </div>
  )
}
