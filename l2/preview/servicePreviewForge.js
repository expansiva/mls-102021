"use strict";
/// <mls fileReference="_102021_/l2/preview/servicePreviewForge.ts" enhancement="_102027_/l2/enhancementLit"/> 
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServicePreviewForge102021 = void 0;
var lit_1 = require("lit");
var decorators_js_1 = require("lit/decorators.js");
var repeat_js_1 = require("lit/directives/repeat.js");
var ServicePreviewForge102021 = function () {
    var _classDecorators = [(0, decorators_js_1.customElement)('preview--service-preview-forge-102021')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _classSuper = lit_1.LitElement;
    var _running_decorators;
    var _running_initializers = [];
    var _running_extraInitializers = [];
    var _building_decorators;
    var _building_initializers = [];
    var _building_extraInitializers = [];
    var _logs_decorators;
    var _logs_initializers = [];
    var _logs_extraInitializers = [];
    var ServicePreviewForge102021 = _classThis = /** @class */ (function (_super) {
        __extends(ServicePreviewForge102021_1, _super);
        function ServicePreviewForge102021_1() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.running = __runInitializers(_this, _running_initializers, false);
            _this.building = (__runInitializers(_this, _running_extraInitializers), __runInitializers(_this, _building_initializers, false));
            _this.logs = (__runInitializers(_this, _building_extraInitializers), __runInitializers(_this, _logs_initializers, []));
            _this.iframe = (__runInitializers(_this, _logs_extraInitializers), null);
            _this._logHandler = null;
            return _this;
        }
        // ── Lifecycle ────────────────────────────────────────────────────────────────
        ServicePreviewForge102021_1.prototype.disconnectedCallback = function () {
            _super.prototype.disconnectedCallback.call(this);
            this.doStop();
        };
        // ── UI handlers ───────────────────────────────────────────────────────────────
        ServicePreviewForge102021_1.prototype.handleToggle = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!this.running) return [3 /*break*/, 1];
                            this.doStop();
                            return [3 /*break*/, 3];
                        case 1: return [4 /*yield*/, this.doStart()];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3: return [2 /*return*/];
                    }
                });
            });
        };
        ServicePreviewForge102021_1.prototype.handleClearLogs = function () {
            this.logs = [];
        };
        // ── Start / Stop ─────────────────────────────────────────────────────────────
        ServicePreviewForge102021_1.prototype.doStart = function () {
            return __awaiter(this, void 0, void 0, function () {
                var bundle, e_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.building = true;
                            this.addLog('info', 'Building L1 bundle...');
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 4, 5, 6]);
                            return [4 /*yield*/, this.ensureEsbuild()];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, this.buildBundle()];
                        case 3:
                            bundle = _a.sent();
                            if (!bundle) {
                                this.addLog('error', 'Build failed — check logs above');
                                return [2 /*return*/];
                            }
                            this.addLog('info', "Bundle ready (".concat((bundle.length / 1024).toFixed(1), " kB) \u2014 mounting iframe"));
                            this.mountIframe(bundle);
                            this.running = true;
                            return [3 /*break*/, 6];
                        case 4:
                            e_1 = _a.sent();
                            this.addLog('error', "Start error: ".concat(e_1.message));
                            return [3 /*break*/, 6];
                        case 5:
                            this.building = false;
                            return [7 /*endfinally*/];
                        case 6: return [2 /*return*/];
                    }
                });
            });
        };
        ServicePreviewForge102021_1.prototype.doStop = function () {
            if (this._logHandler) {
                window.removeEventListener('message', this._logHandler);
                this._logHandler = null;
            }
            if (this.iframe) {
                this.iframe.contentWindow.onmessage = null;
                this.iframe.remove();
                this.iframe = null;
            }
            var reg = top.previewL1;
            if (reg)
                delete reg["forge_".concat(mls.actualProject)];
            this.running = false;
            this.addLog('info', 'Server stopped');
        };
        // ── esbuild ───────────────────────────────────────────────────────────────────
        ServicePreviewForge102021_1.prototype.ensureEsbuild = function () {
            return __awaiter(this, void 0, void 0, function () {
                var url, mod;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (this.esbuild)
                                return [2 /*return*/];
                            if (mls.esbuild) {
                                this.esbuild = mls.esbuild;
                                return [2 /*return*/];
                            }
                            if (!mls.esbuildInLoad) return [3 /*break*/, 2];
                            return [4 /*yield*/, new Promise(function (res) {
                                    var t = setInterval(function () { if (mls.esbuild) {
                                        clearInterval(t);
                                        res();
                                    } }, 100);
                                })];
                        case 1:
                            _a.sent();
                            this.esbuild = mls.esbuild;
                            return [2 /*return*/];
                        case 2:
                            this.addLog('info', 'Loading esbuild-wasm...');
                            mls.esbuildInLoad = true;
                            url = 'https://unpkg.com/esbuild-wasm@0.14.54/esm/browser.min.js';
                            return [4 /*yield*/, Promise.resolve("".concat(url)).then(function (s) { return require(s); })];
                        case 3:
                            mod = _a.sent();
                            return [4 /*yield*/, mod.initialize({ wasmURL: 'https://unpkg.com/esbuild-wasm@0.14.54/esbuild.wasm' })];
                        case 4:
                            _a.sent();
                            this.esbuild = mod;
                            mls.esbuild = mod;
                            mls.esbuildInLoad = false;
                            this.addLog('info', 'esbuild ready');
                            return [2 /*return*/];
                    }
                });
            });
        };
        // ── Bundle ────────────────────────────────────────────────────────────────────
        ServicePreviewForge102021_1.prototype.buildBundle = function () {
            return __awaiter(this, void 0, void 0, function () {
                var project, routerPaths, virtualFiles, entry, result, e_2;
                var _this = this;
                var _a, _b, _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            project = mls.actualProject;
                            routerPaths = this.discoverRouters(project);
                            if (!routerPaths.length) {
                                this.addLog('warn', 'No layer_2_controllers/router.ts found in project');
                                return [2 /*return*/, null];
                            }
                            this.addLog('info', "Routers found: ".concat(routerPaths.map(function (p) { return p.split('/')[0]; }).join(', ')));
                            return [4 /*yield*/, this.getVirtualFiles(project)];
                        case 1:
                            virtualFiles = _f.sent();
                            entry = this.buildEntry(routerPaths, project);
                            _f.label = 2;
                        case 2:
                            _f.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, this.esbuild.build({
                                    stdin: { contents: entry, sourcefile: 'forge-entry.ts', resolveDir: '/', loader: 'ts' },
                                    bundle: true,
                                    write: false,
                                    format: 'esm',
                                    loader: { '.ts': 'ts' },
                                    plugins: [this.makeVfsPlugin(virtualFiles)],
                                })];
                        case 3:
                            result = _f.sent();
                            if ((_a = result.errors) === null || _a === void 0 ? void 0 : _a.length) {
                                result.errors.forEach(function (e) { return _this.addLog('error', "Build: ".concat(e.text)); });
                                return [2 /*return*/, null];
                            }
                            (_b = result.warnings) === null || _b === void 0 ? void 0 : _b.forEach(function (w) { return _this.addLog('warn', "Build: ".concat(w.text)); });
                            return [2 /*return*/, (_e = (_d = (_c = result.outputFiles) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.text) !== null && _e !== void 0 ? _e : null];
                        case 4:
                            e_2 = _f.sent();
                            this.addLog('error', "esbuild threw: ".concat(e_2.message));
                            return [2 /*return*/, null];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        ServicePreviewForge102021_1.prototype.discoverRouters = function (project) {
            return Object.values(mls.stor.files)
                .filter(function (f) { return (f === null || f === void 0 ? void 0 : f.project) === project && (f === null || f === void 0 ? void 0 : f.level) === 1 && (f === null || f === void 0 ? void 0 : f.shortName) === 'router' && (f === null || f === void 0 ? void 0 : f.extension) === '.ts'; })
                .map(function (f) { return f.folder ? "".concat(f.folder, "/").concat(f.shortName) : f.shortName; });
        };
        ServicePreviewForge102021_1.prototype.buildEntry = function (routerPaths, project) {
            var imports = routerPaths
                .map(function (p, i) { return "import * as _r".concat(i, " from '/_").concat(project, "_/l1/").concat(p, ".js';"); })
                .join('\n');
            var merge = routerPaths
                .map(function (_p, i) { return "\n  { const fn = Object.values(_r".concat(i, ").find((v: any) => typeof v === 'function');\n    if (fn) try { (fn as any)().forEach((h: any, k: string) => allRoutes.set(k, h)); } catch(e) {} }"); })
                .join('');
            return "\n".concat(imports, "\n\nconst allRoutes = new Map<string, Function>();\n").concat(merge, "\n\nconst _sendLog = (level: string, ...args: any[]) => {\n  try { parent.postMessage({ type: 'forge-log', level, msg: args.map(String).join(' ') }, '*'); } catch {}\n};\nconst _cl = console.log.bind(console);\nconst _cw = console.warn.bind(console);\nconst _ce = console.error.bind(console);\n(console as any).log   = (...a: any[]) => { _cl(...a);  _sendLog('info',  ...a); };\n(console as any).warn  = (...a: any[]) => { _cw(...a);  _sendLog('warn',  ...a); };\n(console as any).error = (...a: any[]) => { _ce(...a);  _sendLog('error', ...a); };\n\n_sendLog('info', '[forge] routes registered: ' + allRoutes.size + ' \u2014 [' + [...allRoutes.keys()].join(', ') + ']');\n\n(window as any).exec = async function(body: any) {\n  const route: string = typeof body === 'string' ? body : (body.route ?? '');\n  const params: any   = body.params ?? body;\n  _sendLog('info', '\u2192 ' + route + (Object.keys(params ?? {}).length ? ' ' + JSON.stringify(params) : ''));\n  const handler = allRoutes.get(route);\n  if (!handler) {\n    _sendLog('warn', '[forge] 404 route:', route);\n    return { ok: false, error: { code: 'NOT_FOUND', message: 'Route not found: ' + route } };\n  }\n  try {\n    const data = await (handler as any)(params);\n    _sendLog('info', '[forge] 200', route);\n    return { ok: true, data };\n  } catch(e: any) {\n    _sendLog('error', '[forge] 500', route, e?.message);\n    return { ok: false, error: { code: 'HANDLER_ERROR', message: e?.message ?? String(e) } };\n  }\n};\n");
        };
        ServicePreviewForge102021_1.prototype.getVirtualFiles = function (project) {
            return __awaiter(this, void 0, void 0, function () {
                var out, _i, _a, f, key, _b, _c;
                var _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            out = {};
                            _i = 0, _a = Object.values(mls.stor.files);
                            _e.label = 1;
                        case 1:
                            if (!(_i < _a.length)) return [3 /*break*/, 4];
                            f = _a[_i];
                            if (!f || f.project !== project || f.level !== 1 || f.extension !== '.ts')
                                return [3 /*break*/, 3];
                            key = "_".concat(f.project, "_/l").concat(f.level, "/").concat(f.folder ? f.folder + '/' : '').concat(f.shortName, ".js").toLowerCase();
                            if (!!out[key]) return [3 /*break*/, 3];
                            _b = out;
                            _c = key;
                            return [4 /*yield*/, f.getContent()];
                        case 2:
                            _b[_c] = (_d = (_e.sent())) !== null && _d !== void 0 ? _d : '';
                            _e.label = 3;
                        case 3:
                            _i++;
                            return [3 /*break*/, 1];
                        case 4: return [2 /*return*/, out];
                    }
                });
            });
        };
        ServicePreviewForge102021_1.prototype.makeVfsPlugin = function (files) {
            var _this = this;
            var warn = function (m) { return _this.addLog('warn', m); };
            return {
                name: 'forge-vfs',
                setup: function (build) {
                    build.onResolve({ filter: /^[./]/ }, function (args) {
                        var base = 'file://' + (args.importer || '/');
                        var resolved = new URL(args.path, base).pathname;
                        if (!resolved.endsWith('.ts') && !resolved.endsWith('.js'))
                            resolved += '.js';
                        return { path: resolved, namespace: 'vfs' };
                    });
                    build.onLoad({ filter: /\.(ts|js)$/, namespace: 'vfs' }, function (args) {
                        var key = args.path.replace(/^\/+/, '').toLowerCase();
                        var src = files[key];
                        if (!src) {
                            warn("[vfs] stub: ".concat(key));
                            return { contents: '// stub', loader: 'ts' };
                        }
                        return { contents: src, loader: 'ts' };
                    });
                }
            };
        };
        // ── Iframe ────────────────────────────────────────────────────────────────────
        ServicePreviewForge102021_1.prototype.mountIframe = function (bundle) {
            var _this = this;
            var iframe = document.createElement('iframe');
            iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
            iframe.style.display = 'none';
            this.renderRoot.appendChild(iframe);
            this.iframe = iframe;
            var doc = iframe.contentDocument;
            doc.open();
            doc.write("<!doctype html><html><body><script type=\"module\">".concat(bundle, "</script></body></html>"));
            doc.close();
            // Listen for forge-log messages sent from the iframe via parent.postMessage
            this._logHandler = function (e) {
                var _a, _b, _c;
                if (e.source !== iframe.contentWindow)
                    return;
                if (((_a = e.data) === null || _a === void 0 ? void 0 : _a.type) !== 'forge-log')
                    return;
                _this.addLog((_b = e.data.level) !== null && _b !== void 0 ? _b : 'info', (_c = e.data.msg) !== null && _c !== void 0 ? _c : '');
            };
            window.addEventListener('message', this._logHandler);
            // Register in the global previewL1 registry that servicePreviewView looks up
            if (!top.previewL1)
                top.previewL1 = {};
            top.previewL1["forge_".concat(mls.actualProject)] = { iframe: iframe };
            this.addLog('info', "Registered as previewL1.forge_".concat(mls.actualProject));
            iframe.contentWindow.onmessage = function (e) { return __awaiter(_this, void 0, void 0, function () {
                var data, res, execFn, params, result, e_3, previewWin;
                var _a, _b, _c, _d, _e, _f;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0:
                            data = e.data;
                            // Logs forwarded from the iframe bundle
                            if ((data === null || data === void 0 ? void 0 : data.type) === 'forge-log') {
                                this.addLog((_a = data.level) !== null && _a !== void 0 ? _a : 'info', (_b = data.msg) !== null && _b !== void 0 ? _b : '');
                                return [2 /*return*/];
                            }
                            if ((data === null || data === void 0 ? void 0 : data.type) !== 'fetch-request')
                                return [2 /*return*/];
                            res = {
                                type: 'fetch-response',
                                id: data.id,
                                body: '',
                                status: 200,
                                headers: { 'Content-Type': 'application/json' },
                            };
                            execFn = (_c = iframe.contentWindow) === null || _c === void 0 ? void 0 : _c.exec;
                            if (!!execFn) return [3 /*break*/, 1];
                            res.body = JSON.stringify({ ok: false, error: { code: 'NOT_READY', message: 'exec not mounted yet' } });
                            res.status = 503;
                            return [3 /*break*/, 4];
                        case 1:
                            _g.trys.push([1, 3, , 4]);
                            params = ((_d = data.options) === null || _d === void 0 ? void 0 : _d.body) ? JSON.parse(data.options.body) : {};
                            return [4 /*yield*/, execFn(params)];
                        case 2:
                            result = _g.sent();
                            res.body = JSON.stringify(result);
                            return [3 /*break*/, 4];
                        case 3:
                            e_3 = _g.sent();
                            res.body = JSON.stringify({ ok: false, error: { code: 'EXEC_ERROR', message: e_3.message } });
                            res.status = 500;
                            return [3 /*break*/, 4];
                        case 4:
                            previewWin = (_f = (_e = window.preview) === null || _e === void 0 ? void 0 : _e.iframe) === null || _f === void 0 ? void 0 : _f.contentWindow;
                            if (previewWin)
                                previewWin.postMessage(res, '*');
                            return [2 /*return*/];
                    }
                });
            }); };
        };
        // ── Logs ─────────────────────────────────────────────────────────────────────
        ServicePreviewForge102021_1.prototype.addLog = function (level, msg) {
            var _this = this;
            var time = new Date().toTimeString().slice(0, 8);
            this.logs = __spreadArray(__spreadArray([], this.logs.slice(-299), true), [{ time: time, level: level, msg: msg }], false);
            // auto-scroll
            this.updateComplete.then(function () {
                var el = _this.renderRoot.querySelector('.forge__console');
                if (el)
                    el.scrollTop = el.scrollHeight;
            });
        };
        // ── Render ────────────────────────────────────────────────────────────────────
        ServicePreviewForge102021_1.prototype.render = function () {
            var _a;
            return (0, lit_1.html)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n      <div class=\"forge\">\n        <header class=\"forge__header\">\n          <div class=\"forge__title\">\n            <span class=\"forge__dot forge__dot--", "\"></span>\n            <span>L1 Forge &mdash; project ", "</span>\n          </div>\n          <div class=\"forge__controls\">\n            <button\n              class=\"forge__btn forge__btn--", "\"\n              ?disabled=", "\n              @click=", "\n            >", "</button>\n            <button class=\"forge__btn forge__btn--ghost\" @click=", ">Clear</button>\n          </div>\n        </header>\n        <div class=\"forge__console\">\n          ", "\n        </div>\n      </div>\n    "], ["\n      <div class=\"forge\">\n        <header class=\"forge__header\">\n          <div class=\"forge__title\">\n            <span class=\"forge__dot forge__dot--", "\"></span>\n            <span>L1 Forge &mdash; project ", "</span>\n          </div>\n          <div class=\"forge__controls\">\n            <button\n              class=\"forge__btn forge__btn--", "\"\n              ?disabled=", "\n              @click=", "\n            >", "</button>\n            <button class=\"forge__btn forge__btn--ghost\" @click=", ">Clear</button>\n          </div>\n        </header>\n        <div class=\"forge__console\">\n          ", "\n        </div>\n      </div>\n    "])), this.running ? 'on' : 'off', (_a = mls === null || mls === void 0 ? void 0 : mls.actualProject) !== null && _a !== void 0 ? _a : '?', this.running ? 'stop' : 'start', this.building, this.handleToggle, this.building ? '⏳ Building…' : this.running ? '⏹ Stop' : '▶ Start', this.handleClearLogs, (0, repeat_js_1.repeat)(this.logs, function (_l, i) { return i; }, function (l) { return (0, lit_1.html)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n            <div class=\"forge__line forge__line--", "\">\n              <span class=\"forge__time\">", "</span>\n              <span class=\"forge__msg\">", "</span>\n            </div>\n          "], ["\n            <div class=\"forge__line forge__line--", "\">\n              <span class=\"forge__time\">", "</span>\n              <span class=\"forge__msg\">", "</span>\n            </div>\n          "])), l.level, l.time, l.msg); }));
        };
        return ServicePreviewForge102021_1;
    }(_classSuper));
    __setFunctionName(_classThis, "ServicePreviewForge102021");
    (function () {
        var _a;
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        _running_decorators = [(0, decorators_js_1.state)()];
        _building_decorators = [(0, decorators_js_1.state)()];
        _logs_decorators = [(0, decorators_js_1.state)()];
        __esDecorate(null, null, _running_decorators, { kind: "field", name: "running", static: false, private: false, access: { has: function (obj) { return "running" in obj; }, get: function (obj) { return obj.running; }, set: function (obj, value) { obj.running = value; } }, metadata: _metadata }, _running_initializers, _running_extraInitializers);
        __esDecorate(null, null, _building_decorators, { kind: "field", name: "building", static: false, private: false, access: { has: function (obj) { return "building" in obj; }, get: function (obj) { return obj.building; }, set: function (obj, value) { obj.building = value; } }, metadata: _metadata }, _building_initializers, _building_extraInitializers);
        __esDecorate(null, null, _logs_decorators, { kind: "field", name: "logs", static: false, private: false, access: { has: function (obj) { return "logs" in obj; }, get: function (obj) { return obj.logs; }, set: function (obj, value) { obj.logs = value; } }, metadata: _metadata }, _logs_initializers, _logs_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ServicePreviewForge102021 = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
    })();
    _classThis.styles = (0, lit_1.css)(templateObject_3 || (templateObject_3 = __makeTemplateObject(["\n    :host { display: block; font-family: 'Consolas', 'Menlo', monospace; font-size: 12px; }\n\n    .forge {\n      display: flex; flex-direction: column; height: 100%;\n      background: #1e1e1e; color: #ccc; border-radius: 6px; overflow: hidden;\n    }\n    .forge__header {\n      display: flex; align-items: center; justify-content: space-between;\n      padding: 8px 12px; background: #252526; border-bottom: 1px solid #333; flex-shrink: 0;\n    }\n    .forge__title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #e0e0e0; }\n    .forge__dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }\n    .forge__dot--on  { background: #4caf50; box-shadow: 0 0 6px #4caf50; }\n    .forge__dot--off { background: #555; }\n\n    .forge__controls { display: flex; gap: 6px; }\n    .forge__btn {\n      border: none; border-radius: 4px; padding: 4px 12px;\n      cursor: pointer; font-size: 12px; font-family: inherit;\n    }\n    .forge__btn--start { background: #2d7d32; color: #fff; }\n    .forge__btn--stop  { background: #b71c1c; color: #fff; }\n    .forge__btn--ghost { background: #3a3a3a; color: #aaa; }\n    .forge__btn:disabled { opacity: .4; cursor: default; }\n\n    .forge__console {\n      flex: 1; overflow-y: auto; padding: 8px 10px;\n      display: flex; flex-direction: column; gap: 1px;\n    }\n    .forge__line { display: flex; gap: 10px; line-height: 1.6; }\n    .forge__time { color: #555; flex-shrink: 0; user-select: none; }\n    .forge__line--info  .forge__msg { color: #9cdcfe; }\n    .forge__line--warn  .forge__msg { color: #ce9178; }\n    .forge__line--error .forge__msg { color: #f48771; }\n  "], ["\n    :host { display: block; font-family: 'Consolas', 'Menlo', monospace; font-size: 12px; }\n\n    .forge {\n      display: flex; flex-direction: column; height: 100%;\n      background: #1e1e1e; color: #ccc; border-radius: 6px; overflow: hidden;\n    }\n    .forge__header {\n      display: flex; align-items: center; justify-content: space-between;\n      padding: 8px 12px; background: #252526; border-bottom: 1px solid #333; flex-shrink: 0;\n    }\n    .forge__title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #e0e0e0; }\n    .forge__dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }\n    .forge__dot--on  { background: #4caf50; box-shadow: 0 0 6px #4caf50; }\n    .forge__dot--off { background: #555; }\n\n    .forge__controls { display: flex; gap: 6px; }\n    .forge__btn {\n      border: none; border-radius: 4px; padding: 4px 12px;\n      cursor: pointer; font-size: 12px; font-family: inherit;\n    }\n    .forge__btn--start { background: #2d7d32; color: #fff; }\n    .forge__btn--stop  { background: #b71c1c; color: #fff; }\n    .forge__btn--ghost { background: #3a3a3a; color: #aaa; }\n    .forge__btn:disabled { opacity: .4; cursor: default; }\n\n    .forge__console {\n      flex: 1; overflow-y: auto; padding: 8px 10px;\n      display: flex; flex-direction: column; gap: 1px;\n    }\n    .forge__line { display: flex; gap: 10px; line-height: 1.6; }\n    .forge__time { color: #555; flex-shrink: 0; user-select: none; }\n    .forge__line--info  .forge__msg { color: #9cdcfe; }\n    .forge__line--warn  .forge__msg { color: #ce9178; }\n    .forge__line--error .forge__msg { color: #f48771; }\n  "])));
    (function () {
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ServicePreviewForge102021 = _classThis;
}();
exports.ServicePreviewForge102021 = ServicePreviewForge102021;
var templateObject_1, templateObject_2, templateObject_3;
