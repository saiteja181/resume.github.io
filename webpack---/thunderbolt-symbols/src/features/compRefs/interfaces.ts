import type { CompRef, CompRefPromise } from './types'
import { IAppWillMountHandler } from '../thunderbolt/LifeCycle'

export type AddCompRefById = (compId: string, compRef: CompRef) => void
export type GetCompRefById = (compId: string) => CompRefPromise
export type CompRefAPI = {
	getCompRefById: GetCompRefById
}

export const CompRefAPISym = Symbol.for('GetCompRefById')

export interface ICyclicTabbing extends IAppWillMountHandler {
	enableCyclicTabbing(cyclicTabbingParentCompIds: Array<string> | string): void
	disableCyclicTabbing(cyclicTabbingParentCompIds: Array<string> | string): void
}
