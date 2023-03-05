import { named, withDependencies } from '@wix/thunderbolt-ioc'
import { Experiments, ExperimentsSymbol, SiteFeatureConfigSymbol } from '@wix/thunderbolt-symbols'
import {
	BuildTpaSrcOptions,
	ITpaSrcBuilder,
	name as tpaCommonsName,
	TpaCommonsSiteConfig,
	TpaSrcBuilderSymbol,
} from 'feature-tpa-commons'
import type { ITpaComponentApi } from './types'
import * as ResponsiveChatUtils from './utils/responsiveChatUtils'
import _ from 'lodash'

export const TpaComponentApi = withDependencies(
	[named(SiteFeatureConfigSymbol, tpaCommonsName), TpaSrcBuilderSymbol, ExperimentsSymbol],
	(
		tpaCommonsSiteConfig: TpaCommonsSiteConfig,
		tpaSrcBuilder: ITpaSrcBuilder,
		experiments: Experiments
	): ITpaComponentApi => ({
		buildSrc({ compId, tpaCompData, pageId, tpaInnerRouteConfig }) {
			const { widgetsClientSpecMapData, deviceType } = tpaCommonsSiteConfig
			const templateOrUniqueId = ResponsiveChatUtils.getTemplateOrUniqueId(compId, tpaCompData)
			const { widgetId } = tpaCompData

			const { widgetUrl, mobileUrl } = widgetsClientSpecMapData[widgetId]

			const baseUrl = deviceType === 'mobile' ? mobileUrl || widgetUrl : widgetUrl

			// If the component is a responsive chat - change the page id to masterPage, to be consistent on every navigation
			const overridePageId = ResponsiveChatUtils.isResponsiveChat(tpaCompData) ? 'masterPage' : pageId

			const options: Partial<BuildTpaSrcOptions> = {}

			if (
				experiments['specs.thunderbolt.AddSectionURLToTPA']
					? !_.isEmpty(tpaInnerRouteConfig)
					: tpaCompData.isSection
			) {
				options.tpaInnerRouteConfig = tpaInnerRouteConfig
			}
			return tpaSrcBuilder.buildSrc(templateOrUniqueId, overridePageId, tpaCompData, baseUrl, options)
		},
		getDefaultProps(widgetId, iframeStartedLoadingCallback, widgetUnresponsiveCallback) {
			const { widgetsClientSpecMapData, isMobileView } = tpaCommonsSiteConfig
			const { appDefinitionName, appDefinitionId, appPage, allowScrolling } = widgetsClientSpecMapData[widgetId]
			return {
				title: appPage.name ?? appDefinitionName,
				appDefinitionName,
				appDefinitionId,
				isMobileView,
				allowScrolling,
				reportIframeStartedLoading: iframeStartedLoadingCallback,
				reportWidgetUnresponsive: widgetUnresponsiveCallback,
			}
		},
	})
)
