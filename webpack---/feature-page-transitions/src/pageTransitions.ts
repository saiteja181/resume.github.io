import { withDependencies, named } from '@wix/thunderbolt-ioc'
import { FeatureStateSymbol, IPropsStore, Props } from '@wix/thunderbolt-symbols'
import type { PageTransitionsDidMountFactory } from './types'
import { name, PageTransitionsCompletedSymbol } from './symbols'

const pageTransitionsDidMountFactory: PageTransitionsDidMountFactory = (
	pageTransitionsCompleted,
	featureState,
	propsStore: IPropsStore
) => {
	return {
		name: 'pageTransitions',
		pageWillMount() {
			const state = featureState.get()
			propsStore.update({
				SITE_PAGES: {
					isPageBeforeMount: true,
					isPageAfterMount: false,
					isFirstMount: state?.isFirstMount,
				},
			})
		},
		pageDidMount(pageId) {
			const state = featureState.get()

			if (state?.isFirstMount ?? true) {
				pageTransitionsCompleted.notifyPageTransitionsCompleted(pageId)
			}

			propsStore.update({
				SITE_PAGES: {
					isPageAfterMount: true,
					isPageBeforeMount: false,
				},
			})

			featureState.update((current) => ({
				...current,
				isFirstMount: false,
			}))
		},
		pageWillUnmount({ contextId }) {
			// release propStore subscription
			featureState.get()?.propsUpdateListenersUnsubscribers?.[contextId]?.()
			featureState.update((currentState) => {
				const propsUpdateListenersUnsubscribers = currentState?.propsUpdateListenersUnsubscribers ?? {}
				delete propsUpdateListenersUnsubscribers[contextId]
				return {
					...currentState,
					propsUpdateListenersUnsubscribers,
				}
			})
		},
	}
}

export const PageTransitionsDidMount = withDependencies(
	[PageTransitionsCompletedSymbol, named(FeatureStateSymbol, name), Props],
	pageTransitionsDidMountFactory
)
