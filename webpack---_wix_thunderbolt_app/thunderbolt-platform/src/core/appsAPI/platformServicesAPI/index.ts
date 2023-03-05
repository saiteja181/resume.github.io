import _ from 'lodash'
import { ManagerSlave } from '@wix/bsi-manager'
import { createFedopsLogger } from '@wix/thunderbolt-commons'
import type { ViewerPlatformEssentials } from '@wix/fe-essentials-viewer-platform'
import type { PlatformServicesAPI, PlatformEnvData, SessionServiceAPI } from '@wix/thunderbolt-symbols'
import { biFactory } from './bi'
import { monitoringFactory } from './monitoring'
import { platformBiLoggerFactory } from '../../bi/biLoggerFactory'
import { createBatchQueue } from '@wix/fe-essentials-viewer-platform/bi'
import type { BaseFactory } from '@wix/thunderbolt-logger'
import type { FedopsLogger } from '@wix/fe-essentials-viewer-platform/fedops'

type CreateLoggerFactoriesParams = {
	biLoggerFactoriesCreator: ReturnType<typeof platformBiLoggerFactory>
	_createFedopsLogger: ViewerPlatformEssentials['createFedopsLogger']
	shouldBatchBiForApp: boolean
	bsiManager: ManagerSlave
	biData: PlatformEnvData['bi']
	appParams: { appDefinitionId: string; instanceId: string }
	viewMode: string
}
type CreateLoggerFactoriesForApp = (params: CreateLoggerFactoriesParams) => { biLoggerFactory: () => BaseFactory; fedOpsLoggerFactory: FedopsLogger<string> }

const createLoggerFactoriesForApp: CreateLoggerFactoriesForApp = ({
	biLoggerFactoriesCreator,
	bsiManager,
	biData,
	_createFedopsLogger,
	appParams: { appDefinitionId, instanceId },
	shouldBatchBiForApp,
	viewMode,
}) => {
	const appDefaults = {
		_appId: appDefinitionId,
		_instanceId: instanceId,
	}
	const biBaseFactory = () => {
		const base = biLoggerFactoriesCreator
			.createBaseBiLoggerFactory()
			.withNonEssentialContext({
				bsi: () => bsiManager.getBsi(),
			})
			.updateDefaults(appDefaults)
		if (shouldBatchBiForApp) {
			const batchQueueBi = createBatchQueue()
			base.setGlobalBatchQueue(batchQueueBi)
		}
		return base
	}

	const fedopsBiLoggerFactory = biLoggerFactoriesCreator
		.createBiLoggerFactoryForFedops()
		.withNonEssentialContext({
			bsi: () => bsiManager.getBsi({ extend: false }),
		})
		.updateDefaults(appDefaults)

	if (shouldBatchBiForApp) {
		const batchQueueFedops = createBatchQueue()
		fedopsBiLoggerFactory.setGlobalBatchQueue(batchQueueFedops)
	}

	const fedOpsLoggerFactory = createFedopsLogger({
		biLoggerFactory: fedopsBiLoggerFactory,
		customParams: {
			isMobileFriendly: biData.isMobileFriendly,
			viewerName: 'thunderbolt',
			viewMode,
		},
		paramsOverrides: { is_rollout: biData.rolloutData.isTBRollout },
		factory: _createFedopsLogger,
	})

	return { biLoggerFactory: biBaseFactory, fedOpsLoggerFactory }
}

export const createPlatformAppServicesApi = ({
	platformEnvData: {
		bi: biData,
		document: { referrer },
		location,
		site,
		topology,
	},
	appDefinitionId,
	instanceId,
	csrfToken,
	bsiManager,
	sessionService,
	essentials,
}: {
	platformEnvData: PlatformEnvData
	appDefinitionId: string
	instanceId: string
	csrfToken: string
	bsiManager: ManagerSlave
	sessionService: SessionServiceAPI
	essentials: ViewerPlatformEssentials
}): PlatformServicesAPI => {
	const viewMode = biData.isPreview ? ('preview' as const) : ('site' as const)

	const shouldBatchBiForApp = Boolean(site.experiments['specs.thunderbolt.batchAppsBiAndFedops'])

	const biLoggerFactoriesCreator = platformBiLoggerFactory({ sessionService, biData, location, site, factory: essentials.biLoggerFactory })

	const { biLoggerFactory, fedOpsLoggerFactory } = createLoggerFactoriesForApp({
		biLoggerFactoriesCreator,
		_createFedopsLogger: essentials.createFedopsLogger,
		biData,
		shouldBatchBiForApp,
		bsiManager,
		appParams: { appDefinitionId, instanceId },
		viewMode,
	})

	const bi = biFactory({ biData, metaSiteId: location.metaSiteId, viewMode, sessionService })
	const monitoring = monitoringFactory({ url: biData.pageData.pageUrl, viewMode, viewerVersion: biData.viewerVersion, referrer })
	const appEssentials = essentials.createAppEssentials({
		appDefId: appDefinitionId,
		getLoggerForWidget: fedOpsLoggerFactory.getLoggerForWidget.bind(fedOpsLoggerFactory),
		biLoggerFactory,
	})

	return {
		getCsrfToken: () => csrfToken,
		bi,
		biLoggerFactory,
		fedOpsLoggerFactory,
		reportTrace: _.noop,
		monitoring,
		essentials: appEssentials,
		topology,
	}
}
