import { ViewMode } from '@wix/thunderbolt-symbols'
import { TweenEngine, AnimationsKit } from '@wix/animations-kit'
import { getAnimatorManager } from './animations'
import gsap from 'gsap'
import ScrollToPlugin from 'gsap/ScrollToPlugin'

export const createAnimatorManager = (viewMode: ViewMode | 'motion') => {
	const isMotion = viewMode === 'motion'
	const animationViewMode = isMotion ? undefined : viewMode
	const plugins = isMotion ? [] : [ScrollToPlugin]
	const tweenEngineAndFactory = new TweenEngine(gsap, plugins)
	const animator = new AnimationsKit(tweenEngineAndFactory, undefined, animationViewMode, isMotion)

	return getAnimatorManager(animator)
}
