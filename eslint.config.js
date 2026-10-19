import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
    { ignores: ['dist', 'tests/coverage', 'node_modules'] },
    js.configs.recommended,
    tseslint.configs.recommended,
    {
        rules: {
            'no-control-regex': 'off',
            '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
        },
    },
)
