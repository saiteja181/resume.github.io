import { ILoadFeatures, FeaturesLoaderSymbol } from '@wix/thunderbolt-features'
import { ProviderCreator } from '@wix/thunderbolt-ioc'
import {
	PageAssetsLoaderSymbol,
	IPageAssetsLoader,
	FeatureStateSymbol,
	ExperimentsSymbol,
	Experiments,
} from '@wix/thunderbolt-symbols'
import { IFeatureState } from 'thunderbolt-feature-state'
import { createPageContainer, createPageReflector } from './pageUtils'
import { name } from './symbols'
import type { IPageReflector, PageState } from './types'
import { yieldToMain } from '@wix/thunderbolt-commons'

export const LogicalReflector: ProviderCreator<IPageReflector> = (container) => {
	const pageAssetsLoader = container.get<IPageAssetsLoader>(PageAssetsLoaderSymbol)
	const featuresLoader = container.get<ILoadFeatures>(FeaturesLoaderSymbol)
	const experiments = container.get<Experiments>(ExperimentsSymbol)
	const featureState = container.getNamed<IFeatureState<PageState>>(FeatureStateSymbol, name)

	return async (contextId: string, pageId: string = contextId) => {
		const reflectors = featureState.get()
		if (contextId in reflectors) {
			return reflectors[contextId]
		}
		if (experiments['specs.thunderbolt.yield_to_main_in_client']) {
			await yieldToMain()
		}
		const pageContainer = await createPageContainer({
			pageId,
			contextId,
			container,
			pageAssetsLoader,
			featuresLoader,
			experiments,
		})

		return createPageReflector(pageContainer)
	}
}
