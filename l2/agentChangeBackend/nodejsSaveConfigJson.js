"use strict";
/// <mls fileReference="_102021_/l2/agentChangeBackend/nodejsSaveConfigJson.ts" enhancement="_blank"/>
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
// Publish-time composer (backend side). Runs on the dev machine via tsx, BEFORE rsync:
//   tsx mls-102021/l2/agentChangeBackend/nodejsSaveConfigJson.ts <clientId>
// Reads the client-owned mls-<clientId>/l5/project.json (written by agentChangeBackend)
// and merges the backend part of the workspace ProjectsConfig into mls-<clientId>/config.json:
// projects (client + master backend + 102029 lib), modules[].backendControllers and
// persistenceModules[].tableDefsDir. Routes/tables themselves are discovered at RUNTIME by
// the production master from those folders — this file only wires the dependency inversion.
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
var HERE = node_path_1.default.dirname(process.argv[1] ? node_path_1.default.resolve(process.argv[1]) : process.cwd());
var ROOT = process.env.SAVE_CONFIG_ROOT ? node_path_1.default.resolve(process.env.SAVE_CONFIG_ROOT) : node_path_1.default.resolve(HERE, '../../../');
function fail(msg) { console.error("[nodejsSaveConfigJson:backend] ".concat(msg)); process.exit(1); }
function readJson(file) {
    try {
        return JSON.parse(node_fs_1.default.readFileSync(file, 'utf8'));
    }
    catch (_a) {
        return null;
    }
}
function projectRuntimeMetadata(l5, clientId) {
    return {
        projectId: l5.projectId || clientId,
        domain: l5.domain,
        port: l5.port,
        databaseName: l5.databaseName,
        environment: l5.environment,
        studioEnabled: l5.studioEnabled,
    };
}
function main() {
    var _a, _b, _c;
    var clientId = (process.argv[2] || '').replace(/^mls-/, '');
    if (!/^\d+$/.test(clientId))
        fail('usage: tsx nodejsSaveConfigJson.ts <clientId>');
    var clientRoot = node_path_1.default.join(ROOT, "mls-".concat(clientId));
    var runtimeL5Path = node_path_1.default.join(clientRoot, 'l5', 'runtime.project.json');
    var l5Path = node_fs_1.default.existsSync(runtimeL5Path) ? runtimeL5Path : node_path_1.default.join(clientRoot, 'l5', 'project.json');
    var l5 = readJson(l5Path);
    if (!l5)
        fail("cannot read ".concat(l5Path));
    var signature = (_a = l5.masters) === null || _a === void 0 ? void 0 : _a.backend;
    if (!signature)
        fail("l5/project.json has no masters.backend signature (run agentChangeBackend or add it)");
    var runtimeId = String(signature.runtimeProject);
    // Single source of truth: l5/config.json (read by the Studio apps, the publish and the runtime).
    var configPath = node_path_1.default.join(clientRoot, 'l5', 'config.json');
    var config = (readJson(configPath) || {});
    // Skeleton (idempotent): each composer only ensures what it owns/needs.
    config.defaultProjectId = config.defaultProjectId || clientId;
    config.projects = config.projects || {};
    config.projects[clientId] = __assign(__assign({}, (config.projects[clientId] || {})), { root: '.', type: 'client', runtime: projectRuntimeMetadata(l5, clientId) });
    config.projects[runtimeId] = { root: "../mls-".concat(runtimeId), type: 'master backend' };
    // The backend runtime imports shared code from 102029.
    config.projects['102029'] = config.projects['102029'] || { root: '../mls-102029', type: 'lib' };
    // System modules the master ships with (mdm, monitor, audit, ...): the master is
    // self-describing via its own masterModules.json — routes and menu for these modules
    // disappear from the runtime if this merge is skipped.
    var manifest = readJson(node_path_1.default.join(ROOT, "mls-".concat(runtimeId), 'masterModules.json'));
    if ((_b = manifest === null || manifest === void 0 ? void 0 : manifest.modules) === null || _b === void 0 ? void 0 : _b.length)
        config.projects[runtimeId].modules = manifest.modules;
    if ((_c = manifest === null || manifest === void 0 ? void 0 : manifest.persistenceModules) === null || _c === void 0 ? void 0 : _c.length)
        config.projects[runtimeId].persistenceModules = manifest.persistenceModules;
    var client = config.projects[clientId];
    client.modules = client.modules || [];
    client.persistenceModules = client.persistenceModules || [];
    var backendModules = 0;
    var _loop_1 = function (l5mod) {
        if (!(l5mod === null || l5mod === void 0 ? void 0 : l5mod.moduleName) || !l5mod.backend)
            return "continue";
        var controllersDir = node_path_1.default.join(ROOT, l5mod.backend.backendControllers.replace(/^\.\//, '').replace(/^_(\d+)_\//, 'mls-$1/'));
        var tableDefsDir = node_path_1.default.join(ROOT, l5mod.backend.persistence.tableDefsDir.replace(/^\.\//, '').replace(/^_(\d+)_\//, 'mls-$1/'));
        if (!node_fs_1.default.existsSync(controllersDir))
            fail("backendControllers dir not found on disk: ".concat(controllersDir));
        if (!node_fs_1.default.existsSync(tableDefsDir))
            fail("persistence tableDefsDir not found on disk: ".concat(tableDefsDir));
        var mod = client.modules.find(function (m) { return m.moduleId === l5mod.moduleName; });
        if (!mod) {
            mod = { moduleId: l5mod.moduleName, basePath: "/".concat(l5mod.moduleName), shellMode: 'spa' };
            client.modules.push(mod);
        }
        mod.backendControllers = l5mod.backend.backendControllers;
        delete mod.backendRouter; // hexagonal model only; the legacy router must not survive composition
        var pm = client.persistenceModules.find(function (m) { return m.moduleId === l5mod.moduleName; });
        if (!pm) {
            pm = { moduleId: l5mod.moduleName };
            client.persistenceModules.push(pm);
        }
        pm.tableDefsDir = l5mod.backend.persistence.tableDefsDir;
        delete pm.persistenceEntrypoint;
        backendModules += 1;
    };
    for (var _i = 0, _d = l5.modules || []; _i < _d.length; _i++) {
        var l5mod = _d[_i];
        _loop_1(l5mod);
    }
    if (backendModules === 0)
        fail('l5/project.json declares no modules with a backend block; nothing to compose');
    node_fs_1.default.writeFileSync(configPath, "".concat(JSON.stringify(config, null, 2), "\n"));
    console.log("[nodejsSaveRuntimeConfig:backend] composed ".concat(backendModules, " module(s) \u2192 ").concat(configPath));
}
main();
