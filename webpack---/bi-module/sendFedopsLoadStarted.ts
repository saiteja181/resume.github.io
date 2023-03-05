import { isBot, sendBeacon, isSuspectedBot, isIFrame, extractCachingData } from '@wix/thunderbolt-environment'

//	eslint-disable-next-line
;(function () {
	const { site, rollout, fleetConfig, requestUrl, isInSEO, frogOnUserDomain } = window.fedops.data
	const btype = isBot(window) || isIFrame() || isSuspectedBot() || (isInSEO ? 'seo' : '')
	const ish = !!btype
	const { isCached, caching, microPop } = extractCachingData()
	const types = {
		WixSite: 1,
		UGC: 2,
		Template: 3,
	}
	const st = types[site.siteType] || 0
	const fedOpsAppName = site.isResponsive ? 'thunderbolt-responsive' : 'thunderbolt'
	const { isDACRollout, siteAssetsVersionsRollout } = rollout
	const is_dac_rollout = isDACRollout ? 1 : 0
	const is_sav_rollout = siteAssetsVersionsRollout ? 1 : 0
	const is_rollout = fleetConfig.code === 0 || fleetConfig.code === 1 ? fleetConfig.code : null
	const ts = Date.now() - window.initialTimestamps.initialTimestamp
	const tsn = Math.round(performance.now()) // client only
	const { visibilityState } = document
	const pageVisibilty = visibilityState
	const { fedops, addEventListener, thunderboltVersion } = window
	fedops.apps = fedops.apps || {}
	fedops.apps[fedOpsAppName] = { startLoadTime: tsn }
	fedops.sessionId = site.sessionId
	fedops.vsi = uuidv4()
	fedops.is_cached = isCached
	fedops.phaseStarted = reportPhase(28)
	fedops.phaseEnded = reportPhase(22)

	fedops.reportError = (error: any) => {
		const info = error?.reason || error?.message
		if (info) {
			sendBI(26, `&errorInfo=${info}&errorType=load`)
		} else {
			error.preventDefault()
		}
	}
	addEventListener('error', fedops.reportError)
	addEventListener('unhandledrejection', fedops.reportError)

	let bfcache = false
	addEventListener(
		'pageshow',
		({ persisted }) => {
			if (persisted) {
				if (!bfcache) {
					bfcache = true
					fedops.is_cached = true
				}
			}
		},
		true
	)

	function sendBI(evid: number, extra = '') {
		if (requestUrl.includes('suppressbi=true')) {
			return
		}
		const frog = frogOnUserDomain ? site.externalBaseUrl.replace(/^https?:\/\//, '') + '/_frog' : '//frog.wix.com'
		const url =
			frog +
			'/bolt-performance?src=72&evid=' +
			evid +
			'&appName=' +
			fedOpsAppName +
			'&is_rollout=' +
			is_rollout +
			'&is_sav_rollout=' +
			is_sav_rollout +
			'&is_dac_rollout=' +
			is_dac_rollout +
			'&dc=' +
			site.dc +
			(microPop ? '&microPop=' + microPop : '') +
			'&is_cached=' +
			isCached +
			'&msid=' +
			site.metaSiteId +
			'&session_id=' +
			window.fedops.sessionId +
			'&ish=' +
			ish +
			'&isb=' +
			ish +
			(ish ? '&isbr=' + btype : '') +
			'&vsi=' +
			window.fedops.vsi +
			'&caching=' +
			caching +
			(bfcache ? ',browser_cache' : '') +
			'&pv=' +
			pageVisibilty +
			'&pn=1' +
			'&v=' +
			thunderboltVersion +
			'&url=' +
			encodeURIComponent(requestUrl) +
			'&st=' +
			st +
			`&ts=${ts}&tsn=${tsn}` +
			extra
		sendBeacon(url)
	}

	function uuidv4() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
			const r = (Math.random() * 16) | 0,
				v = c === 'x' ? r : (r & 0x3) | 0x8
			return v.toString(16)
		})
	}

	function reportPhase(evid: number) {
		return (phase: string, extra?: { paramsOverrides?: { [key: string]: string } }) => {
			const duration = Date.now() - ts
			const baseParams = `&name=${phase}&duration=${duration}`
			const extraParams =
				extra && extra.paramsOverrides
					? Object.keys(extra.paramsOverrides)
							// @ts-ignore ts does not recognize the if before
							.map((key) => key + '=' + extra.paramsOverrides[key])
							.join('&')
					: ''
			sendBI(evid, extraParams ? `${baseParams}&${extraParams}` : baseParams)
		}
	}

	/* We don't want to send BI in deprecation flow */
	if (window.__browser_deprecation__) {
		return
	}
	sendBI(21, `&platformOnSite=${window.fedops.data.platformOnSite}`)
})()
