import { FeatureStateSymbol, IPageWillMountHandler, ViewMode, ViewModeSym } from '@wix/thunderbolt-symbols'
import { IFeatureState } from 'thunderbolt-feature-state'
import { named, withDependencies } from '@wix/thunderbolt-ioc'
import { name } from './symbols'
import type { AnimationsPageState, IAnimations } from './types'
import { taskify, createPromise } from '@wix/thunderbolt-commons'
import { AnimatorManager } from './types'

export const AnimationsInit = withDependencies(
	[named(FeatureStateSymbol, name), ViewModeSym],
	(featureState: IFeatureState<AnimationsPageState>, viewMode: ViewMode): IPageWillMountHandler & IAnimations => {
		const managers = featureState.get()?.managers
		const { promise, resolver } = createPromise<{
			animatorManager: AnimatorManager
			effectManager: AnimatorManager
		}>()

		if (!managers) {
			featureState.update(() => ({
				managers: promise,
			}))
		}

		return {
			name: 'animationsInit',
			pageWillMount() {
				if (!managers) {
					const managersPromise = import(
						'./animatorManagerFactory' /* webpackChunkName: "animatorManagerFactory" */
					).then(({ createAnimatorManager }) =>
						taskify(() => ({
							animatorManager: createAnimatorManager(viewMode),
							effectManager: createAnimatorManager('motion'),
						}))
					)
					resolver(managersPromise)
				}
			},
			getInstance() {
				return featureState.get().managers.then(({ animatorManager }) => animatorManager)
			},
			getEffectsInstance() {
				return featureState.get().managers.then(({ effectManager }) => effectManager)
			},
		}
	}
)
