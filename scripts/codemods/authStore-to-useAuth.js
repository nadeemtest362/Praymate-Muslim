/**
 * jscodeshift codemod to replace useAuthStore imports & common usage patterns
 * 
 * Usage:
 * npx jscodeshift -t scripts/codemods/authStore-to-useAuth.js src --extensions=ts,tsx --parser=tsx
 */

function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  let hasChanges = false;

  // Skip the compatibility shim and authStore files themselves
  if (file.path.includes('authStoreCompat.ts') || file.path.includes('stores/authStore.ts')) {
    return file.source;
  }

  // 1. Replace import statements
  root.find(j.ImportDeclaration)
    .filter(path => {
      const source = path.node.source.value;
      return typeof source === 'string' && (
        source.includes('authStore') || 
        source.includes('stores/authStore') ||
        source.includes('../stores/authStore') ||
        source.includes('../../stores/authStore')
      );
    })
    .forEach(path => {
      hasChanges = true;
      
      // Update import source
      const depth = (path.node.source.value.match(/\.\.\//g) || []).length;
      let newPath;
      if (depth === 0) {
        newPath = 'src/hooks/useAuth';
      } else if (depth === 1) {
        newPath = '../hooks/useAuth';
      } else if (depth === 2) {
        newPath = '../../hooks/useAuth';
      } else {
        newPath = '../'.repeat(depth - 1) + 'hooks/useAuth';
      }
      
      path.node.source.value = newPath;
      
      // Update import specifiers
      path.node.specifiers.forEach(spec => {
        if (j.ImportSpecifier.check(spec)) {
          if (spec.imported.name === 'useAuthStore') {
            spec.imported.name = 'useAuth';
            if (spec.local && spec.local.name === 'useAuthStore') {
              spec.local.name = 'useAuth';
            }
          }
        }
      });
    });

  // 2. Replace function calls: useAuthStore() -> useAuth()
  root.find(j.CallExpression)
    .filter(path => path.node.callee.name === 'useAuthStore')
    .forEach(path => {
      hasChanges = true;
      path.node.callee.name = 'useAuth';
      
      // Handle selector patterns: useAuthStore(state => state.x) -> const { x } = useAuth()
      if (path.node.arguments.length === 1) {
        const arg = path.node.arguments[0];
        if (j.ArrowFunctionExpression.check(arg) && 
            j.MemberExpression.check(arg.body) &&
            arg.body.object.name === 'state') {
          
          // Remove the selector argument - we'll need manual cleanup for destructuring
          path.node.arguments = [];
          
          // Add a comment to indicate manual cleanup needed
          const comment = j.commentLine(' TODO: Convert to destructuring: const { ' + arg.body.property.name + ' } = useAuth()');
          path.node.comments = path.node.comments || [];
          path.node.comments.push(comment);
        }
      }
    });

  // 3. Handle getState() calls - add comment for manual migration
  root.find(j.MemberExpression)
    .filter(path => 
      path.node.object.name === 'useAuthStore' && 
      path.node.property.name === 'getState'
    )
    .forEach(path => {
      hasChanges = true;
      const comment = j.commentLine(' TODO: Migrate getState() - see migration guide');
      
      // Find the nearest statement to add the comment to
      let current = path;
      while (current && !j.Statement.check(current.node)) {
        current = current.parent;
      }
      
      if (current && current.node) {
        current.node.comments = current.node.comments || [];
        current.node.comments.push(comment);
      }
    });

  // 4. Handle subscribe() calls - add comment for manual migration  
  root.find(j.MemberExpression)
    .filter(path => 
      path.node.object.name === 'useAuthStore' && 
      path.node.property.name === 'subscribe'
    )
    .forEach(path => {
      hasChanges = true;
      const comment = j.commentLine(' TODO: Migrate subscribe() - see migration guide');
      
      // Find the nearest statement to add the comment to
      let current = path;
      while (current && !j.Statement.check(current.node)) {
        current = current.parent;
      }
      
      if (current && current.node) {
        current.node.comments = current.node.comments || [];
        current.node.comments.push(comment);
      }
    });

  return hasChanges ? root.toSource() : file.source;
}

module.exports = transformer;
module.exports.parser = 'tsx';
