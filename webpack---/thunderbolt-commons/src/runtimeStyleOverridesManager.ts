import { BrowserWindow } from '@wix/thunderbolt-symbols'

export type CssOverrides = { [prop: string]: string }

export const getRuntimeStyleOverridesManager = () => {
	const stylePropertiesToRestore: { [selector: string]: CssOverrides } = {}

	const styleOverrides = {
		setItemCssOverrides: (cssOverrides: CssOverrides, selector: string, window: NonNullable<BrowserWindow>) => {
			const node = window.document.querySelector<HTMLElement>(selector)
			if (node) {
				stylePropertiesToRestore[selector] = stylePropertiesToRestore[selector] || {}
				Object.keys(cssOverrides).forEach((prop) => {
					if (typeof stylePropertiesToRestore[selector][prop] === 'undefined') {
						// first override of this prop - save the original value to restore it later
						stylePropertiesToRestore[selector][prop] = node.style.getPropertyValue(prop)
					}
				})
				Object.assign(node.style, cssOverrides)
			}
		},
		clearItemCssOverrides: (selector: string, window: NonNullable<BrowserWindow>) => {
			const itemOverridesOriginalValues = stylePropertiesToRestore[selector]
			if (!itemOverridesOriginalValues) {
				return
			}

			const node = window.document.querySelector<HTMLElement>(selector)
			if (node) {
				Object.entries(itemOverridesOriginalValues).forEach(([prop, originalValue]) => {
					node.style.setProperty(prop, originalValue)
				})

				if (node.getAttribute('style') === '') {
					node.removeAttribute('style')
				}
			}

			delete stylePropertiesToRestore[selector]
		},
		clearAllItemsCssOverrides: (window: NonNullable<BrowserWindow>) => {
			Object.keys(stylePropertiesToRestore).forEach((selector) => {
				styleOverrides.clearItemCssOverrides(selector, window)
			})
		},
	}

	return styleOverrides
}
