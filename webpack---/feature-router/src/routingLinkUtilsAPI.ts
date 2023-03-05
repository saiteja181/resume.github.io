import _ from 'lodash'
import { withDependencies, named } from '@wix/thunderbolt-ioc'
import { CurrentRouteInfoSymbol, SiteFeatureConfigSymbol } from '@wix/thunderbolt-symbols'
import { name, UrlHistoryManagerSymbol } from './symbols'
import type { ICurrentRouteInfo, IRoutingConfig, IRoutingLinkUtilsAPI, IUrlHistoryManager } from './types'
import { resolveUrl } from './resolveUrl'

const RoutingLinkUtilsAPIFactory = (
	routingConfig: IRoutingConfig,
	urlHistoryManager: IUrlHistoryManager,
	currentRouteInfo: ICurrentRouteInfo
): IRoutingLinkUtilsAPI => {
	return {
		getLinkUtilsRoutingInfo() {
			const { pageId } =
				currentRouteInfo.getCurrentRouteInfo() ||
				resolveUrl(urlHistoryManager.getParsedUrl().href, routingConfig)

			const { mainPageId, pagesMap, routes, pageIdToPrefix, baseUrl } = routingConfig
			return {
				mainPageId,
				pages: pagesMap,
				routes: _.omitBy(routes, (__, key) => key === './'),
				pageIdToPrefix,
				pageId: pageId!,
				relativeUrl: urlHistoryManager.getRelativeUrl(),
				externalBaseUrl: baseUrl,
			}
		},
	}
}
export const RoutingLinkUtilsAPI = withDependencies(
	[named(SiteFeatureConfigSymbol, name), UrlHistoryManagerSymbol, CurrentRouteInfoSymbol],
	RoutingLinkUtilsAPIFactory
)
