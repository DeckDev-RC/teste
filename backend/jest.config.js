export default {
    testEnvironment: 'node',
    transform: {},
    moduleFileExtensions: ['js', 'mjs'],
    testMatch: ['**/*.test.js'],
    verbose: true,
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/**/*.test.js'
    ]
};
