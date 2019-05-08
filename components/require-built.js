/** vim: et:ts=4:sw=4:sts=4
 * @license RequireJS 2.1.5 Copyright (c) 2010-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */
//Not using strict: uneven strict support in browsers, #392, and causes
//problems with requirejs.exec()/transpiler plugins that may not be strict.
/*jslint regexp: true, nomen: true, sloppy: true */
/*global window, navigator, document, importScripts, setTimeout, opera */

var requirejs, require, define;
(function (global) {
    var req, s, head, baseElement, dataMain, src,
        interactiveScript, currentlyAddingScript, mainScript, subPath,
        version = '2.1.5',
        commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg,
        cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,
        jsSuffixRegExp = /\.js$/,
        currDirRegExp = /^\.\//,
        op = Object.prototype,
        ostring = op.toString,
        hasOwn = op.hasOwnProperty,
        ap = Array.prototype,
        apsp = ap.splice,
        isBrowser = !!(typeof window !== 'undefined' && navigator && document),
        isWebWorker = !isBrowser && typeof importScripts !== 'undefined',
        //PS3 indicates loaded and complete, but need to wait for complete
        //specifically. Sequence is 'loading', 'loaded', execution,
        // then 'complete'. The UA check is unfortunate, but not sure how
        //to feature test w/o causing perf issues.
        readyRegExp = isBrowser && navigator.platform === 'PLAYSTATION 3' ?
                      /^complete$/ : /^(complete|loaded)$/,
        defContextName = '_',
        //Oh the tragedy, detecting opera. See the usage of isOpera for reason.
        isOpera = typeof opera !== 'undefined' && opera.toString() === '[object Opera]',
        contexts = {},
        cfg = {},
        globalDefQueue = [],
        useInteractive = false;

    function isFunction(it) {
        return ostring.call(it) === '[object Function]';
    }

    function isArray(it) {
        return ostring.call(it) === '[object Array]';
    }

    /**
     * Helper function for iterating over an array. If the func returns
     * a true value, it will break out of the loop.
     */
    function each(ary, func) {
        if (ary) {
            var i;
            for (i = 0; i < ary.length; i += 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    /**
     * Helper function for iterating over an array backwards. If the func
     * returns a true value, it will break out of the loop.
     */
    function eachReverse(ary, func) {
        if (ary) {
            var i;
            for (i = ary.length - 1; i > -1; i -= 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    function getOwn(obj, prop) {
        return hasProp(obj, prop) && obj[prop];
    }

    /**
     * Cycles over properties in an object and calls a function for each
     * property value. If the function returns a truthy value, then the
     * iteration is stopped.
     */
    function eachProp(obj, func) {
        var prop;
        for (prop in obj) {
            if (hasProp(obj, prop)) {
                if (func(obj[prop], prop)) {
                    break;
                }
            }
        }
    }

    /**
     * Simple function to mix in properties from source into target,
     * but only if target does not already have a property of the same name.
     */
    function mixin(target, source, force, deepStringMixin) {
        if (source) {
            eachProp(source, function (value, prop) {
                if (force || !hasProp(target, prop)) {
                    if (deepStringMixin && typeof value !== 'string') {
                        if (!target[prop]) {
                            target[prop] = {};
                        }
                        mixin(target[prop], value, force, deepStringMixin);
                    } else {
                        target[prop] = value;
                    }
                }
            });
        }
        return target;
    }

    //Similar to Function.prototype.bind, but the 'this' object is specified
    //first, since it is easier to read/figure out what 'this' will be.
    function bind(obj, fn) {
        return function () {
            return fn.apply(obj, arguments);
        };
    }

    function scripts() {
        return document.getElementsByTagName('script');
    }

    //Allow getting a global that expressed in
    //dot notation, like 'a.b.c'.
    function getGlobal(value) {
        if (!value) {
            return value;
        }
        var g = global;
        each(value.split('.'), function (part) {
            g = g[part];
        });
        return g;
    }

    /**
     * Constructs an error with a pointer to an URL with more information.
     * @param {String} id the error ID that maps to an ID on a web page.
     * @param {String} message human readable error.
     * @param {Error} [err] the original error, if there is one.
     *
     * @returns {Error}
     */
    function makeError(id, msg, err, requireModules) {
        var e = new Error(msg + '\nhttp://requirejs.org/docs/errors.html#' + id);
        e.requireType = id;
        e.requireModules = requireModules;
        if (err) {
            e.originalError = err;
        }
        return e;
    }

    if (typeof define !== 'undefined') {
        //If a define is already in play via another AMD loader,
        //do not overwrite.
        return;
    }

    if (typeof requirejs !== 'undefined') {
        if (isFunction(requirejs)) {
            //Do not overwrite and existing requirejs instance.
            return;
        }
        cfg = requirejs;
        requirejs = undefined;
    }

    //Allow for a require config object
    if (typeof require !== 'undefined' && !isFunction(require)) {
        //assume it is a config object.
        cfg = require;
        require = undefined;
    }

    function newContext(contextName) {
        var inCheckLoaded, Module, context, handlers,
            checkLoadedTimeoutId,
            config = {
                //Defaults. Do not set a default for map
                //config to speed up normalize(), which
                //will run faster if there is no default.
                waitSeconds: 7,
                baseUrl: './',
                paths: {},
                pkgs: {},
                shim: {},
                config: {}
            },
            registry = {},
            //registry of just enabled modules, to speed
            //cycle breaking code when lots of modules
            //are registered, but not activated.
            enabledRegistry = {},
            undefEvents = {},
            defQueue = [],
            defined = {},
            urlFetched = {},
            requireCounter = 1,
            unnormalizedCounter = 1;

        /**
         * Trims the . and .. from an array of path segments.
         * It will keep a leading path segment if a .. will become
         * the first path segment, to help with module name lookups,
         * which act like paths, but can be remapped. But the end result,
         * all paths that use this function should look normalized.
         * NOTE: this method MODIFIES the input array.
         * @param {Array} ary the array of path segments.
         */
        function trimDots(ary) {
            var i, part;
            for (i = 0; ary[i]; i += 1) {
                part = ary[i];
                if (part === '.') {
                    ary.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    if (i === 1 && (ary[2] === '..' || ary[0] === '..')) {
                        //End of the line. Keep at least one non-dot
                        //path segment at the front so it can be mapped
                        //correctly to disk. Otherwise, there is likely
                        //no path mapping for a path starting with '..'.
                        //This can still fail, but catches the most reasonable
                        //uses of ..
                        break;
                    } else if (i > 0) {
                        ary.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
        }

        /**
         * Given a relative module name, like ./something, normalize it to
         * a real name that can be mapped to a path.
         * @param {String} name the relative name
         * @param {String} baseName a real name that the name arg is relative
         * to.
         * @param {Boolean} applyMap apply the map config to the value. Should
         * only be done if this normalization is for a dependency ID.
         * @returns {String} normalized name
         */
        function normalize(name, baseName, applyMap) {
            var pkgName, pkgConfig, mapValue, nameParts, i, j, nameSegment,
                foundMap, foundI, foundStarMap, starI,
                baseParts = baseName && baseName.split('/'),
                normalizedBaseParts = baseParts,
                map = config.map,
                starMap = map && map['*'];

            //Adjust any relative paths.
            if (name && name.charAt(0) === '.') {
                //If have a base name, try to normalize against it,
                //otherwise, assume it is a top-level require that will
                //be relative to baseUrl in the end.
                if (baseName) {
                    if (getOwn(config.pkgs, baseName)) {
                        //If the baseName is a package name, then just treat it as one
                        //name to concat the name with.
                        normalizedBaseParts = baseParts = [baseName];
                    } else {
                        //Convert baseName to array, and lop off the last part,
                        //so that . matches that 'directory' and not name of the baseName's
                        //module. For instance, baseName of 'one/two/three', maps to
                        //'one/two/three.js', but we want the directory, 'one/two' for
                        //this normalization.
                        normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                    }

                    name = normalizedBaseParts.concat(name.split('/'));
                    trimDots(name);

                    //Some use of packages may use a . path to reference the
                    //'main' module name, so normalize for that.
                    pkgConfig = getOwn(config.pkgs, (pkgName = name[0]));
                    name = name.join('/');
                    if (pkgConfig && name === pkgName + '/' + pkgConfig.main) {
                        name = pkgName;
                    }
                } else if (name.indexOf('./') === 0) {
                    // No baseName, so this is ID is resolved relative
                    // to baseUrl, pull off the leading dot.
                    name = name.substring(2);
                }
            }

            //Apply map config if available.
            if (applyMap && map && (baseParts || starMap)) {
                nameParts = name.split('/');

                for (i = nameParts.length; i > 0; i -= 1) {
                    nameSegment = nameParts.slice(0, i).join('/');

                    if (baseParts) {
                        //Find the longest baseName segment match in the config.
                        //So, do joins on the biggest to smallest lengths of baseParts.
                        for (j = baseParts.length; j > 0; j -= 1) {
                            mapValue = getOwn(map, baseParts.slice(0, j).join('/'));

                            //baseName segment has config, find if it has one for
                            //this name.
                            if (mapValue) {
                                mapValue = getOwn(mapValue, nameSegment);
                                if (mapValue) {
                                    //Match, update name to the new value.
                                    foundMap = mapValue;
                                    foundI = i;
                                    break;
                                }
                            }
                        }
                    }

                    if (foundMap) {
                        break;
                    }

                    //Check for a star map match, but just hold on to it,
                    //if there is a shorter segment match later in a matching
                    //config, then favor over this star map.
                    if (!foundStarMap && starMap && getOwn(starMap, nameSegment)) {
                        foundStarMap = getOwn(starMap, nameSegment);
                        starI = i;
                    }
                }

                if (!foundMap && foundStarMap) {
                    foundMap = foundStarMap;
                    foundI = starI;
                }

                if (foundMap) {
                    nameParts.splice(0, foundI, foundMap);
                    name = nameParts.join('/');
                }
            }

            return name;
        }

        function removeScript(name) {
            if (isBrowser) {
                each(scripts(), function (scriptNode) {
                    if (scriptNode.getAttribute('data-requiremodule') === name &&
                            scriptNode.getAttribute('data-requirecontext') === context.contextName) {
                        scriptNode.parentNode.removeChild(scriptNode);
                        return true;
                    }
                });
            }
        }

        function hasPathFallback(id) {
            var pathConfig = getOwn(config.paths, id);
            if (pathConfig && isArray(pathConfig) && pathConfig.length > 1) {
                removeScript(id);
                //Pop off the first array value, since it failed, and
                //retry
                pathConfig.shift();
                context.require.undef(id);
                context.require([id]);
                return true;
            }
        }

        //Turns a plugin!resource to [plugin, resource]
        //with the plugin being undefined if the name
        //did not have a plugin prefix.
        function splitPrefix(name) {
            var prefix,
                index = name ? name.indexOf('!') : -1;
            if (index > -1) {
                prefix = name.substring(0, index);
                name = name.substring(index + 1, name.length);
            }
            return [prefix, name];
        }

        /**
         * Creates a module mapping that includes plugin prefix, module
         * name, and path. If parentModuleMap is provided it will
         * also normalize the name via require.normalize()
         *
         * @param {String} name the module name
         * @param {String} [parentModuleMap] parent module map
         * for the module name, used to resolve relative names.
         * @param {Boolean} isNormalized: is the ID already normalized.
         * This is true if this call is done for a define() module ID.
         * @param {Boolean} applyMap: apply the map config to the ID.
         * Should only be true if this map is for a dependency.
         *
         * @returns {Object}
         */
        function makeModuleMap(name, parentModuleMap, isNormalized, applyMap) {
            var url, pluginModule, suffix, nameParts,
                prefix = null,
                parentName = parentModuleMap ? parentModuleMap.name : null,
                originalName = name,
                isDefine = true,
                normalizedName = '';

            //If no name, then it means it is a require call, generate an
            //internal name.
            if (!name) {
                isDefine = false;
                name = '_@r' + (requireCounter += 1);
            }

            nameParts = splitPrefix(name);
            prefix = nameParts[0];
            name = nameParts[1];

            if (prefix) {
                prefix = normalize(prefix, parentName, applyMap);
                pluginModule = getOwn(defined, prefix);
            }

            //Account for relative paths if there is a base name.
            if (name) {
                if (prefix) {
                    if (pluginModule && pluginModule.normalize) {
                        //Plugin is loaded, use its normalize method.
                        normalizedName = pluginModule.normalize(name, function (name) {
                            return normalize(name, parentName, applyMap);
                        });
                    } else {
                        normalizedName = normalize(name, parentName, applyMap);
                    }
                } else {
                    //A regular module.
                    normalizedName = normalize(name, parentName, applyMap);

                    //Normalized name may be a plugin ID due to map config
                    //application in normalize. The map config values must
                    //already be normalized, so do not need to redo that part.
                    nameParts = splitPrefix(normalizedName);
                    prefix = nameParts[0];
                    normalizedName = nameParts[1];
                    isNormalized = true;

                    url = context.nameToUrl(normalizedName);
                }
            }

            //If the id is a plugin id that cannot be determined if it needs
            //normalization, stamp it with a unique ID so two matching relative
            //ids that may conflict can be separate.
            suffix = prefix && !pluginModule && !isNormalized ?
                     '_unnormalized' + (unnormalizedCounter += 1) :
                     '';

            return {
                prefix: prefix,
                name: normalizedName,
                parentMap: parentModuleMap,
                unnormalized: !!suffix,
                url: url,
                originalName: originalName,
                isDefine: isDefine,
                id: (prefix ?
                        prefix + '!' + normalizedName :
                        normalizedName) + suffix
            };
        }

        function getModule(depMap) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (!mod) {
                mod = registry[id] = new context.Module(depMap);
            }

            return mod;
        }

        function on(depMap, name, fn) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (hasProp(defined, id) &&
                    (!mod || mod.defineEmitComplete)) {
                if (name === 'defined') {
                    fn(defined[id]);
                }
            } else {
                getModule(depMap).on(name, fn);
            }
        }

        function onError(err, errback) {
            var ids = err.requireModules,
                notified = false;

            if (errback) {
                errback(err);
            } else {
                each(ids, function (id) {
                    var mod = getOwn(registry, id);
                    if (mod) {
                        //Set error on module, so it skips timeout checks.
                        mod.error = err;
                        if (mod.events.error) {
                            notified = true;
                            mod.emit('error', err);
                        }
                    }
                });

                if (!notified) {
                    req.onError(err);
                }
            }
        }

        /**
         * Internal method to transfer globalQueue items to this context's
         * defQueue.
         */
        function takeGlobalQueue() {
            //Push all the globalDefQueue items into the context's defQueue
            if (globalDefQueue.length) {
                //Array splice in the values since the context code has a
                //local var ref to defQueue, so cannot just reassign the one
                //on context.
                apsp.apply(defQueue,
                           [defQueue.length - 1, 0].concat(globalDefQueue));
                globalDefQueue = [];
            }
        }

        handlers = {
            'require': function (mod) {
                if (mod.require) {
                    return mod.require;
                } else {
                    return (mod.require = context.makeRequire(mod.map));
                }
            },
            'exports': function (mod) {
                mod.usingExports = true;
                if (mod.map.isDefine) {
                    if (mod.exports) {
                        return mod.exports;
                    } else {
                        return (mod.exports = defined[mod.map.id] = {});
                    }
                }
            },
            'module': function (mod) {
                if (mod.module) {
                    return mod.module;
                } else {
                    return (mod.module = {
                        id: mod.map.id,
                        uri: mod.map.url,
                        config: function () {
                            return (config.config && getOwn(config.config, mod.map.id)) || {};
                        },
                        exports: defined[mod.map.id]
                    });
                }
            }
        };

        function cleanRegistry(id) {
            //Clean up machinery used for waiting modules.
            delete registry[id];
            delete enabledRegistry[id];
        }

        function breakCycle(mod, traced, processed) {
            var id = mod.map.id;

            if (mod.error) {
                mod.emit('error', mod.error);
            } else {
                traced[id] = true;
                each(mod.depMaps, function (depMap, i) {
                    var depId = depMap.id,
                        dep = getOwn(registry, depId);

                    //Only force things that have not completed
                    //being defined, so still in the registry,
                    //and only if it has not been matched up
                    //in the module already.
                    if (dep && !mod.depMatched[i] && !processed[depId]) {
                        if (getOwn(traced, depId)) {
                            mod.defineDep(i, defined[depId]);
                            mod.check(); //pass false?
                        } else {
                            breakCycle(dep, traced, processed);
                        }
                    }
                });
                processed[id] = true;
            }
        }

        function checkLoaded() {
            var map, modId, err, usingPathFallback,
                waitInterval = config.waitSeconds * 1000,
                //It is possible to disable the wait interval by using waitSeconds of 0.
                expired = waitInterval && (context.startTime + waitInterval) < new Date().getTime(),
                noLoads = [],
                reqCalls = [],
                stillLoading = false,
                needCycleCheck = true;

            //Do not bother if this call was a result of a cycle break.
            if (inCheckLoaded) {
                return;
            }

            inCheckLoaded = true;

            //Figure out the state of all the modules.
            eachProp(enabledRegistry, function (mod) {
                map = mod.map;
                modId = map.id;

                //Skip things that are not enabled or in error state.
                if (!mod.enabled) {
                    return;
                }

                if (!map.isDefine) {
                    reqCalls.push(mod);
                }

                if (!mod.error) {
                    //If the module should be executed, and it has not
                    //been inited and time is up, remember it.
                    if (!mod.inited && expired) {
                        if (hasPathFallback(modId)) {
                            usingPathFallback = true;
                            stillLoading = true;
                        } else {
                            noLoads.push(modId);
                            removeScript(modId);
                        }
                    } else if (!mod.inited && mod.fetched && map.isDefine) {
                        stillLoading = true;
                        if (!map.prefix) {
                            //No reason to keep looking for unfinished
                            //loading. If the only stillLoading is a
                            //plugin resource though, keep going,
                            //because it may be that a plugin resource
                            //is waiting on a non-plugin cycle.
                            return (needCycleCheck = false);
                        }
                    }
                }
            });

            if (expired && noLoads.length) {
                //If wait time expired, throw error of unloaded modules.
                err = makeError('timeout', 'Load timeout for modules: ' + noLoads, null, noLoads);
                err.contextName = context.contextName;
                return onError(err);
            }

            //Not expired, check for a cycle.
            if (needCycleCheck) {
                each(reqCalls, function (mod) {
                    breakCycle(mod, {}, {});
                });
            }

            //If still waiting on loads, and the waiting load is something
            //other than a plugin resource, or there are still outstanding
            //scripts, then just try back later.
            if ((!expired || usingPathFallback) && stillLoading) {
                //Something is still waiting to load. Wait for it, but only
                //if a timeout is not already in effect.
                if ((isBrowser || isWebWorker) && !checkLoadedTimeoutId) {
                    checkLoadedTimeoutId = setTimeout(function () {
                        checkLoadedTimeoutId = 0;
                        checkLoaded();
                    }, 50);
                }
            }

            inCheckLoaded = false;
        }

        Module = function (map) {
            this.events = getOwn(undefEvents, map.id) || {};
            this.map = map;
            this.shim = getOwn(config.shim, map.id);
            this.depExports = [];
            this.depMaps = [];
            this.depMatched = [];
            this.pluginMaps = {};
            this.depCount = 0;

            /* this.exports this.factory
               this.depMaps = [],
               this.enabled, this.fetched
            */
        };

        Module.prototype = {
            init: function (depMaps, factory, errback, options) {
                options = options || {};

                //Do not do more inits if already done. Can happen if there
                //are multiple define calls for the same module. That is not
                //a normal, common case, but it is also not unexpected.
                if (this.inited) {
                    return;
                }

                this.factory = factory;

                if (errback) {
                    //Register for errors on this module.
                    this.on('error', errback);
                } else if (this.events.error) {
                    //If no errback already, but there are error listeners
                    //on this module, set up an errback to pass to the deps.
                    errback = bind(this, function (err) {
                        this.emit('error', err);
                    });
                }

                //Do a copy of the dependency array, so that
                //source inputs are not modified. For example
                //"shim" deps are passed in here directly, and
                //doing a direct modification of the depMaps array
                //would affect that config.
                this.depMaps = depMaps && depMaps.slice(0);

                this.errback = errback;

                //Indicate this module has be initialized
                this.inited = true;

                this.ignore = options.ignore;

                //Could have option to init this module in enabled mode,
                //or could have been previously marked as enabled. However,
                //the dependencies are not known until init is called. So
                //if enabled previously, now trigger dependencies as enabled.
                if (options.enabled || this.enabled) {
                    //Enable this module and dependencies.
                    //Will call this.check()
                    this.enable();
                } else {
                    this.check();
                }
            },

            defineDep: function (i, depExports) {
                //Because of cycles, defined callback for a given
                //export can be called more than once.
                if (!this.depMatched[i]) {
                    this.depMatched[i] = true;
                    this.depCount -= 1;
                    this.depExports[i] = depExports;
                }
            },

            fetch: function () {
                if (this.fetched) {
                    return;
                }
                this.fetched = true;

                context.startTime = (new Date()).getTime();

                var map = this.map;

                //If the manager is for a plugin managed resource,
                //ask the plugin to load it now.
                if (this.shim) {
                    context.makeRequire(this.map, {
                        enableBuildCallback: true
                    })(this.shim.deps || [], bind(this, function () {
                        return map.prefix ? this.callPlugin() : this.load();
                    }));
                } else {
                    //Regular dependency.
                    return map.prefix ? this.callPlugin() : this.load();
                }
            },

            load: function () {
                var url = this.map.url;

                //Regular dependency.
                if (!urlFetched[url]) {
                    urlFetched[url] = true;
                    context.load(this.map.id, url);
                }
            },

            /**
             * Checks if the module is ready to define itself, and if so,
             * define it.
             */
            check: function () {
                if (!this.enabled || this.enabling) {
                    return;
                }

                var err, cjsModule,
                    id = this.map.id,
                    depExports = this.depExports,
                    exports = this.exports,
                    factory = this.factory;

                if (!this.inited) {
                    this.fetch();
                } else if (this.error) {
                    this.emit('error', this.error);
                } else if (!this.defining) {
                    //The factory could trigger another require call
                    //that would result in checking this module to
                    //define itself again. If already in the process
                    //of doing that, skip this work.
                    this.defining = true;

                    if (this.depCount < 1 && !this.defined) {
                        if (isFunction(factory)) {
                            //If there is an error listener, favor passing
                            //to that instead of throwing an error.
                            if (this.events.error) {
                                try {
                                    exports = context.execCb(id, factory, depExports, exports);
                                } catch (e) {
                                    err = e;
                                }
                            } else {
                                exports = context.execCb(id, factory, depExports, exports);
                            }

                            if (this.map.isDefine) {
                                //If setting exports via 'module' is in play,
                                //favor that over return value and exports. After that,
                                //favor a non-undefined return value over exports use.
                                cjsModule = this.module;
                                if (cjsModule &&
                                        cjsModule.exports !== undefined &&
                                        //Make sure it is not already the exports value
                                        cjsModule.exports !== this.exports) {
                                    exports = cjsModule.exports;
                                } else if (exports === undefined && this.usingExports) {
                                    //exports already set the defined value.
                                    exports = this.exports;
                                }
                            }

                            if (err) {
                                err.requireMap = this.map;
                                err.requireModules = [this.map.id];
                                err.requireType = 'define';
                                return onError((this.error = err));
                            }

                        } else {
                            //Just a literal value
                            exports = factory;
                        }

                        this.exports = exports;

                        if (this.map.isDefine && !this.ignore) {
                            defined[id] = exports;

                            if (req.onResourceLoad) {
                                req.onResourceLoad(context, this.map, this.depMaps);
                            }
                        }

                        //Clean up
                        cleanRegistry(id);

                        this.defined = true;
                    }

                    //Finished the define stage. Allow calling check again
                    //to allow define notifications below in the case of a
                    //cycle.
                    this.defining = false;

                    if (this.defined && !this.defineEmitted) {
                        this.defineEmitted = true;
                        this.emit('defined', this.exports);
                        this.defineEmitComplete = true;
                    }

                }
            },

            callPlugin: function () {
                var map = this.map,
                    id = map.id,
                    //Map already normalized the prefix.
                    pluginMap = makeModuleMap(map.prefix);

                //Mark this as a dependency for this plugin, so it
                //can be traced for cycles.
                this.depMaps.push(pluginMap);

                on(pluginMap, 'defined', bind(this, function (plugin) {
                    var load, normalizedMap, normalizedMod,
                        name = this.map.name,
                        parentName = this.map.parentMap ? this.map.parentMap.name : null,
                        localRequire = context.makeRequire(map.parentMap, {
                            enableBuildCallback: true
                        });

                    //If current map is not normalized, wait for that
                    //normalized name to load instead of continuing.
                    if (this.map.unnormalized) {
                        //Normalize the ID if the plugin allows it.
                        if (plugin.normalize) {
                            name = plugin.normalize(name, function (name) {
                                return normalize(name, parentName, true);
                            }) || '';
                        }

                        //prefix and name should already be normalized, no need
                        //for applying map config again either.
                        normalizedMap = makeModuleMap(map.prefix + '!' + name,
                                                      this.map.parentMap);
                        on(normalizedMap,
                            'defined', bind(this, function (value) {
                                this.init([], function () { return value; }, null, {
                                    enabled: true,
                                    ignore: true
                                });
                            }));

                        normalizedMod = getOwn(registry, normalizedMap.id);
                        if (normalizedMod) {
                            //Mark this as a dependency for this plugin, so it
                            //can be traced for cycles.
                            this.depMaps.push(normalizedMap);

                            if (this.events.error) {
                                normalizedMod.on('error', bind(this, function (err) {
                                    this.emit('error', err);
                                }));
                            }
                            normalizedMod.enable();
                        }

                        return;
                    }

                    load = bind(this, function (value) {
                        this.init([], function () { return value; }, null, {
                            enabled: true
                        });
                    });

                    load.error = bind(this, function (err) {
                        this.inited = true;
                        this.error = err;
                        err.requireModules = [id];

                        //Remove temp unnormalized modules for this module,
                        //since they will never be resolved otherwise now.
                        eachProp(registry, function (mod) {
                            if (mod.map.id.indexOf(id + '_unnormalized') === 0) {
                                cleanRegistry(mod.map.id);
                            }
                        });

                        onError(err);
                    });

                    //Allow plugins to load other code without having to know the
                    //context or how to 'complete' the load.
                    load.fromText = bind(this, function (text, textAlt) {
                        /*jslint evil: true */
                        var moduleName = map.name,
                            moduleMap = makeModuleMap(moduleName),
                            hasInteractive = useInteractive;

                        //As of 2.1.0, support just passing the text, to reinforce
                        //fromText only being called once per resource. Still
                        //support old style of passing moduleName but discard
                        //that moduleName in favor of the internal ref.
                        if (textAlt) {
                            text = textAlt;
                        }

                        //Turn off interactive script matching for IE for any define
                        //calls in the text, then turn it back on at the end.
                        if (hasInteractive) {
                            useInteractive = false;
                        }

                        //Prime the system by creating a module instance for
                        //it.
                        getModule(moduleMap);

                        //Transfer any config to this other module.
                        if (hasProp(config.config, id)) {
                            config.config[moduleName] = config.config[id];
                        }

                        try {
                            req.exec(text);
                        } catch (e) {
                            return onError(makeError('fromtexteval',
                                             'fromText eval for ' + id +
                                            ' failed: ' + e,
                                             e,
                                             [id]));
                        }

                        if (hasInteractive) {
                            useInteractive = true;
                        }

                        //Mark this as a dependency for the plugin
                        //resource
                        this.depMaps.push(moduleMap);

                        //Support anonymous modules.
                        context.completeLoad(moduleName);

                        //Bind the value of that module to the value for this
                        //resource ID.
                        localRequire([moduleName], load);
                    });

                    //Use parentName here since the plugin's name is not reliable,
                    //could be some weird string with no path that actually wants to
                    //reference the parentName's path.
                    plugin.load(map.name, localRequire, load, config);
                }));

                context.enable(pluginMap, this);
                this.pluginMaps[pluginMap.id] = pluginMap;
            },

            enable: function () {
                enabledRegistry[this.map.id] = this;
                this.enabled = true;

                //Set flag mentioning that the module is enabling,
                //so that immediate calls to the defined callbacks
                //for dependencies do not trigger inadvertent load
                //with the depCount still being zero.
                this.enabling = true;

                //Enable each dependency
                each(this.depMaps, bind(this, function (depMap, i) {
                    var id, mod, handler;

                    if (typeof depMap === 'string') {
                        //Dependency needs to be converted to a depMap
                        //and wired up to this module.
                        depMap = makeModuleMap(depMap,
                                               (this.map.isDefine ? this.map : this.map.parentMap),
                                               false,
                                               !this.skipMap);
                        this.depMaps[i] = depMap;

                        handler = getOwn(handlers, depMap.id);

                        if (handler) {
                            this.depExports[i] = handler(this);
                            return;
                        }

                        this.depCount += 1;

                        on(depMap, 'defined', bind(this, function (depExports) {
                            this.defineDep(i, depExports);
                            this.check();
                        }));

                        if (this.errback) {
                            on(depMap, 'error', this.errback);
                        }
                    }

                    id = depMap.id;
                    mod = registry[id];

                    //Skip special modules like 'require', 'exports', 'module'
                    //Also, don't call enable if it is already enabled,
                    //important in circular dependency cases.
                    if (!hasProp(handlers, id) && mod && !mod.enabled) {
                        context.enable(depMap, this);
                    }
                }));

                //Enable each plugin that is used in
                //a dependency
                eachProp(this.pluginMaps, bind(this, function (pluginMap) {
                    var mod = getOwn(registry, pluginMap.id);
                    if (mod && !mod.enabled) {
                        context.enable(pluginMap, this);
                    }
                }));

                this.enabling = false;

                this.check();
            },

            on: function (name, cb) {
                var cbs = this.events[name];
                if (!cbs) {
                    cbs = this.events[name] = [];
                }
                cbs.push(cb);
            },

            emit: function (name, evt) {
                each(this.events[name], function (cb) {
                    cb(evt);
                });
                if (name === 'error') {
                    //Now that the error handler was triggered, remove
                    //the listeners, since this broken Module instance
                    //can stay around for a while in the registry.
                    delete this.events[name];
                }
            }
        };

        function callGetModule(args) {
            //Skip modules already defined.
            if (!hasProp(defined, args[0])) {
                getModule(makeModuleMap(args[0], null, true)).init(args[1], args[2]);
            }
        }

        function removeListener(node, func, name, ieName) {
            //Favor detachEvent because of IE9
            //issue, see attachEvent/addEventListener comment elsewhere
            //in this file.
            if (node.detachEvent && !isOpera) {
                //Probably IE. If not it will throw an error, which will be
                //useful to know.
                if (ieName) {
                    node.detachEvent(ieName, func);
                }
            } else {
                node.removeEventListener(name, func, false);
            }
        }

        /**
         * Given an event from a script node, get the requirejs info from it,
         * and then removes the event listeners on the node.
         * @param {Event} evt
         * @returns {Object}
         */
        function getScriptData(evt) {
            //Using currentTarget instead of target for Firefox 2.0's sake. Not
            //all old browsers will be supported, but this one was easy enough
            //to support and still makes sense.
            var node = evt.currentTarget || evt.srcElement;

            //Remove the listeners once here.
            removeListener(node, context.onScriptLoad, 'load', 'onreadystatechange');
            removeListener(node, context.onScriptError, 'error');

            return {
                node: node,
                id: node && node.getAttribute('data-requiremodule')
            };
        }

        function intakeDefines() {
            var args;

            //Any defined modules in the global queue, intake them now.
            takeGlobalQueue();

            //Make sure any remaining defQueue items get properly processed.
            while (defQueue.length) {
                args = defQueue.shift();
                if (args[0] === null) {
                    return onError(makeError('mismatch', 'Mismatched anonymous define() module: ' + args[args.length - 1]));
                } else {
                    //args are id, deps, factory. Should be normalized by the
                    //define() function.
                    callGetModule(args);
                }
            }
        }

        context = {
            config: config,
            contextName: contextName,
            registry: registry,
            defined: defined,
            urlFetched: urlFetched,
            defQueue: defQueue,
            Module: Module,
            makeModuleMap: makeModuleMap,
            nextTick: req.nextTick,
            onError: onError,

            /**
             * Set a configuration for the context.
             * @param {Object} cfg config object to integrate.
             */
            configure: function (cfg) {
                //Make sure the baseUrl ends in a slash.
                if (cfg.baseUrl) {
                    if (cfg.baseUrl.charAt(cfg.baseUrl.length - 1) !== '/') {
                        cfg.baseUrl += '/';
                    }
                }

                //Save off the paths and packages since they require special processing,
                //they are additive.
                var pkgs = config.pkgs,
                    shim = config.shim,
                    objs = {
                        paths: true,
                        config: true,
                        map: true
                    };

                eachProp(cfg, function (value, prop) {
                    if (objs[prop]) {
                        if (prop === 'map') {
                            if (!config.map) {
                                config.map = {};
                            }
                            mixin(config[prop], value, true, true);
                        } else {
                            mixin(config[prop], value, true);
                        }
                    } else {
                        config[prop] = value;
                    }
                });

                //Merge shim
                if (cfg.shim) {
                    eachProp(cfg.shim, function (value, id) {
                        //Normalize the structure
                        if (isArray(value)) {
                            value = {
                                deps: value
                            };
                        }
                        if ((value.exports || value.init) && !value.exportsFn) {
                            value.exportsFn = context.makeShimExports(value);
                        }
                        shim[id] = value;
                    });
                    config.shim = shim;
                }

                //Adjust packages if necessary.
                if (cfg.packages) {
                    each(cfg.packages, function (pkgObj) {
                        var location;

                        pkgObj = typeof pkgObj === 'string' ? { name: pkgObj } : pkgObj;
                        location = pkgObj.location;

                        //Create a brand new object on pkgs, since currentPackages can
                        //be passed in again, and config.pkgs is the internal transformed
                        //state for all package configs.
                        pkgs[pkgObj.name] = {
                            name: pkgObj.name,
                            location: location || pkgObj.name,
                            //Remove leading dot in main, so main paths are normalized,
                            //and remove any trailing .js, since different package
                            //envs have different conventions: some use a module name,
                            //some use a file name.
                            main: (pkgObj.main || 'main')
                                  .replace(currDirRegExp, '')
                                  .replace(jsSuffixRegExp, '')
                        };
                    });

                    //Done with modifications, assing packages back to context config
                    config.pkgs = pkgs;
                }

                //If there are any "waiting to execute" modules in the registry,
                //update the maps for them, since their info, like URLs to load,
                //may have changed.
                eachProp(registry, function (mod, id) {
                    //If module already has init called, since it is too
                    //late to modify them, and ignore unnormalized ones
                    //since they are transient.
                    if (!mod.inited && !mod.map.unnormalized) {
                        mod.map = makeModuleMap(id);
                    }
                });

                //If a deps array or a config callback is specified, then call
                //require with those args. This is useful when require is defined as a
                //config object before require.js is loaded.
                if (cfg.deps || cfg.callback) {
                    context.require(cfg.deps || [], cfg.callback);
                }
            },

            makeShimExports: function (value) {
                function fn() {
                    var ret;
                    if (value.init) {
                        ret = value.init.apply(global, arguments);
                    }
                    return ret || (value.exports && getGlobal(value.exports));
                }
                return fn;
            },

            makeRequire: function (relMap, options) {
                options = options || {};

                function localRequire(deps, callback, errback) {
                    var id, map, requireMod;

                    if (options.enableBuildCallback && callback && isFunction(callback)) {
                        callback.__requireJsBuild = true;
                    }

                    if (typeof deps === 'string') {
                        if (isFunction(callback)) {
                            //Invalid call
                            return onError(makeError('requireargs', 'Invalid require call'), errback);
                        }

                        //If require|exports|module are requested, get the
                        //value for them from the special handlers. Caveat:
                        //this only works while module is being defined.
                        if (relMap && hasProp(handlers, deps)) {
                            return handlers[deps](registry[relMap.id]);
                        }

                        //Synchronous access to one module. If require.get is
                        //available (as in the Node adapter), prefer that.
                        if (req.get) {
                            return req.get(context, deps, relMap, localRequire);
                        }

                        //Normalize module name, if it contains . or ..
                        map = makeModuleMap(deps, relMap, false, true);
                        id = map.id;

                        if (!hasProp(defined, id)) {
                            return onError(makeError('notloaded', 'Module name "' +
                                        id +
                                        '" has not been loaded yet for context: ' +
                                        contextName +
                                        (relMap ? '' : '. Use require([])')));
                        }
                        return defined[id];
                    }

                    //Grab defines waiting in the global queue.
                    intakeDefines();

                    //Mark all the dependencies as needing to be loaded.
                    context.nextTick(function () {
                        //Some defines could have been added since the
                        //require call, collect them.
                        intakeDefines();

                        requireMod = getModule(makeModuleMap(null, relMap));

                        //Store if map config should be applied to this require
                        //call for dependencies.
                        requireMod.skipMap = options.skipMap;

                        requireMod.init(deps, callback, errback, {
                            enabled: true
                        });

                        checkLoaded();
                    });

                    return localRequire;
                }

                mixin(localRequire, {
                    isBrowser: isBrowser,

                    /**
                     * Converts a module name + .extension into an URL path.
                     * *Requires* the use of a module name. It does not support using
                     * plain URLs like nameToUrl.
                     */
                    toUrl: function (moduleNamePlusExt) {
                        var ext,
                            index = moduleNamePlusExt.lastIndexOf('.'),
                            segment = moduleNamePlusExt.split('/')[0],
                            isRelative = segment === '.' || segment === '..';

                        //Have a file extension alias, and it is not the
                        //dots from a relative path.
                        if (index !== -1 && (!isRelative || index > 1)) {
                            ext = moduleNamePlusExt.substring(index, moduleNamePlusExt.length);
                            moduleNamePlusExt = moduleNamePlusExt.substring(0, index);
                        }

                        return context.nameToUrl(normalize(moduleNamePlusExt,
                                                relMap && relMap.id, true), ext,  true);
                    },

                    defined: function (id) {
                        return hasProp(defined, makeModuleMap(id, relMap, false, true).id);
                    },

                    specified: function (id) {
                        id = makeModuleMap(id, relMap, false, true).id;
                        return hasProp(defined, id) || hasProp(registry, id);
                    }
                });

                //Only allow undef on top level require calls
                if (!relMap) {
                    localRequire.undef = function (id) {
                        //Bind any waiting define() calls to this context,
                        //fix for #408
                        takeGlobalQueue();

                        var map = makeModuleMap(id, relMap, true),
                            mod = getOwn(registry, id);

                        delete defined[id];
                        delete urlFetched[map.url];
                        delete undefEvents[id];

                        if (mod) {
                            //Hold on to listeners in case the
                            //module will be attempted to be reloaded
                            //using a different config.
                            if (mod.events.defined) {
                                undefEvents[id] = mod.events;
                            }

                            cleanRegistry(id);
                        }
                    };
                }

                return localRequire;
            },

            /**
             * Called to enable a module if it is still in the registry
             * awaiting enablement. A second arg, parent, the parent module,
             * is passed in for context, when this method is overriden by
             * the optimizer. Not shown here to keep code compact.
             */
            enable: function (depMap) {
                var mod = getOwn(registry, depMap.id);
                if (mod) {
                    getModule(depMap).enable();
                }
            },

            /**
             * Internal method used by environment adapters to complete a load event.
             * A load event could be a script load or just a load pass from a synchronous
             * load call.
             * @param {String} moduleName the name of the module to potentially complete.
             */
            completeLoad: function (moduleName) {
                var found, args, mod,
                    shim = getOwn(config.shim, moduleName) || {},
                    shExports = shim.exports;

                takeGlobalQueue();

                while (defQueue.length) {
                    args = defQueue.shift();
                    if (args[0] === null) {
                        args[0] = moduleName;
                        //If already found an anonymous module and bound it
                        //to this name, then this is some other anon module
                        //waiting for its completeLoad to fire.
                        if (found) {
                            break;
                        }
                        found = true;
                    } else if (args[0] === moduleName) {
                        //Found matching define call for this script!
                        found = true;
                    }

                    callGetModule(args);
                }

                //Do this after the cycle of callGetModule in case the result
                //of those calls/init calls changes the registry.
                mod = getOwn(registry, moduleName);

                if (!found && !hasProp(defined, moduleName) && mod && !mod.inited) {
                    if (config.enforceDefine && (!shExports || !getGlobal(shExports))) {
                        if (hasPathFallback(moduleName)) {
                            return;
                        } else {
                            return onError(makeError('nodefine',
                                             'No define call for ' + moduleName,
                                             null,
                                             [moduleName]));
                        }
                    } else {
                        //A script that does not call define(), so just simulate
                        //the call for it.
                        callGetModule([moduleName, (shim.deps || []), shim.exportsFn]);
                    }
                }

                checkLoaded();
            },

            /**
             * Converts a module name to a file path. Supports cases where
             * moduleName may actually be just an URL.
             * Note that it **does not** call normalize on the moduleName,
             * it is assumed to have already been normalized. This is an
             * internal API, not a public one. Use toUrl for the public API.
             */
            nameToUrl: function (moduleName, ext, skipExt) {
                var paths, pkgs, pkg, pkgPath, syms, i, parentModule, url,
                    parentPath;

                //If a colon is in the URL, it indicates a protocol is used and it is just
                //an URL to a file, or if it starts with a slash, contains a query arg (i.e. ?)
                //or ends with .js, then assume the user meant to use an url and not a module id.
                //The slash is important for protocol-less URLs as well as full paths.
                if (req.jsExtRegExp.test(moduleName)) {
                    //Just a plain path, not module name lookup, so just return it.
                    //Add extension if it is included. This is a bit wonky, only non-.js things pass
                    //an extension, this method probably needs to be reworked.
                    url = moduleName + (ext || '');
                } else {
                    //A module that needs to be converted to a path.
                    paths = config.paths;
                    pkgs = config.pkgs;

                    syms = moduleName.split('/');
                    //For each module name segment, see if there is a path
                    //registered for it. Start with most specific name
                    //and work up from it.
                    for (i = syms.length; i > 0; i -= 1) {
                        parentModule = syms.slice(0, i).join('/');
                        pkg = getOwn(pkgs, parentModule);
                        parentPath = getOwn(paths, parentModule);
                        if (parentPath) {
                            //If an array, it means there are a few choices,
                            //Choose the one that is desired
                            if (isArray(parentPath)) {
                                parentPath = parentPath[0];
                            }
                            syms.splice(0, i, parentPath);
                            break;
                        } else if (pkg) {
                            //If module name is just the package name, then looking
                            //for the main module.
                            if (moduleName === pkg.name) {
                                pkgPath = pkg.location + '/' + pkg.main;
                            } else {
                                pkgPath = pkg.location;
                            }
                            syms.splice(0, i, pkgPath);
                            break;
                        }
                    }

                    //Join the path parts together, then figure out if baseUrl is needed.
                    url = syms.join('/');
                    url += (ext || (/\?/.test(url) || skipExt ? '' : '.js'));
                    url = (url.charAt(0) === '/' || url.match(/^[\w\+\.\-]+:/) ? '' : config.baseUrl) + url;
                }

                return config.urlArgs ? url +
                                        ((url.indexOf('?') === -1 ? '?' : '&') +
                                         config.urlArgs) : url;
            },

            //Delegates to req.load. Broken out as a separate function to
            //allow overriding in the optimizer.
            load: function (id, url) {
                req.load(context, id, url);
            },

            /**
             * Executes a module callack function. Broken out as a separate function
             * solely to allow the build system to sequence the files in the built
             * layer in the right sequence.
             *
             * @private
             */
            execCb: function (name, callback, args, exports) {
                return callback.apply(exports, args);
            },

            /**
             * callback for script loads, used to check status of loading.
             *
             * @param {Event} evt the event from the browser for the script
             * that was loaded.
             */
            onScriptLoad: function (evt) {
                //Using currentTarget instead of target for Firefox 2.0's sake. Not
                //all old browsers will be supported, but this one was easy enough
                //to support and still makes sense.
                if (evt.type === 'load' ||
                        (readyRegExp.test((evt.currentTarget || evt.srcElement).readyState))) {
                    //Reset interactive script so a script node is not held onto for
                    //to long.
                    interactiveScript = null;

                    //Pull out the name of the module and the context.
                    var data = getScriptData(evt);
                    context.completeLoad(data.id);
                }
            },

            /**
             * Callback for script errors.
             */
            onScriptError: function (evt) {
                var data = getScriptData(evt);
                if (!hasPathFallback(data.id)) {
                    return onError(makeError('scripterror', 'Script error', evt, [data.id]));
                }
            }
        };

        context.require = context.makeRequire();
        return context;
    }

    /**
     * Main entry point.
     *
     * If the only argument to require is a string, then the module that
     * is represented by that string is fetched for the appropriate context.
     *
     * If the first argument is an array, then it will be treated as an array
     * of dependency string names to fetch. An optional function callback can
     * be specified to execute when all of those dependencies are available.
     *
     * Make a local req variable to help Caja compliance (it assumes things
     * on a require that are not standardized), and to give a short
     * name for minification/local scope use.
     */
    req = requirejs = function (deps, callback, errback, optional) {

        //Find the right context, use default
        var context, config,
            contextName = defContextName;

        // Determine if have config object in the call.
        if (!isArray(deps) && typeof deps !== 'string') {
            // deps is a config object
            config = deps;
            if (isArray(callback)) {
                // Adjust args if there are dependencies
                deps = callback;
                callback = errback;
                errback = optional;
            } else {
                deps = [];
            }
        }

        if (config && config.context) {
            contextName = config.context;
        }

        context = getOwn(contexts, contextName);
        if (!context) {
            context = contexts[contextName] = req.s.newContext(contextName);
        }

        if (config) {
            context.configure(config);
        }

        return context.require(deps, callback, errback);
    };

    /**
     * Support require.config() to make it easier to cooperate with other
     * AMD loaders on globally agreed names.
     */
    req.config = function (config) {
        return req(config);
    };

    /**
     * Execute something after the current tick
     * of the event loop. Override for other envs
     * that have a better solution than setTimeout.
     * @param  {Function} fn function to execute later.
     */
    req.nextTick = typeof setTimeout !== 'undefined' ? function (fn) {
        setTimeout(fn, 4);
    } : function (fn) { fn(); };

    /**
     * Export require as a global, but only if it does not already exist.
     */
    if (!require) {
        require = req;
    }

    req.version = version;

    //Used to filter out dependencies that are already paths.
    req.jsExtRegExp = /^\/|:|\?|\.js$/;
    req.isBrowser = isBrowser;
    s = req.s = {
        contexts: contexts,
        newContext: newContext
    };

    //Create default context.
    req({});

    //Exports some context-sensitive methods on global require.
    each([
        'toUrl',
        'undef',
        'defined',
        'specified'
    ], function (prop) {
        //Reference from contexts instead of early binding to default context,
        //so that during builds, the latest instance of the default context
        //with its config gets used.
        req[prop] = function () {
            var ctx = contexts[defContextName];
            return ctx.require[prop].apply(ctx, arguments);
        };
    });

    if (isBrowser) {
        head = s.head = document.getElementsByTagName('head')[0];
        //If BASE tag is in play, using appendChild is a problem for IE6.
        //When that browser dies, this can be removed. Details in this jQuery bug:
        //http://dev.jquery.com/ticket/2709
        baseElement = document.getElementsByTagName('base')[0];
        if (baseElement) {
            head = s.head = baseElement.parentNode;
        }
    }

    /**
     * Any errors that require explicitly generates will be passed to this
     * function. Intercept/override it if you want custom error handling.
     * @param {Error} err the error object.
     */
    req.onError = function (err) {
        throw err;
    };

    /**
     * Does the request to load a module for the browser case.
     * Make this a separate function to allow other environments
     * to override it.
     *
     * @param {Object} context the require context to find state.
     * @param {String} moduleName the name of the module.
     * @param {Object} url the URL to the module.
     */
    req.load = function (context, moduleName, url) {
        var config = (context && context.config) || {},
            node;
        if (isBrowser) {
            //In the browser so use a script tag
            node = config.xhtml ?
                    document.createElementNS('http://www.w3.org/1999/xhtml', 'html:script') :
                    document.createElement('script');
            node.type = config.scriptType || 'text/javascript';
            node.charset = 'utf-8';
            node.async = true;

            node.setAttribute('data-requirecontext', context.contextName);
            node.setAttribute('data-requiremodule', moduleName);

            //Set up load listener. Test attachEvent first because IE9 has
            //a subtle issue in its addEventListener and script onload firings
            //that do not match the behavior of all other browsers with
            //addEventListener support, which fire the onload event for a
            //script right after the script execution. See:
            //https://connect.microsoft.com/IE/feedback/details/648057/script-onload-event-is-not-fired-immediately-after-script-execution
            //UNFORTUNATELY Opera implements attachEvent but does not follow the script
            //script execution mode.
            if (node.attachEvent &&
                    //Check if node.attachEvent is artificially added by custom script or
                    //natively supported by browser
                    //read https://github.com/jrburke/requirejs/issues/187
                    //if we can NOT find [native code] then it must NOT natively supported.
                    //in IE8, node.attachEvent does not have toString()
                    //Note the test for "[native code" with no closing brace, see:
                    //https://github.com/jrburke/requirejs/issues/273
                    !(node.attachEvent.toString && node.attachEvent.toString().indexOf('[native code') < 0) &&
                    !isOpera) {
                //Probably IE. IE (at least 6-8) do not fire
                //script onload right after executing the script, so
                //we cannot tie the anonymous define call to a name.
                //However, IE reports the script as being in 'interactive'
                //readyState at the time of the define call.
                useInteractive = true;

                node.attachEvent('onreadystatechange', context.onScriptLoad);
                //It would be great to add an error handler here to catch
                //404s in IE9+. However, onreadystatechange will fire before
                //the error handler, so that does not help. If addEventListener
                //is used, then IE will fire error before load, but we cannot
                //use that pathway given the connect.microsoft.com issue
                //mentioned above about not doing the 'script execute,
                //then fire the script load event listener before execute
                //next script' that other browsers do.
                //Best hope: IE10 fixes the issues,
                //and then destroys all installs of IE 6-9.
                //node.attachEvent('onerror', context.onScriptError);
            } else {
                node.addEventListener('load', context.onScriptLoad, false);
                node.addEventListener('error', context.onScriptError, false);
            }
            node.src = url;

            //For some cache cases in IE 6-8, the script executes before the end
            //of the appendChild execution, so to tie an anonymous define
            //call to the module name (which is stored on the node), hold on
            //to a reference to this node, but clear after the DOM insertion.
            currentlyAddingScript = node;
            if (baseElement) {
                head.insertBefore(node, baseElement);
            } else {
                head.appendChild(node);
            }
            currentlyAddingScript = null;

            return node;
        } else if (isWebWorker) {
            try {
                //In a web worker, use importScripts. This is not a very
                //efficient use of importScripts, importScripts will block until
                //its script is downloaded and evaluated. However, if web workers
                //are in play, the expectation that a build has been done so that
                //only one script needs to be loaded anyway. This may need to be
                //reevaluated if other use cases become common.
                importScripts(url);

                //Account for anonymous modules
                context.completeLoad(moduleName);
            } catch (e) {
                context.onError(makeError('importscripts',
                                'importScripts failed for ' +
                                    moduleName + ' at ' + url,
                                e,
                                [moduleName]));
            }
        }
    };

    function getInteractiveScript() {
        if (interactiveScript && interactiveScript.readyState === 'interactive') {
            return interactiveScript;
        }

        eachReverse(scripts(), function (script) {
            if (script.readyState === 'interactive') {
                return (interactiveScript = script);
            }
        });
        return interactiveScript;
    }

    //Look for a data-main script attribute, which could also adjust the baseUrl.
    if (isBrowser) {
        //Figure out baseUrl. Get it from the script tag with require.js in it.
        eachReverse(scripts(), function (script) {
            //Set the 'head' where we can append children by
            //using the script's parent.
            if (!head) {
                head = script.parentNode;
            }

            //Look for a data-main attribute to set main script for the page
            //to load. If it is there, the path to data main becomes the
            //baseUrl, if it is not already set.
            dataMain = script.getAttribute('data-main');
            if (dataMain) {
                //Set final baseUrl if there is not already an explicit one.
                if (!cfg.baseUrl) {
                    //Pull off the directory of data-main for use as the
                    //baseUrl.
                    src = dataMain.split('/');
                    mainScript = src.pop();
                    subPath = src.length ? src.join('/')  + '/' : './';

                    cfg.baseUrl = subPath;
                    dataMain = mainScript;
                }

                //Strip off any trailing .js since dataMain is now
                //like a module name.
                dataMain = dataMain.replace(jsSuffixRegExp, '');

                //Put the data-main script in the files to load.
                cfg.deps = cfg.deps ? cfg.deps.concat(dataMain) : [dataMain];

                return true;
            }
        });
    }

    /**
     * The function that handles definitions of modules. Differs from
     * require() in that a string for the module should be the first argument,
     * and the function to execute after dependencies are loaded should
     * return a value to define the module corresponding to the first argument's
     * name.
     */
    define = function (name, deps, callback) {
        var node, context;

        //Allow for anonymous modules
        if (typeof name !== 'string') {
            //Adjust args appropriately
            callback = deps;
            deps = name;
            name = null;
        }

        //This module may not have dependencies
        if (!isArray(deps)) {
            callback = deps;
            deps = [];
        }

        //If no name, and callback is a function, then figure out if it a
        //CommonJS thing with dependencies.
        if (!deps.length && isFunction(callback)) {
            //Remove comments from the callback string,
            //look for require calls, and pull them into the dependencies,
            //but only if there are function args.
            if (callback.length) {
                callback
                    .toString()
                    .replace(commentRegExp, '')
                    .replace(cjsRequireRegExp, function (match, dep) {
                        deps.push(dep);
                    });

                //May be a CommonJS thing even without require calls, but still
                //could use exports, and module. Avoid doing exports and module
                //work though if it just needs require.
                //REQUIRES the function to expect the CommonJS variables in the
                //order listed below.
                deps = (callback.length === 1 ? ['require'] : ['require', 'exports', 'module']).concat(deps);
            }
        }

        //If in IE 6-8 and hit an anonymous define() call, do the interactive
        //work.
        if (useInteractive) {
            node = currentlyAddingScript || getInteractiveScript();
            if (node) {
                if (!name) {
                    name = node.getAttribute('data-requiremodule');
                }
                context = contexts[node.getAttribute('data-requirecontext')];
            }
        }

        //Always save off evaluating the def call until the script onload handler.
        //This allows multiple modules to be in a file without prematurely
        //tracing dependencies, and allows for anonymous module support,
        //where the module name is not known until the script onload event
        //occurs. If no context, use the global queue, and get it processed
        //in the onscript load callback.
        (context ? context.defQueue : globalDefQueue).push([name, deps, callback]);
    };

    define.amd = {
        jQuery: true
    };


    /**
     * Executes the text. Normally just uses eval, but can be modified
     * to use a better, environment-specific call. Only used for transpiling
     * loader plugins, not for plain JS modules.
     * @param {String} text the text to execute/evaluate.
     */
    req.exec = function (text) {
        /*jslint evil: true */
        return eval(text);
    };

    //Set up with config info.
    req(cfg);
}(this));

var components = {
    "packages": [
        {
            "name": "jquery-context-menu",
            "main": "jquery-context-menu-built.js"
        }
    ],
    "baseUrl": "components"
};
if (typeof require !== "undefined" && require.config) {
    require.config(components);
} else {
    var require = components;
}
if (typeof exports !== "undefined" && typeof module !== "undefined") {
    module.exports = components;
}
define('jquery-context-menu', function (require, exports, module) {
/*!
 * jQuery UI Position v1.10.0
 * http://jqueryui.com
 *
 * Copyright 2013 jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 *
 * http://api.jqueryui.com/position/
 */
(function( $, undefined ) {

$.ui = $.ui || {};

var cachedScrollbarWidth,
	max = Math.max,
	abs = Math.abs,
	round = Math.round,
	rhorizontal = /left|center|right/,
	rvertical = /top|center|bottom/,
	roffset = /[\+\-]\d+%?/,
	rposition = /^\w+/,
	rpercent = /%$/,
	_position = $.fn.position;

function getOffsets( offsets, width, height ) {
	return [
		parseInt( offsets[ 0 ], 10 ) * ( rpercent.test( offsets[ 0 ] ) ? width / 100 : 1 ),
		parseInt( offsets[ 1 ], 10 ) * ( rpercent.test( offsets[ 1 ] ) ? height / 100 : 1 )
	];
}

function parseCss( element, property ) {
	return parseInt( $.css( element, property ), 10 ) || 0;
}

function getDimensions( elem ) {
	var raw = elem[0];
	if ( raw.nodeType === 9 ) {
		return {
			width: elem.width(),
			height: elem.height(),
			offset: { top: 0, left: 0 }
		};
	}
	if ( $.isWindow( raw ) ) {
		return {
			width: elem.width(),
			height: elem.height(),
			offset: { top: elem.scrollTop(), left: elem.scrollLeft() }
		};
	}
	if ( raw.preventDefault ) {
		return {
			width: 0,
			height: 0,
			offset: { top: raw.pageY, left: raw.pageX }
		};
	}
	return {
		width: elem.outerWidth(),
		height: elem.outerHeight(),
		offset: elem.offset()
	};
}

$.position = {
	scrollbarWidth: function() {
		if ( cachedScrollbarWidth !== undefined ) {
			return cachedScrollbarWidth;
		}
		var w1, w2,
			div = $( "<div style='display:block;width:50px;height:50px;overflow:hidden;'><div style='height:100px;width:auto;'></div></div>" ),
			innerDiv = div.children()[0];

		$( "body" ).append( div );
		w1 = innerDiv.offsetWidth;
		div.css( "overflow", "scroll" );

		w2 = innerDiv.offsetWidth;

		if ( w1 === w2 ) {
			w2 = div[0].clientWidth;
		}

		div.remove();

		return (cachedScrollbarWidth = w1 - w2);
	},
	getScrollInfo: function( within ) {
		var overflowX = within.isWindow ? "" : within.element.css( "overflow-x" ),
			overflowY = within.isWindow ? "" : within.element.css( "overflow-y" ),
			hasOverflowX = overflowX === "scroll" ||
				( overflowX === "auto" && within.width < within.element[0].scrollWidth ),
			hasOverflowY = overflowY === "scroll" ||
				( overflowY === "auto" && within.height < within.element[0].scrollHeight );
		return {
			width: hasOverflowX ? $.position.scrollbarWidth() : 0,
			height: hasOverflowY ? $.position.scrollbarWidth() : 0
		};
	},
	getWithinInfo: function( element ) {
		var withinElement = $( element || window ),
			isWindow = $.isWindow( withinElement[0] );
		return {
			element: withinElement,
			isWindow: isWindow,
			offset: withinElement.offset() || { left: 0, top: 0 },
			scrollLeft: withinElement.scrollLeft(),
			scrollTop: withinElement.scrollTop(),
			width: isWindow ? withinElement.width() : withinElement.outerWidth(),
			height: isWindow ? withinElement.height() : withinElement.outerHeight()
		};
	}
};

$.fn.position = function( options ) {
	if ( !options || !options.of ) {
		return _position.apply( this, arguments );
	}

	// make a copy, we don't want to modify arguments
	options = $.extend( {}, options );

	var atOffset, targetWidth, targetHeight, targetOffset, basePosition, dimensions,
		target = $( options.of ),
		within = $.position.getWithinInfo( options.within ),
		scrollInfo = $.position.getScrollInfo( within ),
		collision = ( options.collision || "flip" ).split( " " ),
		offsets = {};

	dimensions = getDimensions( target );
	if ( target[0].preventDefault ) {
		// force left top to allow flipping
		options.at = "left top";
	}
	targetWidth = dimensions.width;
	targetHeight = dimensions.height;
	targetOffset = dimensions.offset;
	// clone to reuse original targetOffset later
	basePosition = $.extend( {}, targetOffset );

	// force my and at to have valid horizontal and vertical positions
	// if a value is missing or invalid, it will be converted to center
	$.each( [ "my", "at" ], function() {
		var pos = ( options[ this ] || "" ).split( " " ),
			horizontalOffset,
			verticalOffset;

		if ( pos.length === 1) {
			pos = rhorizontal.test( pos[ 0 ] ) ?
				pos.concat( [ "center" ] ) :
				rvertical.test( pos[ 0 ] ) ?
					[ "center" ].concat( pos ) :
					[ "center", "center" ];
		}
		pos[ 0 ] = rhorizontal.test( pos[ 0 ] ) ? pos[ 0 ] : "center";
		pos[ 1 ] = rvertical.test( pos[ 1 ] ) ? pos[ 1 ] : "center";

		// calculate offsets
		horizontalOffset = roffset.exec( pos[ 0 ] );
		verticalOffset = roffset.exec( pos[ 1 ] );
		offsets[ this ] = [
			horizontalOffset ? horizontalOffset[ 0 ] : 0,
			verticalOffset ? verticalOffset[ 0 ] : 0
		];

		// reduce to just the positions without the offsets
		options[ this ] = [
			rposition.exec( pos[ 0 ] )[ 0 ],
			rposition.exec( pos[ 1 ] )[ 0 ]
		];
	});

	// normalize collision option
	if ( collision.length === 1 ) {
		collision[ 1 ] = collision[ 0 ];
	}

	if ( options.at[ 0 ] === "right" ) {
		basePosition.left += targetWidth;
	} else if ( options.at[ 0 ] === "center" ) {
		basePosition.left += targetWidth / 2;
	}

	if ( options.at[ 1 ] === "bottom" ) {
		basePosition.top += targetHeight;
	} else if ( options.at[ 1 ] === "center" ) {
		basePosition.top += targetHeight / 2;
	}

	atOffset = getOffsets( offsets.at, targetWidth, targetHeight );
	basePosition.left += atOffset[ 0 ];
	basePosition.top += atOffset[ 1 ];

	return this.each(function() {
		var collisionPosition, using,
			elem = $( this ),
			elemWidth = elem.outerWidth(),
			elemHeight = elem.outerHeight(),
			marginLeft = parseCss( this, "marginLeft" ),
			marginTop = parseCss( this, "marginTop" ),
			collisionWidth = elemWidth + marginLeft + parseCss( this, "marginRight" ) + scrollInfo.width,
			collisionHeight = elemHeight + marginTop + parseCss( this, "marginBottom" ) + scrollInfo.height,
			position = $.extend( {}, basePosition ),
			myOffset = getOffsets( offsets.my, elem.outerWidth(), elem.outerHeight() );

		if ( options.my[ 0 ] === "right" ) {
			position.left -= elemWidth;
		} else if ( options.my[ 0 ] === "center" ) {
			position.left -= elemWidth / 2;
		}

		if ( options.my[ 1 ] === "bottom" ) {
			position.top -= elemHeight;
		} else if ( options.my[ 1 ] === "center" ) {
			position.top -= elemHeight / 2;
		}

		position.left += myOffset[ 0 ];
		position.top += myOffset[ 1 ];

		// if the browser doesn't support fractions, then round for consistent results
		if ( !$.support.offsetFractions ) {
			position.left = round( position.left );
			position.top = round( position.top );
		}

		collisionPosition = {
			marginLeft: marginLeft,
			marginTop: marginTop
		};

		$.each( [ "left", "top" ], function( i, dir ) {
			if ( $.ui.position[ collision[ i ] ] ) {
				$.ui.position[ collision[ i ] ][ dir ]( position, {
					targetWidth: targetWidth,
					targetHeight: targetHeight,
					elemWidth: elemWidth,
					elemHeight: elemHeight,
					collisionPosition: collisionPosition,
					collisionWidth: collisionWidth,
					collisionHeight: collisionHeight,
					offset: [ atOffset[ 0 ] + myOffset[ 0 ], atOffset [ 1 ] + myOffset[ 1 ] ],
					my: options.my,
					at: options.at,
					within: within,
					elem : elem
				});
			}
		});

		if ( options.using ) {
			// adds feedback as second argument to using callback, if present
			using = function( props ) {
				var left = targetOffset.left - position.left,
					right = left + targetWidth - elemWidth,
					top = targetOffset.top - position.top,
					bottom = top + targetHeight - elemHeight,
					feedback = {
						target: {
							element: target,
							left: targetOffset.left,
							top: targetOffset.top,
							width: targetWidth,
							height: targetHeight
						},
						element: {
							element: elem,
							left: position.left,
							top: position.top,
							width: elemWidth,
							height: elemHeight
						},
						horizontal: right < 0 ? "left" : left > 0 ? "right" : "center",
						vertical: bottom < 0 ? "top" : top > 0 ? "bottom" : "middle"
					};
				if ( targetWidth < elemWidth && abs( left + right ) < targetWidth ) {
					feedback.horizontal = "center";
				}
				if ( targetHeight < elemHeight && abs( top + bottom ) < targetHeight ) {
					feedback.vertical = "middle";
				}
				if ( max( abs( left ), abs( right ) ) > max( abs( top ), abs( bottom ) ) ) {
					feedback.important = "horizontal";
				} else {
					feedback.important = "vertical";
				}
				options.using.call( this, props, feedback );
			};
		}

		elem.offset( $.extend( position, { using: using } ) );
	});
};

$.ui.position = {
	fit: {
		left: function( position, data ) {
			var within = data.within,
				withinOffset = within.isWindow ? within.scrollLeft : within.offset.left,
				outerWidth = within.width,
				collisionPosLeft = position.left - data.collisionPosition.marginLeft,
				overLeft = withinOffset - collisionPosLeft,
				overRight = collisionPosLeft + data.collisionWidth - outerWidth - withinOffset,
				newOverRight;

			// element is wider than within
			if ( data.collisionWidth > outerWidth ) {
				// element is initially over the left side of within
				if ( overLeft > 0 && overRight <= 0 ) {
					newOverRight = position.left + overLeft + data.collisionWidth - outerWidth - withinOffset;
					position.left += overLeft - newOverRight;
				// element is initially over right side of within
				} else if ( overRight > 0 && overLeft <= 0 ) {
					position.left = withinOffset;
				// element is initially over both left and right sides of within
				} else {
					if ( overLeft > overRight ) {
						position.left = withinOffset + outerWidth - data.collisionWidth;
					} else {
						position.left = withinOffset;
					}
				}
			// too far left -> align with left edge
			} else if ( overLeft > 0 ) {
				position.left += overLeft;
			// too far right -> align with right edge
			} else if ( overRight > 0 ) {
				position.left -= overRight;
			// adjust based on position and margin
			} else {
				position.left = max( position.left - collisionPosLeft, position.left );
			}
		},
		top: function( position, data ) {
			var within = data.within,
				withinOffset = within.isWindow ? within.scrollTop : within.offset.top,
				outerHeight = data.within.height,
				collisionPosTop = position.top - data.collisionPosition.marginTop,
				overTop = withinOffset - collisionPosTop,
				overBottom = collisionPosTop + data.collisionHeight - outerHeight - withinOffset,
				newOverBottom;

			// element is taller than within
			if ( data.collisionHeight > outerHeight ) {
				// element is initially over the top of within
				if ( overTop > 0 && overBottom <= 0 ) {
					newOverBottom = position.top + overTop + data.collisionHeight - outerHeight - withinOffset;
					position.top += overTop - newOverBottom;
				// element is initially over bottom of within
				} else if ( overBottom > 0 && overTop <= 0 ) {
					position.top = withinOffset;
				// element is initially over both top and bottom of within
				} else {
					if ( overTop > overBottom ) {
						position.top = withinOffset + outerHeight - data.collisionHeight;
					} else {
						position.top = withinOffset;
					}
				}
			// too far up -> align with top
			} else if ( overTop > 0 ) {
				position.top += overTop;
			// too far down -> align with bottom edge
			} else if ( overBottom > 0 ) {
				position.top -= overBottom;
			// adjust based on position and margin
			} else {
				position.top = max( position.top - collisionPosTop, position.top );
			}
		}
	},
	flip: {
		left: function( position, data ) {
			var within = data.within,
				withinOffset = within.offset.left + within.scrollLeft,
				outerWidth = within.width,
				offsetLeft = within.isWindow ? within.scrollLeft : within.offset.left,
				collisionPosLeft = position.left - data.collisionPosition.marginLeft,
				overLeft = collisionPosLeft - offsetLeft,
				overRight = collisionPosLeft + data.collisionWidth - outerWidth - offsetLeft,
				myOffset = data.my[ 0 ] === "left" ?
					-data.elemWidth :
					data.my[ 0 ] === "right" ?
						data.elemWidth :
						0,
				atOffset = data.at[ 0 ] === "left" ?
					data.targetWidth :
					data.at[ 0 ] === "right" ?
						-data.targetWidth :
						0,
				offset = -2 * data.offset[ 0 ],
				newOverRight,
				newOverLeft;

			if ( overLeft < 0 ) {
				newOverRight = position.left + myOffset + atOffset + offset + data.collisionWidth - outerWidth - withinOffset;
				if ( newOverRight < 0 || newOverRight < abs( overLeft ) ) {
					position.left += myOffset + atOffset + offset;
				}
			}
			else if ( overRight > 0 ) {
				newOverLeft = position.left - data.collisionPosition.marginLeft + myOffset + atOffset + offset - offsetLeft;
				if ( newOverLeft > 0 || abs( newOverLeft ) < overRight ) {
					position.left += myOffset + atOffset + offset;
				}
			}
		},
		top: function( position, data ) {
			var within = data.within,
				withinOffset = within.offset.top + within.scrollTop,
				outerHeight = within.height,
				offsetTop = within.isWindow ? within.scrollTop : within.offset.top,
				collisionPosTop = position.top - data.collisionPosition.marginTop,
				overTop = collisionPosTop - offsetTop,
				overBottom = collisionPosTop + data.collisionHeight - outerHeight - offsetTop,
				top = data.my[ 1 ] === "top",
				myOffset = top ?
					-data.elemHeight :
					data.my[ 1 ] === "bottom" ?
						data.elemHeight :
						0,
				atOffset = data.at[ 1 ] === "top" ?
					data.targetHeight :
					data.at[ 1 ] === "bottom" ?
						-data.targetHeight :
						0,
				offset = -2 * data.offset[ 1 ],
				newOverTop,
				newOverBottom;
			if ( overTop < 0 ) {
				newOverBottom = position.top + myOffset + atOffset + offset + data.collisionHeight - outerHeight - withinOffset;
				if ( ( position.top + myOffset + atOffset + offset) > overTop && ( newOverBottom < 0 || newOverBottom < abs( overTop ) ) ) {
					position.top += myOffset + atOffset + offset;
				}
			}
			else if ( overBottom > 0 ) {
				newOverTop = position.top -  data.collisionPosition.marginTop + myOffset + atOffset + offset - offsetTop;
				if ( ( position.top + myOffset + atOffset + offset) > overBottom && ( newOverTop > 0 || abs( newOverTop ) < overBottom ) ) {
					position.top += myOffset + atOffset + offset;
				}
			}
		}
	},
	flipfit: {
		left: function() {
			$.ui.position.flip.left.apply( this, arguments );
			$.ui.position.fit.left.apply( this, arguments );
		},
		top: function() {
			$.ui.position.flip.top.apply( this, arguments );
			$.ui.position.fit.top.apply( this, arguments );
		}
	}
};

// fraction support test
(function () {
	var testElement, testElementParent, testElementStyle, offsetLeft, i,
		body = document.getElementsByTagName( "body" )[ 0 ],
		div = document.createElement( "div" );

	//Create a "fake body" for testing based on method used in jQuery.support
	testElement = document.createElement( body ? "div" : "body" );
	testElementStyle = {
		visibility: "hidden",
		width: 0,
		height: 0,
		border: 0,
		margin: 0,
		background: "none"
	};
	if ( body ) {
		$.extend( testElementStyle, {
			position: "absolute",
			left: "-1000px",
			top: "-1000px"
		});
	}
	for ( i in testElementStyle ) {
		testElement.style[ i ] = testElementStyle[ i ];
	}
	testElement.appendChild( div );
	testElementParent = body || document.documentElement;
	testElementParent.insertBefore( testElement, testElementParent.firstChild );

	div.style.cssText = "position: absolute; left: 10.7432222px;";

	offsetLeft = $( div ).offset().left;
	$.support.offsetFractions = offsetLeft > 10 && offsetLeft < 11;

	testElement.innerHTML = "";
	testElementParent.removeChild( testElement );
})();

}( jQuery ) );

/*!
 * jQuery contextMenu - Plugin for simple contextMenu handling
 *
 * Version: git-master
 *
 * Authors: Rodney Rehm, Addy Osmani (patches for FF)
 * Web: http://medialize.github.com/jQuery-contextMenu/
 *
 * Licensed under
 *   MIT License http://www.opensource.org/licenses/mit-license
 *   GPL v3 http://opensource.org/licenses/GPL-3.0
 *
 */

(function($, undefined){
    
    // TODO: -
        // ARIA stuff: menuitem, menuitemcheckbox und menuitemradio
        // create <menu> structure if $.support[htmlCommand || htmlMenuitem] and !opt.disableNative

// determine html5 compatibility
$.support.htmlMenuitem = ('HTMLMenuItemElement' in window);
$.support.htmlCommand = ('HTMLCommandElement' in window);
$.support.eventSelectstart = ("onselectstart" in document.documentElement);
/* // should the need arise, test for css user-select
$.support.cssUserSelect = (function(){
    var t = false,
        e = document.createElement('div');
    
    $.each('Moz|Webkit|Khtml|O|ms|Icab|'.split('|'), function(i, prefix) {
        var propCC = prefix + (prefix ? 'U' : 'u') + 'serSelect',
            prop = (prefix ? ('-' + prefix.toLowerCase() + '-') : '') + 'user-select';
            
        e.style.cssText = prop + ': text;';
        if (e.style[propCC] == 'text') {
            t = true;
            return false;
        }
        
        return true;
    });
    
    return t;
})();
*/

if (!$.ui || !$.ui.widget) {
    // duck punch $.cleanData like jQueryUI does to get that remove event
    // https://github.com/jquery/jquery-ui/blob/master/ui/jquery.ui.widget.js#L16-24
    var _cleanData = $.cleanData;
    $.cleanData = function( elems ) {
        for ( var i = 0, elem; (elem = elems[i]) != null; i++ ) {
            try {
                $( elem ).triggerHandler( "remove" );
                // http://bugs.jquery.com/ticket/8235
            } catch( e ) {}
        }
        _cleanData( elems );
    };
}

var // currently active contextMenu trigger
    $currentTrigger = null,
    // is contextMenu initialized with at least one menu?
    initialized = false,
    // window handle
    $win = $(window),
    // number of registered menus
    counter = 0,
    // mapping selector to namespace
    namespaces = {},
    // mapping namespace to options
    menus = {},
    // custom command type handlers
    types = {},
    // default values
    defaults = {
        // selector of contextMenu trigger
        selector: null,
        // where to append the menu to
        appendTo: null,
        // method to trigger context menu ["right", "left", "hover"]
        trigger: "right",
        // hide menu when mouse leaves trigger / menu elements
        autoHide: false,
        // ms to wait before showing a hover-triggered context menu
        delay: 200,
        // flag denoting if a second trigger should simply move (true) or rebuild (false) an open menu
        // as long as the trigger happened on one of the trigger-element's child nodes
        reposition: true,
        // determine position to show menu at
        determinePosition: function($menu) {
            // position to the lower middle of the trigger element
            if ($.ui && $.ui.position) {
                // .position() is provided as a jQuery UI utility
                // (...and it won't work on hidden elements)
                $menu.css('display', 'block').position({
                    my: "center top",
                    at: "center bottom",
                    of: this,
                    offset: "0 5",
                    collision: "fit"
                }).css('display', 'none');
            } else {
                // determine contextMenu position
                var offset = this.offset();
                offset.top += this.outerHeight();
                offset.left += this.outerWidth() / 2 - $menu.outerWidth() / 2;
                $menu.css(offset);
            }
        },
        // position menu
        position: function(opt, x, y) {
            var $this = this,
                offset;
            // determine contextMenu position
            if (!x && !y) {
                opt.determinePosition.call(this, opt.$menu);
                return;
            } else if (x === "maintain" && y === "maintain") {
                // x and y must not be changed (after re-show on command click)
                offset = opt.$menu.position();
            } else {
                // x and y are given (by mouse event)
                offset = {top: y, left: x};
            }
            
            // correct offset if viewport demands it
            var bottom = $win.scrollTop() + $win.height(),
                right = $win.scrollLeft() + $win.width(),
                height = opt.$menu.height(),
                width = opt.$menu.width();
            
            if (offset.top + height > bottom) {
                offset.top -= height;
            }

            if (offset.top<0) {
                offset.top = 0;
            }
            
            if (offset.left + width > right) {
                offset.left -= width;
            }
            
            opt.$menu.css(offset);
        },
        // position the sub-menu
        positionSubmenu: function($menu) {
            if ($.ui && $.ui.position) {
                // .position() is provided as a jQuery UI utility
                // (...and it won't work on hidden elements)
                $menu.css('display', 'block').position({
                    my: "left top",
                    at: "right top",
                    of: this,
                    collision: "flipfit fit"
                }).css('display', '');
            } else {
                // determine contextMenu position
                var offset = {
                    top: 0,
                    left: this.outerWidth()
                };
                $menu.css(offset);
            }
        },
        // offset to add to zIndex
        zIndex: 1,
        // show hide animation settings
        animation: {
            duration: 50,
            show: 'slideDown',
            hide: 'slideUp'
        },
        // events
        events: {
            show: $.noop,
            hide: $.noop
        },
        // default callback
        callback: null,
        // list of contextMenu items
        items: {}
    },
    // mouse position for hover activation
    hoveract = {
        timer: null,
        pageX: null,
        pageY: null
    },
    // determine zIndex
    zindex = function($t) {
        var zin = 0,
            $tt = $t;

        while (true) {
            zin = Math.max(zin, parseInt($tt.css('z-index'), 10) || 0);
            $tt = $tt.parent();
            if (!$tt || !$tt.length || "html body".indexOf($tt.prop('nodeName').toLowerCase()) > -1 ) {
                break;
            }
        }
        
        return zin;
    },
    // event handlers
    handle = {
        // abort anything
        abortevent: function(e){
            e.preventDefault();
            e.stopImmediatePropagation();
        },
        
        // contextmenu show dispatcher
        contextmenu: function(e) {
            var $this = $(this);
            
            // disable actual context-menu if we are using the right mouse button as the trigger
            if (e.data.trigger == 'right') {
                e.preventDefault();
                e.stopImmediatePropagation();
            }
            
            // abort native-triggered events unless we're triggering on right click
            if (e.data.trigger != 'right' && e.originalEvent) {
                return;
            }
            
            // abort event if menu is visible for this trigger
            if ($this.hasClass('context-menu-active')) {
                return;
            }
            
            if (!$this.hasClass('context-menu-disabled')) {
                // theoretically need to fire a show event at <menu>
                // http://www.whatwg.org/specs/web-apps/current-work/multipage/interactive-elements.html#context-menus
                // var evt = jQuery.Event("show", { data: data, pageX: e.pageX, pageY: e.pageY, relatedTarget: this });
                // e.data.$menu.trigger(evt);
                
                $currentTrigger = $this;
                if (e.data.build) {
                    var built = e.data.build($currentTrigger, e);
                    // abort if build() returned false
                    if (built === false) {
                        return;
                    }
                    
                    // dynamically build menu on invocation
                    e.data = $.extend(true, {}, defaults, e.data, built || {});

                    // abort if there are no items to display
                    if (!e.data.items || $.isEmptyObject(e.data.items)) {
                        // Note: jQuery captures and ignores errors from event handlers
                        if (window.console) {
                            (console.error || console.log).call(console, "No items specified to show in contextMenu");
                        }
                        
                        throw new Error('No Items specified');
                    }
                    
                    // backreference for custom command type creation
                    e.data.$trigger = $currentTrigger;
                    
                    op.create(e.data);
                }
                // show menu
                op.show.call($this, e.data, e.pageX, e.pageY);
            }
        },
        // contextMenu left-click trigger
        click: function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            $(this).trigger($.Event("contextmenu", { data: e.data, pageX: e.pageX, pageY: e.pageY }));
        },
        // contextMenu right-click trigger
        mousedown: function(e) {
            // register mouse down
            var $this = $(this);
            
            // hide any previous menus
            if ($currentTrigger && $currentTrigger.length && !$currentTrigger.is($this)) {
                $currentTrigger.data('contextMenu').$menu.trigger('contextmenu:hide');
            }
            
            // activate on right click
            if (e.button == 2) {
                $currentTrigger = $this.data('contextMenuActive', true);
            }
        },
        // contextMenu right-click trigger
        mouseup: function(e) {
            // show menu
            var $this = $(this);
            if ($this.data('contextMenuActive') && $currentTrigger && $currentTrigger.length && $currentTrigger.is($this) && !$this.hasClass('context-menu-disabled')) {
                e.preventDefault();
                e.stopImmediatePropagation();
                $currentTrigger = $this;
                $this.trigger($.Event("contextmenu", { data: e.data, pageX: e.pageX, pageY: e.pageY }));
            }
            
            $this.removeData('contextMenuActive');
        },
        // contextMenu hover trigger
        mouseenter: function(e) {
            var $this = $(this),
                $related = $(e.relatedTarget),
                $document = $(document);
            
            // abort if we're coming from a menu
            if ($related.is('.context-menu-list') || $related.closest('.context-menu-list').length) {
                return;
            }
            
            // abort if a menu is shown
            if ($currentTrigger && $currentTrigger.length) {
                return;
            }
            
            hoveract.pageX = e.pageX;
            hoveract.pageY = e.pageY;
            hoveract.data = e.data;
            $document.on('mousemove.contextMenuShow', handle.mousemove);
            hoveract.timer = setTimeout(function() {
                hoveract.timer = null;
                $document.off('mousemove.contextMenuShow');
                $currentTrigger = $this;
                $this.trigger($.Event("contextmenu", { data: hoveract.data, pageX: hoveract.pageX, pageY: hoveract.pageY }));
            }, e.data.delay );
        },
        // contextMenu hover trigger
        mousemove: function(e) {
            hoveract.pageX = e.pageX;
            hoveract.pageY = e.pageY;
        },
        // contextMenu hover trigger
        mouseleave: function(e) {
            // abort if we're leaving for a menu
            var $related = $(e.relatedTarget);
            if ($related.is('.context-menu-list') || $related.closest('.context-menu-list').length) {
                return;
            }
            
            try {
                clearTimeout(hoveract.timer);
            } catch(e) {}
            
            hoveract.timer = null;
        },
        
        // click on layer to hide contextMenu
        layerClick: function(e) {
            var $this = $(this),
                root = $this.data('contextMenuRoot'),
                button = e.button,
                x = e.pageX,
                y = e.pageY,
                target, 
                offset;
                
            e.preventDefault();
            e.stopImmediatePropagation();
            
            setTimeout(function() {
                var $window;
                var triggerAction = ((root.trigger == 'left' && button === 0) || (root.trigger == 'right' && button === 2));
                
                // find the element that would've been clicked, wasn't the layer in the way
                if (document.elementFromPoint) {
                    root.$layer.hide();
                    target = document.elementFromPoint(x - $win.scrollLeft(), y - $win.scrollTop());
                    root.$layer.show();
                }
                
                if (root.reposition && triggerAction) {
                    if (document.elementFromPoint) {
                        if (root.$trigger.is(target) || root.$trigger.has(target).length) {
                            root.position.call(root.$trigger, root, x, y);
                            return;
                        }
                    } else {
                        offset = root.$trigger.offset();
                        $window = $(window);
                        // while this looks kinda awful, it's the best way to avoid
                        // unnecessarily calculating any positions
                        offset.top += $window.scrollTop();
                        if (offset.top <= e.pageY) {
                            offset.left += $window.scrollLeft();
                            if (offset.left <= e.pageX) {
                                offset.bottom = offset.top + root.$trigger.outerHeight();
                                if (offset.bottom >= e.pageY) {
                                    offset.right = offset.left + root.$trigger.outerWidth();
                                    if (offset.right >= e.pageX) {
                                        // reposition
                                        root.position.call(root.$trigger, root, x, y);
                                        return;
                                    }
                                }
                            }
                        }
                    }
                }
                
                if (target && triggerAction) {
                    root.$trigger.one('contextmenu:hidden', function() {
                        $(target).contextMenu({x: x, y: y});
                    });
                }

                root.$menu.trigger('contextmenu:hide');
            }, 50);
        },
        // key handled :hover
        keyStop: function(e, opt) {
            if (!opt.isInput) {
                e.preventDefault();
            }
            
            e.stopPropagation();
        },
        key: function(e) {

            var opt = {};

            // Only get the data from $currentTrigger if it exists
            if ($currentTrigger) {
                opt = $currentTrigger.data('contextMenu') || {};
            }

            switch (e.keyCode) {
                case 9:
                case 38: // up
                    handle.keyStop(e, opt);
                    // if keyCode is [38 (up)] or [9 (tab) with shift]
                    if (opt.isInput) {
                        if (e.keyCode == 9 && e.shiftKey) {
                            e.preventDefault();
                            opt.$selected && opt.$selected.find('input, textarea, select').blur();
                            opt.$menu.trigger('prevcommand');
                            return;
                        } else if (e.keyCode == 38 && opt.$selected.find('input, textarea, select').prop('type') == 'checkbox') {
                            // checkboxes don't capture this key
                            e.preventDefault();
                            return;
                        }
                    } else if (e.keyCode != 9 || e.shiftKey) {
                        opt.$menu.trigger('prevcommand');
                        return;
                    }
                    // omitting break;
                    
                // case 9: // tab - reached through omitted break;
                case 40: // down
                    handle.keyStop(e, opt);
                    if (opt.isInput) {
                        if (e.keyCode == 9) {
                            e.preventDefault();
                            opt.$selected && opt.$selected.find('input, textarea, select').blur();
                            opt.$menu.trigger('nextcommand');
                            return;
                        } else if (e.keyCode == 40 && opt.$selected.find('input, textarea, select').prop('type') == 'checkbox') {
                            // checkboxes don't capture this key
                            e.preventDefault();
                            return;
                        }
                    } else {
                        opt.$menu.trigger('nextcommand');
                        return;
                    }
                    break;
                
                case 37: // left
                    handle.keyStop(e, opt);
                    if (opt.isInput || !opt.$selected || !opt.$selected.length) {
                        break;
                    }
                
                    if (!opt.$selected.parent().hasClass('context-menu-root')) {
                        var $parent = opt.$selected.parent().parent();
                        opt.$selected.trigger('contextmenu:blur');
                        opt.$selected = $parent;
                        return;
                    }
                    break;
                    
                case 39: // right
                    handle.keyStop(e, opt);
                    if (opt.isInput || !opt.$selected || !opt.$selected.length) {
                        break;
                    }
                    
                    var itemdata = opt.$selected.data('contextMenu') || {};
                    if (itemdata.$menu && opt.$selected.hasClass('context-menu-submenu')) {
                        opt.$selected = null;
                        itemdata.$selected = null;
                        itemdata.$menu.trigger('nextcommand');
                        return;
                    }
                    break;
                
                case 35: // end
                case 36: // home
                    if (opt.$selected && opt.$selected.find('input, textarea, select').length) {
                        return;
                    } else {
                        (opt.$selected && opt.$selected.parent() || opt.$menu)
                            .children(':not(.disabled, .not-selectable)')[e.keyCode == 36 ? 'first' : 'last']()
                            .trigger('contextmenu:focus');
                        e.preventDefault();
                        return;
                    }
                    break;
                    
                case 13: // enter
                    handle.keyStop(e, opt);
                    if (opt.isInput) {
                        if (opt.$selected && !opt.$selected.is('textarea, select')) {
                            e.preventDefault();
                            return;
                        }
                        break;
                    }
                    opt.$selected && opt.$selected.trigger('mouseup');
                    return;
                    
                case 32: // space
                case 33: // page up
                case 34: // page down
                    // prevent browser from scrolling down while menu is visible
                    handle.keyStop(e, opt);
                    return;
                    
                case 27: // esc
                    handle.keyStop(e, opt);
                    opt.$menu.trigger('contextmenu:hide');
                    return;
                    
                default: // 0-9, a-z
                    var k = (String.fromCharCode(e.keyCode)).toUpperCase();
                    if (opt.accesskeys && opt.accesskeys[k]) {
                        // according to the specs accesskeys must be invoked immediately
                        opt.accesskeys[k].$node.trigger(opt.accesskeys[k].$menu
                            ? 'contextmenu:focus'
                            : 'mouseup'
                        );
                        return;
                    }
                    break;
            }
            // pass event to selected item, 
            // stop propagation to avoid endless recursion
            e.stopPropagation();
            opt.$selected && opt.$selected.trigger(e);
        },

        // select previous possible command in menu
        prevItem: function(e) {
            e.stopPropagation();
            var opt = $(this).data('contextMenu') || {};

            // obtain currently selected menu
            if (opt.$selected) {
                var $s = opt.$selected;
                opt = opt.$selected.parent().data('contextMenu') || {};
                opt.$selected = $s;
            }
            
            var $children = opt.$menu.children(),
                $prev = !opt.$selected || !opt.$selected.prev().length ? $children.last() : opt.$selected.prev(),
                $round = $prev;
            
            // skip disabled
            while ($prev.hasClass('disabled') || $prev.hasClass('not-selectable')) {
                if ($prev.prev().length) {
                    $prev = $prev.prev();
                } else {
                    $prev = $children.last();
                }
                if ($prev.is($round)) {
                    // break endless loop
                    return;
                }
            }
            
            // leave current
            if (opt.$selected) {
                handle.itemMouseleave.call(opt.$selected.get(0), e);
            }
            
            // activate next
            handle.itemMouseenter.call($prev.get(0), e);
            
            // focus input
            var $input = $prev.find('input, textarea, select');
            if ($input.length) {
                $input.focus();
            }
        },
        // select next possible command in menu
        nextItem: function(e) {
            e.stopPropagation();
            var opt = $(this).data('contextMenu') || {};

            // obtain currently selected menu
            if (opt.$selected) {
                var $s = opt.$selected;
                opt = opt.$selected.parent().data('contextMenu') || {};
                opt.$selected = $s;
            }

            var $children = opt.$menu.children(),
                $next = !opt.$selected || !opt.$selected.next().length ? $children.first() : opt.$selected.next(),
                $round = $next;

            // skip disabled
            while ($next.hasClass('disabled') || $next.hasClass('not-selectable')) {
                if ($next.next().length) {
                    $next = $next.next();
                } else {
                    $next = $children.first();
                }
                if ($next.is($round)) {
                    // break endless loop
                    return;
                }
            }
            
            // leave current
            if (opt.$selected) {
                handle.itemMouseleave.call(opt.$selected.get(0), e);
            }
            
            // activate next
            handle.itemMouseenter.call($next.get(0), e);
            
            // focus input
            var $input = $next.find('input, textarea, select');
            if ($input.length) {
                $input.focus();
            }
        },
        
        // flag that we're inside an input so the key handler can act accordingly
        focusInput: function(e) {
            var $this = $(this).closest('.context-menu-item'),
                data = $this.data(),
                opt = data.contextMenu,
                root = data.contextMenuRoot;

            root.$selected = opt.$selected = $this;
            root.isInput = opt.isInput = true;
        },
        // flag that we're inside an input so the key handler can act accordingly
        blurInput: function(e) {
            var $this = $(this).closest('.context-menu-item'),
                data = $this.data(),
                opt = data.contextMenu,
                root = data.contextMenuRoot;

            root.isInput = opt.isInput = false;
        },
        
        // :hover on menu
        menuMouseenter: function(e) {
            var root = $(this).data().contextMenuRoot;
            root.hovering = true;
        },
        // :hover on menu
        menuMouseleave: function(e) {
            var root = $(this).data().contextMenuRoot;
            if (root.$layer && root.$layer.is(e.relatedTarget)) {
                root.hovering = false;
            }
        },
        
        // :hover done manually so key handling is possible
        itemMouseenter: function(e) {
            var $this = $(this),
                data = $this.data(),
                opt = data.contextMenu,
                root = data.contextMenuRoot;
            
            root.hovering = true;

            // abort if we're re-entering
            if (e && root.$layer && root.$layer.is(e.relatedTarget)) {
                e.preventDefault();
                e.stopImmediatePropagation();
            }

            // make sure only one item is selected
            (opt.$menu ? opt : root).$menu
                .children('.hover').trigger('contextmenu:blur');

            if ($this.hasClass('disabled') || $this.hasClass('not-selectable')) {
                opt.$selected = null;
                return;
            }
            
            $this.trigger('contextmenu:focus');
        },
        // :hover done manually so key handling is possible
        itemMouseleave: function(e) {
            var $this = $(this),
                data = $this.data(),
                opt = data.contextMenu,
                root = data.contextMenuRoot;

            if (root !== opt && root.$layer && root.$layer.is(e.relatedTarget)) {
                root.$selected && root.$selected.trigger('contextmenu:blur');
                e.preventDefault();
                e.stopImmediatePropagation();
                root.$selected = opt.$selected = opt.$node;
                return;
            }
            
            $this.trigger('contextmenu:blur');
        },
        // contextMenu item click
        itemClick: function(e) {
            var $this = $(this),
                data = $this.data(),
                opt = data.contextMenu,
                root = data.contextMenuRoot,
                key = data.contextMenuKey,
                callback;

            // abort if the key is unknown or disabled or is a menu
            if (!opt.items[key] || $this.is('.disabled, .context-menu-submenu, .context-menu-separator, .not-selectable')) {
                return;
            }

            e.preventDefault();
            e.stopImmediatePropagation();

            if ($.isFunction(root.callbacks[key]) && Object.prototype.hasOwnProperty.call(root.callbacks, key)) {
                // item-specific callback
                callback = root.callbacks[key];
            } else if ($.isFunction(root.callback)) {
                // default callback
                callback = root.callback;                
            } else {
                // no callback, no action
                return;
            }

            // hide menu if callback doesn't stop that
            if (callback.call(root.$trigger, key, root) !== false) {
                root.$menu.trigger('contextmenu:hide');
            } else if (root.$menu.parent().length) {
                op.update.call(root.$trigger, root);
            }
        },
        // ignore click events on input elements
        inputClick: function(e) {
            e.stopImmediatePropagation();
        },
        
        // hide <menu>
        hideMenu: function(e, data) {
            var root = $(this).data('contextMenuRoot');
            op.hide.call(root.$trigger, root, data && data.force);
        },
        // focus <command>
        focusItem: function(e) {
            e.stopPropagation();
            var $this = $(this),
                data = $this.data(),
                opt = data.contextMenu,
                root = data.contextMenuRoot;

            $this.addClass('hover')
                .siblings('.hover').trigger('contextmenu:blur');
            
            // remember selected
            opt.$selected = root.$selected = $this;
            
            // position sub-menu - do after show so dumb $.ui.position can keep up
            if (opt.$node) {
                root.positionSubmenu.call(opt.$node, opt.$menu);
            }
        },
        // blur <command>
        blurItem: function(e) {
            e.stopPropagation();
            var $this = $(this),
                data = $this.data(),
                opt = data.contextMenu;
            
            $this.removeClass('hover');
            opt.$selected = null;
        }
    },
    // operations
    op = {
        show: function(opt, x, y) {
            var $trigger = $(this),
                css = {};

            // hide any open menus
            $('#context-menu-layer').trigger('mousedown');

            // backreference for callbacks
            opt.$trigger = $trigger;

            // show event
            if (opt.events.show.call($trigger, opt) === false) {
                $currentTrigger = null;
                return;
            }

            // create or update context menu
            op.update.call($trigger, opt);
            
            // position menu
            opt.position.call($trigger, opt, x, y);

            // make sure we're in front
            if (opt.zIndex) {
                css.zIndex = zindex($trigger) + opt.zIndex;
            }
            
            // add layer
            op.layer.call(opt.$menu, opt, css.zIndex);
            
            // adjust sub-menu zIndexes
            opt.$menu.find('ul').css('zIndex', css.zIndex + 1);
            
            // position and show context menu
            opt.$menu.css( css )[opt.animation.show](opt.animation.duration, function() {
                $trigger.trigger('contextmenu:visible');
            });
            // make options available and set state
            $trigger
                .data('contextMenu', opt)
                .addClass("context-menu-active");
            
            // register key handler
            $(document).off('keydown.contextMenu').on('keydown.contextMenu', handle.key);
            // register autoHide handler
            if (opt.autoHide) {
                // mouse position handler
                $(document).on('mousemove.contextMenuAutoHide', function(e) {
                    // need to capture the offset on mousemove,
                    // since the page might've been scrolled since activation
                    var pos = $trigger.offset();
                    pos.right = pos.left + $trigger.outerWidth();
                    pos.bottom = pos.top + $trigger.outerHeight();
                    
                    if (opt.$layer && !opt.hovering && (!(e.pageX >= pos.left && e.pageX <= pos.right) || !(e.pageY >= pos.top && e.pageY <= pos.bottom))) {
                        // if mouse in menu...
                        opt.$menu.trigger('contextmenu:hide');
                    }
                });
            }
        },
        hide: function(opt, force) {
            var $trigger = $(this);
            if (!opt) {
                opt = $trigger.data('contextMenu') || {};
            }
            
            // hide event
            if (!force && opt.events && opt.events.hide.call($trigger, opt) === false) {
                return;
            }
            
            // remove options and revert state
            $trigger
                .removeData('contextMenu')
                .removeClass("context-menu-active");
            
            if (opt.$layer) {
                // keep layer for a bit so the contextmenu event can be aborted properly by opera
                setTimeout((function($layer) {
                    return function(){
                        $layer.remove();
                    };
                })(opt.$layer), 10);
                
                try {
                    delete opt.$layer;
                } catch(e) {
                    opt.$layer = null;
                }
            }
            
            // remove handle
            $currentTrigger = null;
            // remove selected
            opt.$menu.find('.hover').trigger('contextmenu:blur');
            opt.$selected = null;
            // unregister key and mouse handlers
            //$(document).off('.contextMenuAutoHide keydown.contextMenu'); // http://bugs.jquery.com/ticket/10705
            $(document).off('.contextMenuAutoHide').off('keydown.contextMenu');
            // hide menu
            opt.$menu && opt.$menu[opt.animation.hide](opt.animation.duration, function (){
                // tear down dynamically built menu after animation is completed.
                if (opt.build) {
                    opt.$menu.remove();
                    $.each(opt, function(key, value) {
                        switch (key) {
                            case 'ns':
                            case 'selector':
                            case 'build':
                            case 'trigger':
                                return true;

                            default:
                                opt[key] = undefined;
                                try {
                                    delete opt[key];
                                } catch (e) {}
                                return true;
                        }
                    });
                }
                
                setTimeout(function() {
                    $trigger.trigger('contextmenu:hidden');
                }, 10);
            });
        },
        create: function(opt, root) {
            if (root === undefined) {
                root = opt;
            }
            // create contextMenu
            opt.$menu = $('<ul class="context-menu-list"></ul>').addClass(opt.className || "").data({
                'contextMenu': opt,
                'contextMenuRoot': root
            });
            
            $.each(['callbacks', 'commands', 'inputs'], function(i,k){
                opt[k] = {};
                if (!root[k]) {
                    root[k] = {};
                }
            });
            
            root.accesskeys || (root.accesskeys = {});
            
            // create contextMenu items
            $.each(opt.items, function(key, item){
                var $t = $('<li class="context-menu-item"></li>').addClass(item.className || ""),
                    $label = null,
                    $input = null;
                
                // iOS needs to see a click-event bound to an element to actually
                // have the TouchEvents infrastructure trigger the click event
                $t.on('click', $.noop);
                
                item.$node = $t.data({
                    'contextMenu': opt,
                    'contextMenuRoot': root,
                    'contextMenuKey': key
                });
                
                // register accesskey
                // NOTE: the accesskey attribute should be applicable to any element, but Safari5 and Chrome13 still can't do that
                if (item.accesskey) {
                    var aks = splitAccesskey(item.accesskey);
                    for (var i=0, ak; ak = aks[i]; i++) {
                        if (!root.accesskeys[ak]) {
                            root.accesskeys[ak] = item;
                            item._name = item.name.replace(new RegExp('(' + ak + ')', 'i'), '<span class="context-menu-accesskey">$1</span>');
                            break;
                        }
                    }
                }
                
                if (typeof item == "string") {
                    $t.addClass('context-menu-separator not-selectable');
                } else if (item.type && types[item.type]) {
                    // run custom type handler
                    types[item.type].call($t, item, opt, root);
                    // register commands
                    $.each([opt, root], function(i,k){
                        k.commands[key] = item;
                        if ($.isFunction(item.callback)) {
                            k.callbacks[key] = item.callback;
                        }
                    });
                } else {
                    // add label for input
                    if (item.type == 'html') {
                        $t.addClass('context-menu-html not-selectable');
                    } else if (item.type) {
                        $label = $('<label></label>').appendTo($t);
                        $('<span></span>').text(item._name || item.name).appendTo($label);
                        $t.addClass('context-menu-input');
                        opt.hasTypes = true;
                        $.each([opt, root], function(i,k){
                            k.commands[key] = item;
                            k.inputs[key] = item;
                        });
                    } else if (item.items) {
                        item.type = 'sub';
                    }
                
                    switch (item.type) {
                        case 'text':
                            $input = $('<input type="text" value="1" name="" value="">')
                                .attr('name', 'context-menu-input-' + key)
                                .val(item.value || "")
                                .appendTo($label);
                            break;
                    
                        case 'textarea':
                            $input = $('<textarea name=""></textarea>')
                                .attr('name', 'context-menu-input-' + key)
                                .val(item.value || "")
                                .appendTo($label);

                            if (item.height) {
                                $input.height(item.height);
                            }
                            break;

                        case 'checkbox':
                            $input = $('<input type="checkbox" value="1" name="" value="">')
                                .attr('name', 'context-menu-input-' + key)
                                .val(item.value || "")
                                .prop("checked", !!item.selected)
                                .prependTo($label);
                            break;

                        case 'radio':
                            $input = $('<input type="radio" value="1" name="" value="">')
                                .attr('name', 'context-menu-input-' + item.radio)
                                .val(item.value || "")
                                .prop("checked", !!item.selected)
                                .prependTo($label);
                            break;
                    
                        case 'select':
                            $input = $('<select name="">')
                                .attr('name', 'context-menu-input-' + key)
                                .appendTo($label);
                            if (item.options) {
                                $.each(item.options, function(value, text) {
                                    $('<option></option>').val(value).text(text).appendTo($input);
                                });
                                $input.val(item.selected);
                            }
                            break;
                        
                        case 'sub':
                            $('<span></span>').text(item._name || item.name).appendTo($t);
                            item.appendTo = item.$node;
                            op.create(item, root);
                            $t.data('contextMenu', item).addClass('context-menu-submenu');
                            item.callback = null;
                            break;
                        
                        case 'html':
                            $(item.html).appendTo($t);
                            break;
                        
                        default:
                            $.each([opt, root], function(i,k){
                                k.commands[key] = item;
                                if ($.isFunction(item.callback)) {
                                    k.callbacks[key] = item.callback;
                                }
                            });
                            $('<span></span>').text(item._name || item.name || "").appendTo($t);
                            break;
                    }
                    
                    // disable key listener in <input>
                    if (item.type && item.type != 'sub' && item.type != 'html') {
                        $input
                            .on('focus', handle.focusInput)
                            .on('blur', handle.blurInput);
                        
                        if (item.events) {
                            $input.on(item.events, opt);
                        }
                    }
                
                    // add icons
                    if (item.icon) {
                        $t.addClass("icon icon-" + item.icon);
                    }
                }
                
                // cache contained elements
                item.$input = $input;
                item.$label = $label;

                // attach item to menu
                $t.appendTo(opt.$menu);
                
                // Disable text selection
                if (!opt.hasTypes && $.support.eventSelectstart) {
                    // browsers support user-select: none, 
                    // IE has a special event for text-selection
                    // browsers supporting neither will not be preventing text-selection
                    $t.on('selectstart.disableTextSelect', handle.abortevent);
                }
            });
            // attach contextMenu to <body> (to bypass any possible overflow:hidden issues on parents of the trigger element)
            if (!opt.$node) {
                opt.$menu.css('display', 'none').addClass('context-menu-root');
            }
            opt.$menu.appendTo(opt.appendTo || document.body);
        },
        resize: function($menu, nested) {
            // determine widths of submenus, as CSS won't grow them automatically
            // position:absolute within position:absolute; min-width:100; max-width:200; results in width: 100;
            // kinda sucks hard...

            // determine width of absolutely positioned element
            $menu.css({position: 'absolute', display: 'block'});
            // don't apply yet, because that would break nested elements' widths
            // add a pixel to circumvent word-break issue in IE9 - #80
            $menu.data('width', Math.ceil($menu.width()) + 1);
            // reset styles so they allow nested elements to grow/shrink naturally
            $menu.css({
                position: 'static',
                minWidth: '0px',
                maxWidth: '100000px'
            });
            // identify width of nested menus
            $menu.find('> li > ul').each(function() {
                op.resize($(this), true);
            });
            // reset and apply changes in the end because nested
            // elements' widths wouldn't be calculatable otherwise
            if (!nested) {
                $menu.find('ul').addBack().css({
                    position: '', 
                    display: '',
                    minWidth: '',
                    maxWidth: ''
                }).width(function() {
                    return $(this).data('width');
                });
            }
        },
        update: function(opt, root) {
            var $trigger = this;
            if (root === undefined) {
                root = opt;
                op.resize(opt.$menu);
            }
            // re-check disabled for each item
            opt.$menu.children().each(function(){
                var $item = $(this),
                    key = $item.data('contextMenuKey'),
                    item = opt.items[key],
                    disabled = ($.isFunction(item.disabled) && item.disabled.call($trigger, key, root)) || item.disabled === true;

                // dis- / enable item
                $item[disabled ? 'addClass' : 'removeClass']('disabled');
                
                if (item.type) {
                    // dis- / enable input elements
                    $item.find('input, select, textarea').prop('disabled', disabled);
                    
                    // update input states
                    switch (item.type) {
                        case 'text':
                        case 'textarea':
                            item.$input.val(item.value || "");
                            break;
                            
                        case 'checkbox':
                        case 'radio':
                            item.$input.val(item.value || "").prop('checked', !!item.selected);
                            break;
                            
                        case 'select':
                            item.$input.val(item.selected || "");
                            break;
                    }
                }
                
                if (item.$menu) {
                    // update sub-menu
                    op.update.call($trigger, item, root);
                }
            });
        },
        layer: function(opt, zIndex) {
            // add transparent layer for click area
            // filter and background for Internet Explorer, Issue #23
            var $layer = opt.$layer = $('<div id="context-menu-layer" style="position:fixed; z-index:' + zIndex + '; top:0; left:0; opacity: 0; filter: alpha(opacity=0); background-color: #000;"></div>')
                .css({height: $win.height(), width: $win.width(), display: 'block'})
                .data('contextMenuRoot', opt)
                .insertBefore(this)
                .on('contextmenu', handle.abortevent)
                .on('mousedown', handle.layerClick);
            
            // IE6 doesn't know position:fixed;
            if (document.body.style.maxWidth === undefined) {//IE6 doesn't support maxWidth
                $layer.css({
                    'position' : 'absolute',
                    'height' : $(document).height()
                });
            }
            
            return $layer;
        }
    };

// split accesskey according to http://www.whatwg.org/specs/web-apps/current-work/multipage/editing.html#assigned-access-key
function splitAccesskey(val) {
    var t = val.split(/\s+/),
        keys = [];
        
    for (var i=0, k; k = t[i]; i++) {
        k = k.charAt(0).toUpperCase(); // first character only
        // theoretically non-accessible characters should be ignored, but different systems, different keyboard layouts, ... screw it.
        // a map to look up already used access keys would be nice
        keys.push(k);
    }
    
    return keys;
}

// handle contextMenu triggers
$.fn.contextMenu = function(operation) {
    if (operation === undefined) {
        this.first().trigger('contextmenu');
    } else if (operation.x && operation.y) {
        this.first().trigger($.Event("contextmenu", {pageX: operation.x, pageY: operation.y}));
    } else if (operation === "hide") {
        var $menu = this.first().data('contextMenu') ? this.first().data('contextMenu').$menu : null;
        $menu && $menu.trigger('contextmenu:hide');
    } else if (operation === "destroy") {
        $.contextMenu("destroy", {context: this});
    } else if ($.isPlainObject(operation)) {
        operation.context = this;
        $.contextMenu("create", operation);
    } else if (operation) {
        this.removeClass('context-menu-disabled');
    } else if (!operation) {
        this.addClass('context-menu-disabled');
    }
    
    return this;
};

// manage contextMenu instances
$.contextMenu = function(operation, options) {
    if (typeof operation != 'string') {
        options = operation;
        operation = 'create';
    }
    
    if (typeof options == 'string') {
        options = {selector: options};
    } else if (options === undefined) {
        options = {};
    }
    
    // merge with default options
    var o = $.extend(true, {}, defaults, options || {});
    var $document = $(document);
    var $context = $document;
    var _hasContext = false;
    
    if (!o.context || !o.context.length) {
        o.context = document;
    } else {
        // you never know what they throw at you...
        $context = $(o.context).first();
        o.context = $context.get(0);
        _hasContext = o.context !== document;
    }
    
    switch (operation) {
        case 'create':
            // no selector no joy
            if (!o.selector) {
                throw new Error('No selector specified');
            }
            // make sure internal classes are not bound to
            if (o.selector.match(/.context-menu-(list|item|input)($|\s)/)) {
                throw new Error('Cannot bind to selector "' + o.selector + '" as it contains a reserved className');
            }
            if (!o.build && (!o.items || $.isEmptyObject(o.items))) {
                throw new Error('No Items specified');
            }
            counter ++;
            o.ns = '.contextMenu' + counter;
            if (!_hasContext) {
                namespaces[o.selector] = o.ns;
            }
            menus[o.ns] = o;
            
            // default to right click
            if (!o.trigger) {
                o.trigger = 'right';
            }
            
            if (!initialized) {
                // make sure item click is registered first
                $document
                    .on({
                        'contextmenu:hide.contextMenu': handle.hideMenu,
                        'prevcommand.contextMenu': handle.prevItem,
                        'nextcommand.contextMenu': handle.nextItem,
                        'contextmenu.contextMenu': handle.abortevent,
                        'mouseenter.contextMenu': handle.menuMouseenter,
                        'mouseleave.contextMenu': handle.menuMouseleave
                    }, '.context-menu-list')
                    .on('mouseup.contextMenu', '.context-menu-input', handle.inputClick)
                    .on({
                        'mouseup.contextMenu': handle.itemClick,
                        'contextmenu:focus.contextMenu': handle.focusItem,
                        'contextmenu:blur.contextMenu': handle.blurItem,
                        'contextmenu.contextMenu': handle.abortevent,
                        'mouseenter.contextMenu': handle.itemMouseenter,
                        'mouseleave.contextMenu': handle.itemMouseleave
                    }, '.context-menu-item');

                initialized = true;
            }
            
            // engage native contextmenu event
            $context
                .on('contextmenu' + o.ns, o.selector, o, handle.contextmenu);
            
            if (_hasContext) {
                // add remove hook, just in case
                $context.on('remove' + o.ns, function() {
                    $(this).contextMenu("destroy");
                });
            }
            
            switch (o.trigger) {
                case 'hover':
                        $context
                            .on('mouseenter' + o.ns, o.selector, o, handle.mouseenter)
                            .on('mouseleave' + o.ns, o.selector, o, handle.mouseleave);                    
                    break;
                    
                case 'left':
                        $context.on('click' + o.ns, o.selector, o, handle.click);
                    break;
                /*
                default:
                    // http://www.quirksmode.org/dom/events/contextmenu.html
                    $document
                        .on('mousedown' + o.ns, o.selector, o, handle.mousedown)
                        .on('mouseup' + o.ns, o.selector, o, handle.mouseup);
                    break;
                */
            }
            
            // create menu
            if (!o.build) {
                op.create(o);
            }
            break;
        
        case 'destroy':
            var $visibleMenu;
            if (_hasContext) {
                // get proper options 
                var context = o.context;
                $.each(menus, function(ns, o) {
                    if (o.context !== context) {
                        return true;
                    }
                    
                    $visibleMenu = $('.context-menu-list').filter(':visible');
                    if ($visibleMenu.length && $visibleMenu.data().contextMenuRoot.$trigger.is($(o.context).find(o.selector))) {
                        $visibleMenu.trigger('contextmenu:hide', {force: true});
                    }

                    try {
                        if (menus[o.ns].$menu) {
                            menus[o.ns].$menu.remove();
                        }

                        delete menus[o.ns];
                    } catch(e) {
                        menus[o.ns] = null;
                    }

                    $(o.context).off(o.ns);
                    
                    return true;
                });
            } else if (!o.selector) {
                $document.off('.contextMenu .contextMenuAutoHide');
                $.each(menus, function(ns, o) {
                    $(o.context).off(o.ns);
                });
                
                namespaces = {};
                menus = {};
                counter = 0;
                initialized = false;
                
                $('#context-menu-layer, .context-menu-list').remove();
            } else if (namespaces[o.selector]) {
                $visibleMenu = $('.context-menu-list').filter(':visible');
                if ($visibleMenu.length && $visibleMenu.data().contextMenuRoot.$trigger.is(o.selector)) {
                    $visibleMenu.trigger('contextmenu:hide', {force: true});
                }
                
                try {
                    if (menus[namespaces[o.selector]].$menu) {
                        menus[namespaces[o.selector]].$menu.remove();
                    }
                    
                    delete menus[namespaces[o.selector]];
                } catch(e) {
                    menus[namespaces[o.selector]] = null;
                }
                
                $document.off(namespaces[o.selector]);
            }
            break;
        
        case 'html5':
            // if <command> or <menuitem> are not handled by the browser,
            // or options was a bool true,
            // initialize $.contextMenu for them
            if ((!$.support.htmlCommand && !$.support.htmlMenuitem) || (typeof options == "boolean" && options)) {
                $('menu[type="context"]').each(function() {
                    if (this.id) {
                        $.contextMenu({
                            selector: '[contextmenu=' + this.id +']',
                            items: $.contextMenu.fromMenu(this)
                        });
                    }
                }).css('display', 'none');
            }
            break;
        
        default:
            throw new Error('Unknown operation "' + operation + '"');
    }
    
    return this;
};

// import values into <input> commands
$.contextMenu.setInputValues = function(opt, data) {
    if (data === undefined) {
        data = {};
    }
    
    $.each(opt.inputs, function(key, item) {
        switch (item.type) {
            case 'text':
            case 'textarea':
                item.value = data[key] || "";
                break;

            case 'checkbox':
                item.selected = data[key] ? true : false;
                break;
                
            case 'radio':
                item.selected = (data[item.radio] || "") == item.value ? true : false;
                break;
            
            case 'select':
                item.selected = data[key] || "";
                break;
        }
    });
};

// export values from <input> commands
$.contextMenu.getInputValues = function(opt, data) {
    if (data === undefined) {
        data = {};
    }
    
    $.each(opt.inputs, function(key, item) {
        switch (item.type) {
            case 'text':
            case 'textarea':
            case 'select':
                data[key] = item.$input.val();
                break;

            case 'checkbox':
                data[key] = item.$input.prop('checked');
                break;
                
            case 'radio':
                if (item.$input.prop('checked')) {
                    data[item.radio] = item.value;
                }
                break;
        }
    });
    
    return data;
};

// find <label for="xyz">
function inputLabel(node) {
    return (node.id && $('label[for="'+ node.id +'"]').val()) || node.name;
}

// convert <menu> to items object
function menuChildren(items, $children, counter) {
    if (!counter) {
        counter = 0;
    }
    
    $children.each(function() {
        var $node = $(this),
            node = this,
            nodeName = this.nodeName.toLowerCase(),
            label,
            item;
        
        // extract <label><input>
        if (nodeName == 'label' && $node.find('input, textarea, select').length) {
            label = $node.text();
            $node = $node.children().first();
            node = $node.get(0);
            nodeName = node.nodeName.toLowerCase();
        }
        
        /*
         * <menu> accepts flow-content as children. that means <embed>, <canvas> and such are valid menu items.
         * Not being the sadistic kind, $.contextMenu only accepts:
         * <command>, <menuitem>, <hr>, <span>, <p> <input [text, radio, checkbox]>, <textarea>, <select> and of course <menu>.
         * Everything else will be imported as an html node, which is not interfaced with contextMenu.
         */
        
        // http://www.whatwg.org/specs/web-apps/current-work/multipage/commands.html#concept-command
        switch (nodeName) {
            // http://www.whatwg.org/specs/web-apps/current-work/multipage/interactive-elements.html#the-menu-element
            case 'menu':
                item = {name: $node.attr('label'), items: {}};
                counter = menuChildren(item.items, $node.children(), counter);
                break;
            
            // http://www.whatwg.org/specs/web-apps/current-work/multipage/commands.html#using-the-a-element-to-define-a-command
            case 'a':
            // http://www.whatwg.org/specs/web-apps/current-work/multipage/commands.html#using-the-button-element-to-define-a-command
            case 'button':
                item = {
                    name: $node.text(),
                    disabled: !!$node.attr('disabled'),
                    callback: (function(){ return function(){ $node.click(); }; })()
                };
                break;
            
            // http://www.whatwg.org/specs/web-apps/current-work/multipage/commands.html#using-the-command-element-to-define-a-command

            case 'menuitem':
            case 'command':
                switch ($node.attr('type')) {
                    case undefined:
                    case 'command':
                    case 'menuitem':
                        item = {
                            name: $node.attr('label'),
                            disabled: !!$node.attr('disabled'),
                            callback: (function(){ return function(){ $node.click(); }; })()
                        };
                        break;
                        
                    case 'checkbox':
                        item = {
                            type: 'checkbox',
                            disabled: !!$node.attr('disabled'),
                            name: $node.attr('label'),
                            selected: !!$node.attr('checked')
                        };
                        break;
                        
                    case 'radio':
                        item = {
                            type: 'radio',
                            disabled: !!$node.attr('disabled'),
                            name: $node.attr('label'),
                            radio: $node.attr('radiogroup'),
                            value: $node.attr('id'),
                            selected: !!$node.attr('checked')
                        };
                        break;
                        
                    default:
                        item = undefined;
                }
                break;
 
            case 'hr':
                item = '-------';
                break;
                
            case 'input':
                switch ($node.attr('type')) {
                    case 'text':
                        item = {
                            type: 'text',
                            name: label || inputLabel(node),
                            disabled: !!$node.attr('disabled'),
                            value: $node.val()
                        };
                        break;
                        
                    case 'checkbox':
                        item = {
                            type: 'checkbox',
                            name: label || inputLabel(node),
                            disabled: !!$node.attr('disabled'),
                            selected: !!$node.attr('checked')
                        };
                        break;
                        
                    case 'radio':
                        item = {
                            type: 'radio',
                            name: label || inputLabel(node),
                            disabled: !!$node.attr('disabled'),
                            radio: !!$node.attr('name'),
                            value: $node.val(),
                            selected: !!$node.attr('checked')
                        };
                        break;
                    
                    default:
                        item = undefined;
                        break;
                }
                break;
                
            case 'select':
                item = {
                    type: 'select',
                    name: label || inputLabel(node),
                    disabled: !!$node.attr('disabled'),
                    selected: $node.val(),
                    options: {}
                };
                $node.children().each(function(){
                    item.options[this.value] = $(this).text();
                });
                break;
                
            case 'textarea':
                item = {
                    type: 'textarea',
                    name: label || inputLabel(node),
                    disabled: !!$node.attr('disabled'),
                    value: $node.val()
                };
                break;
            
            case 'label':
                break;
            
            default:
                item = {type: 'html', html: $node.clone(true)};
                break;
        }
        
        if (item) {
            counter++;
            items['key' + counter] = item;
        }
    });
    
    return counter;
}

// convert html5 menu
$.contextMenu.fromMenu = function(element) {
    var $this = $(element),
        items = {};
        
    menuChildren(items, $this.children());
    
    return items;
};

// make defaults accessible
$.contextMenu.defaults = defaults;
$.contextMenu.types = types;
// export internal functions - undocumented, for hacking only!
$.contextMenu.handle = handle;
$.contextMenu.op = op;
$.contextMenu.menus = menus;

})(jQuery);

});
