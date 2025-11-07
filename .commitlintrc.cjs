export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'style',    // Code formatting
        'refactor', // Code refactoring
        'perf',     // Performance improvement
        'test',     // Tests
        'build',    // Build system
        'ci',       // CI configuration
        'chore',    // Other changes
      ],
    ],
    'subject-case': [0],
    'body-max-line-length': [0],
  },
};
