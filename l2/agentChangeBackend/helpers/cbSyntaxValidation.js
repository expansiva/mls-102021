"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.ts" enhancement="_blank"/>
Object.defineProperty(exports, "__esModule", { value: true });
exports.syntaxDiagnostics = syntaxDiagnostics;
/** Deterministic TypeScript syntax checks available even when Monaco is unavailable. */
function syntaxDiagnostics(content) {
    var errors = [];
    content.split('\n').forEach(function (line, index) {
        if (/\?\?[^()]*(\|\||&&)|(\|\||&&)[^()]*\?\?/u.test(line)) {
            errors.push("TS5076: line ".concat(index + 1, ": '??' and '||'/'&&' operations cannot be mixed without parentheses"));
        }
    });
    return errors;
}
