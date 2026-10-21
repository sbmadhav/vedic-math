/* lvm/server-safe (openspec change react-typescript, design D14, task 1.7): a route module or component is rendered on
   the server, where there is no page and no Player. So `window`, `document`, `localStorage` and `sessionStorage`, and
   `Date.now()` (a render must give the server's HTML and the browser's first render the same output), are refused
   where a render reaches them: at module level, and directly in the body of a component (a function whose name
   starts with a capital letter, or an arrow or function expression assigned to such a name).
   Allowed: inside any nested function (an effect, an event handler, a callback a hook runs later), inside a custom
   hook (a function named use...), as the operand of `typeof` (the usual guard), and inside the children of
   <ClientOnly>, which only render in the browser. */
const BANNED = new Set(['window', 'document', 'localStorage', 'sessionStorage']);

const isComponentName = name => typeof name === 'string' && /^[A-Z]/.test(name);
const isHookName = name => typeof name === 'string' && /^use[A-Z0-9]/.test(name);

/* The name a function is known by: its own, or the variable or property it is assigned to */
function nameOf(fn) {
  if (fn.id && fn.id.name) return fn.id.name;
  const p = fn.parent;
  if (p && p.type === 'VariableDeclarator' && p.id.type === 'Identifier') return p.id.name;
  if (p && p.type === 'CallExpression') {
    // memo(function X() {}) or forwardRef((props) => ...) assigned to a capitalized name
    const d = p.parent;
    if (d && d.type === 'VariableDeclarator' && d.id.type === 'Identifier') return d.id.name;
  }
  if (p && (p.type === 'Property' || p.type === 'MethodDefinition') && p.key.type === 'Identifier') return p.key.name;
  return null;
}

const FUNCTION = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);

/* Whether `node` sits in the children of a <ClientOnly> element */
function inClientOnly(node) {
  for (let n = node.parent; n; n = n.parent) {
    if (n.type === 'JSXElement' && n.openingElement.name.type === 'JSXIdentifier' && n.openingElement.name.name === 'ClientOnly') return true;
  }
  return false;
}

/* Where a render reaches `node`: 'module', 'component <Name>', or null when it runs later or only in the browser */
function renderScope(node) {
  let fn = null;
  for (let n = node.parent; n; n = n.parent) if (FUNCTION.has(n.type)) { fn = n; break; }
  if (!fn) return 'module level';
  const name = nameOf(fn);
  if (isHookName(name)) return null;
  if (isComponentName(name)) return `the render of ${name}`;
  return null; // a nested function: an effect, a handler or a callback
}

export default {
  meta: {
    type: 'problem',
    docs: { description: 'No browser-only globals or Date.now() where a server render reaches them (design D14)' },
    schema: [],
    messages: {
      global: '`{{name}}` at {{where}}: the server has no page. Read it in an effect, a handler, a hook or <ClientOnly>.',
      now: '`Date.now()` at {{where}}: the server and the browser would render different output. Read the time in an effect or a handler.',
    },
  },
  create(context) {
    const source = context.sourceCode;
    function check(node, name, message) {
      if (inClientOnly(node)) return;
      const where = renderScope(node);
      if (where) context.report({ node, messageId: message, data: { name, where } });
    }
    return {
      Identifier(node) {
        if (!BANNED.has(node.name)) return;
        const p = node.parent;
        // Only references: not a property name (x.window), an object key, or a declaration of the same name
        if (p.type === 'MemberExpression' && p.property === node && !p.computed) return;
        if ((p.type === 'Property' || p.type === 'PropertyDefinition' || p.type === 'MethodDefinition') && p.key === node && !p.computed) return;
        if (p.type === 'UnaryExpression' && p.operator === 'typeof') return;
        if (p.type === 'TSQualifiedName' || p.type === 'TSTypeReference' || p.type === 'TSTypeQuery') return;
        const scope = source.getScope(node);
        let s = scope;
        while (s) {
          const v = s.set.get(node.name);
          if (v && v.defs.length) return; // a local of the same name, not the global
          s = s.upper;
        }
        check(node, node.name, 'global');
      },
      CallExpression(node) {
        const c = node.callee;
        if (c.type === 'MemberExpression' && !c.computed && c.object.type === 'Identifier' && c.object.name === 'Date' && c.property.type === 'Identifier' && c.property.name === 'now') check(node, 'Date.now()', 'now');
      },
    };
  },
};
