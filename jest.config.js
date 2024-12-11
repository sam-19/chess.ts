const path = require('path')
// Any unsupported modules that Jest should ignore
const unsupported = [].join('|')

module.exports = {
    rootDir: path.resolve(__dirname, './'),
    preset: 'ts-jest',
    coverageDirectory: "<rootDir>/tests/coverage/",
    globals: {
    },
    moduleFileExtensions: [
        "js",
        "ts",
        "json",
    ],
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
    },
    modulePaths: [
        "<rootDir>/src/",
    ],
    roots: [
        "<rootDir>/tests/",
    ],
    snapshotSerializers: [
    ],
    transform: {
        "^.+\\.js$": "babel-jest",
        "^.+\\.ts$": ["ts-jest", { isolatedModules: true }],
    },
    transformIgnorePatterns: [
        "node_modules/(?!{unsupported})",
    ],
    testRegex: "(test/.*|(\\.|/)(test|spec))\\.(tsx?)$",
    testEnvironment: "jsdom",
    testEnvironmentOptions: {
        browsers: [
            "chrome",
            "firefox",
            "safari"
        ],
        url: "http://localhost/"
    }
}
