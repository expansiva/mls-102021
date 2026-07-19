"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.test.ts" enhancement="_blank"/>
Object.defineProperty(exports, "__esModule", { value: true });
var node_test_1 = require("node:test");
var strict_1 = require("node:assert/strict");
var cbSyntaxValidation_js_1 = require("./cbSyntaxValidation.js");
(0, node_test_1.default)('syntaxDiagnostics rejects TS5076 even when Monaco is unavailable', function () {
    strict_1.default.match((0, cbSyntaxValidation_js_1.syntaxDiagnostics)('const page = input.cursor ?? fallback || "start";')[0] || '', /TS5076/);
    strict_1.default.deepEqual((0, cbSyntaxValidation_js_1.syntaxDiagnostics)('const page = (input.cursor ?? fallback) || "start";'), []);
});
