import _ from 'lodash'
// wix code and blocks viewer apps expects regeneratorRuntime to be defined :/
// https://wix.slack.com/archives/CKDB50KE2/p1655630884212889
// https://wix.slack.com/archives/CGJREGM7B/p1653330082949059
import 'regenerator-runtime/runtime'
import type { ModuleLoader } from '@wix/thunderbolt-symbols'
import type { FactoryOrNull, ModuleFactory, ScriptCache } from './types'
import { fetchEval } from './fetchEval'
import { createPromise } from '@wix/thunderbolt-commons'

declare let self: DedicatedWorkerGlobalScope & {
	define?: ((nameOrDependencies: string | Array<string>, dependenciesOrFactory: Array<string> | Function, factory?: Function) => void) & { amd?: boolean }
}

type ResolveDepsOptions = { url: string; moduleDependenciesIds: Array<string>; dependencies: Record<string, unknown> }
type ResolveDeps = (options: ResolveDepsOptions) => Array<unknown>
const isFactoryDefined = (factory: unknown): factory is ModuleFactory => typeof factory === 'function'

export default function ({ scriptsCache }: { scriptsCache: ScriptCache }): ModuleLoader {
	const defaultDependencies: { [name: string]: unknown } = {
		lodash: _,
		_,
		'wix-data': { default: { dsn: 'https://b58591105c1c42be95f1e7a3d5b3755e@sentry.io/286440' } },
	}

	const resolveDeps: ResolveDeps = ({ url, moduleDependenciesIds, dependencies }) => {
		if (dependencies.globals) {
			/** Temporary fix for blocks viewer app - since they use the wix-code-bundler and it does not pass the "globals" string as deps we will inject it
			 	until they pass "globals" to the dependency list (and then it will be resoled automatically with the code below)
			 	more info here: https://wix.slack.com/archives/C02SQCQ5G1J/p1644349623037979?thread_ts=1644340840.426809&cid=C02SQCQ5G1J
			 */
			return [dependencies.globals]
		}
		return moduleDependenciesIds.map((id: string) => {
			if (!(id in dependencies)) {
				throw new Error(`Module "${url}" dependency "${id}" is missing from provided dependencies map`)
			}
			return dependencies[id]
		})
	}

	const createModuleInstance = (amdModuleFactory: FactoryOrNull, { url, dependencies }: Omit<ResolveDepsOptions, 'moduleDependenciesIds'>) => {
		if (isFactoryDefined(amdModuleFactory)) {
			const deps = resolveDeps({ url, dependencies, moduleDependenciesIds: amdModuleFactory.moduleDependenciesIds || [] })
			return amdModuleFactory(...deps)
		}
		// Module bundle wasn't resolved to a factory, but to null
		return null
	}

	return {
		loadModule: async (url, moduleDependencies = {}) => {
			const dependencies = { ...defaultDependencies, ...moduleDependencies }
			// When a module is requested during the fetch of the first,
			// we return a promise that would resolve to an instance for every caller
			const cached = scriptsCache[url]
			if (cached) {
				return createModuleInstance(await cached, { url, dependencies })
			}

			const { promise: currentLoadModulePromise, resolver } = createPromise<FactoryOrNull>()
			scriptsCache[url] = currentLoadModulePromise

			let moduleFactory: FactoryOrNull = null

			const defineAmdGlobals = () => {
				self.define = (nameOrDependenciesIds: string | Array<string>, dependenciesIdsOrFactory: Array<string> | Function, factory: Function | undefined) => {
					const isNamedDefine = _.isString(nameOrDependenciesIds)
					// const moduleName = isNamedDefine ? args[0] : null
					const moduleDependenciesIds = ((isNamedDefine ? dependenciesIdsOrFactory : nameOrDependenciesIds) || []) as Array<string>
					const amdModuleFactory = (isNamedDefine ? factory : dependenciesIdsOrFactory) as ModuleFactory
					// save factory for caching
					moduleFactory = amdModuleFactory
					// save moduleDependenciesIds to use it when moduleFactory is cached.
					moduleFactory.moduleDependenciesIds = moduleDependenciesIds
				}

				self.define.amd = true
			}
			const cleanupAmdGlobals = () => (self.define = undefined)

			const fetchModule = () => fetchEval(url, { beforeEval: defineAmdGlobals, afterEval: cleanupAmdGlobals })

			try {
				await fetchModule()
			} catch {
				await fetchModule() // retry
			} finally {
				resolver(moduleFactory)
			}
			return createModuleInstance(await currentLoadModulePromise, { url, dependencies })
		},
	}
}
