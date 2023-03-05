import type { IocContainer } from '@wix/thunderbolt-ioc'
import type { RendererProps } from 'feature-react-renderer'
import type { Environment } from '@wix/thunderbolt-environment'
import { createEnvLoader } from '@wix/thunderbolt-environment'
import {
	BIReporter,
	DynamicSessionModel,
	FeatureName,
	IFetchApi,
	ILogger,
	IPageAssetsLoader,
	IRenderer,
	MasterPageFeatureConfigSymbol,
	PageAssetsLoaderSymbol,
	RendererSymbol,
	DynamicModelSymbol,
} from '@wix/thunderbolt-symbols'
import { taskify } from '@wix/thunderbolt-commons'
import type { IThunderbolt, IThunderboltInitializer } from './types'
import { Thunderbolt } from './symbols'

const RENDERER_FEATURES: Set<FeatureName> = new Set([
	'renderer',
	'ooi',
	'componentsLoader',
	'stores',
	'translations',
	'businessLogger',
	'assetsLoader',
	'sessionManager',
	'consentPolicy',
	'commonConfig',
	'componentsReact',
	'router',
	'navigationManager',
	'warmupData',
	'thunderboltInitializer',
])

const loadMasterPageFeaturesConfigs = async (container: IocContainer) => {
	// This adds the master page structure and props to the fetchCache
	const assetsLoader = container.get<IPageAssetsLoader>(PageAssetsLoaderSymbol)
	const siteFeaturesConfigs = await assetsLoader.load('masterPage').siteFeaturesConfigs

	Object.entries(siteFeaturesConfigs).forEach(([featureName, featureConfig]) => {
		container.bind(MasterPageFeatureConfigSymbol).toConstantValue(featureConfig).whenTargetNamed(featureName)
	})
}

const loadDynamicModel = ({ biReporter, logger }: { biReporter: BIReporter; logger: ILogger; fetchApi: IFetchApi }) => {
	const applyModelData = ({ visitorId, siteMemberId }: DynamicSessionModel) => {
		biReporter.setDynamicSessionData({ visitorId, siteMemberId })
	}
	const onDynamicModelError = (e: Error, attempt: number) =>
		logger.captureError(e, {
			tags: { fetchFail: 'dynamicModel' },
			extra: { errorMessage: e.message, attempt },
		})

	return window.dynamicModelPromise
		.then((dynamicModel) => {
			applyModelData(dynamicModel as DynamicSessionModel)
			return dynamicModel
		})
		.catch((err) => {
			onDynamicModelError(err, 1)

			window.dynamicModelPromise = window.fetchDynamicModel()
			return window.dynamicModelPromise
				.then((dynamicModel) => {
					applyModelData(dynamicModel as DynamicSessionModel)
					return dynamicModel
				})
				.catch((e) => {
					onDynamicModelError(e, 2)
				})
		}) as Promise<DynamicSessionModel>
}

export const getThunderboltInitializer = (container: IocContainer): IThunderboltInitializer => {
	let environment: Environment | null = null

	const initializer: IThunderboltInitializer = {
		getRenderer: async <T>() => {
			const { specificEnvFeaturesLoaders, biReporter, viewerModel, fetchApi, logger } = environment!
			try {
				logger.phaseStarted(`loadSiteFeatures_renderFeaturesOnly`)
				await taskify(() =>
					specificEnvFeaturesLoaders.loadSiteFeatures(
						container,
						viewerModel.siteFeatures.filter((x) => RENDERER_FEATURES.has(x))
					)
				)
				logger.phaseEnded(`loadSiteFeatures_renderFeaturesOnly`)
				logger.phaseStarted(`loadMasterPageFeaturesConfigs`)
				await taskify(() => loadMasterPageFeaturesConfigs(container))
				logger.phaseEnded(`loadMasterPageFeaturesConfigs`)
				if (process.env.browser) {
					logger.phaseStarted(`loadDynamicModel`)
					const dynamicModel = await taskify(() => loadDynamicModel({ biReporter, logger, fetchApi }))
					container.bind(DynamicModelSymbol).toConstantValue(dynamicModel)
					logger.phaseEnded(`loadDynamicModel`)
				}
			} catch (e) {
				logger.captureError(e, { tags: { phase: 'get_renderer' }, groupErrorsBy: 'values' })
				throw e
			}
			return container.get<IRenderer<RendererProps, T>>(RendererSymbol)
		},
		loadEnvironment: (env) => {
			environment = env
			container.load(createEnvLoader(environment))
		},
		loadSiteFeatures: async () => {
			const { viewerModel, specificEnvFeaturesLoaders, logger } = environment!
			logger.phaseStarted(`loadSiteFeatures`)
			await taskify(() =>
				specificEnvFeaturesLoaders.loadSiteFeatures(
					container,
					viewerModel.siteFeatures.filter((x) => !RENDERER_FEATURES.has(x))
				)
			)
			logger.phaseEnded(`loadSiteFeatures`)
		},
		getThunderboltInvoker: async <T extends IThunderbolt>() => {
			return async () => {
				const { logger } = environment!
				logger.phaseStarted(`container_get_thunderbolt`)
				const thunderbolt = await taskify(() => container.get<T>(Thunderbolt))
				logger.phaseEnded(`container_get_thunderbolt`)
				logger.phaseStarted(`thunderbolt_ready`)
				await taskify(() => thunderbolt.ready())
				logger.phaseEnded(`thunderbolt_ready`)
				return thunderbolt
			}
		},
	}

	return initializer
}
