import { ILoadFeatures } from '@wix/thunderbolt-features'
import { Identifier, IocContainer } from '@wix/thunderbolt-ioc'
import {
	contextIdSymbol,
	Experiments,
	FeaturesConfig,
	IPageAssetsLoader,
	PageFeatureConfigSymbol,
	pageIdSym,
} from '@wix/thunderbolt-symbols'
import type { IPageReflector } from './types'
import { yieldToMain } from '@wix/thunderbolt-commons'

const bindFeaturesConfig = (container: IocContainer, featuresConfig: FeaturesConfig) => {
	Object.keys(featuresConfig).forEach((key) => {
		container
			.bind(PageFeatureConfigSymbol)
			.toConstantValue(featuresConfig[key as keyof FeaturesConfig])
			.whenTargetNamed(key)
	})
}

export const createPageContainer = async ({
	container,
	pageId,
	contextId,
	pageAssetsLoader,
	featuresLoader,
	experiments,
}: {
	container: IocContainer
	pageId: string
	contextId: string
	pageAssetsLoader: IPageAssetsLoader
	featuresLoader: ILoadFeatures
	experiments: Experiments
}) => {
	if (experiments['specs.thunderbolt.yield_to_main_in_client']) {
		await yieldToMain()
	}
	const { features, props } = await pageAssetsLoader.load(pageId)
	if (experiments['specs.thunderbolt.yield_to_main_in_client']) {
		await yieldToMain()
	}
	const pageContainer = container.createChild()
	await featuresLoader.loadPageFeatures(pageContainer, await features)
	bindFeaturesConfig(pageContainer, await props)

	pageContainer.bind<string>(pageIdSym).toConstantValue(pageId)
	pageContainer.bind<string>(contextIdSymbol).toConstantValue(contextId)

	return pageContainer
}

export const createPageReflector = (
	pageContainer: IocContainer,
	masterPageReflector?: IPageReflector
): IPageReflector => ({
	getAllImplementersOf<T>(identifier: Identifier): Array<T> {
		const pageInstances = pageContainer.getAll<T>(identifier)
		const masterPageInstance = masterPageReflector ? masterPageReflector.getAllImplementersOf<T>(identifier) : []
		return [...masterPageInstance, ...pageInstances]
	},
	getAllImplementersOnPageOf<T>(identifier: symbol): Array<T> {
		return pageContainer.getAll<T>(identifier)
	},
})
