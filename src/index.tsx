/* eslint-disable @typescript-eslint/no-explicit-any */
type BasicType =
  | 'any'
  | 'boolean'
  | 'bigint'
  | 'null'
  | 'number'
  | 'object'
  | 'string'
  | 'symbol'
  | 'undefined'
  | 'unknown'

type UnpackBasicType<T extends BasicType> = T extends 'any'
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  : T extends 'boolean'
  ? boolean
  : T extends 'bigint'
  ? bigint
  : T extends 'null'
  ? null
  : T extends 'number'
  ? number
  : T extends 'object'
  ? // eslint-disable-next-line @typescript-eslint/ban-types
    object
  : T extends 'string'
  ? string
  : T extends 'symbol'
  ? symbol
  : T extends 'undefined'
  ? undefined
  : T extends 'unknown'
  ? unknown
  : never

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface GuardRecord extends Record<PropertyKey, GuardRecord | GuardTuple | Guard<any>> {}

type GuardTuple = [] | (GuardRecord | Guard<any>)[]

type Guard<T extends unknown> = ((input: unknown) => input is T) & {
  or: <U extends BasicType | GuardRecord | Guard<any> | GuardTuple>(
    t: U
  ) => Guard<T | UnpackType<U>>
  orArray: <U extends BasicType | GuardRecord | Guard<any> | GuardTuple>(
    t: U
  ) => Guard<T | UnpackType<U>[]>
}

type OrType =
  | BasicType
  | GuardRecord
  | GuardTuple
  | Guard<any>
  | ['every', BasicType | GuardRecord | GuardTuple | Guard<any>]

type UnpackType<T extends unknown> = T extends BasicType
  ? UnpackBasicType<T>
  : T extends GuardRecord | GuardTuple
  ? { [key in keyof T]: UnpackType<T[key]> }
  : T extends Guard<infer V>
  ? V
  : never

const arrayMarker = 'every'

const getBasicTypeGuard = (t: BasicType) => {
  switch (t) {
    case 'any':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (_: unknown): _ is any => true
    case 'boolean':
      return (v: unknown): v is boolean => typeof v === 'boolean'
    case 'bigint':
      return (v: unknown): v is bigint => typeof v === 'bigint'
    case 'null':
      return (v: unknown): v is null => v === null
    case 'number':
      return (v: unknown): v is number => typeof v === 'number'
    case 'object':
      // eslint-disable-next-line @typescript-eslint/ban-types
      return (v: unknown): v is object => typeof v === 'object'
    case 'string':
      return (v: unknown): v is string => typeof v === 'string'
    case 'symbol':
      return (v: unknown): v is symbol => typeof v === 'symbol'
    case 'undefined':
      return (v: unknown): v is undefined => v === undefined
    case 'unknown':
      return (_: unknown): _ is unknown => true
  }
}

const isTypeValid = (t: OrType, input: unknown): boolean => {
  // Basic type
  if (typeof t === 'string') {
    return getBasicTypeGuard(t)(input)
  }
  // Guard
  if (typeof t === 'function') {
    return t(input)
  }
  // Array or Tuple
  if (Array.isArray(t)) {
    if (!Array.isArray(input)) {
      return false
    }
    // Array
    if (t[0] === arrayMarker) {
      return input.every(el => isTypeValid(t[1]!, el))
    }
    // Tuple
    for (let i = 0; i < t.length; ++i) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      if (!isTypeValid((t as any[])[i], input[i])) {
        return false
      }
    }
    return true
  }
  // Guard record
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof t === 'object' && t !== null) {
    if (typeof input !== 'object' || input === null) {
      return false
    }
    for (const k of Object.keys(t)) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      if (!isTypeValid((t as GuardRecord)[k], (input as Record<PropertyKey, unknown>)[k])) {
        return false
      }
    }
    return true
  }
  return false
}

const createGuard = <T extends unknown>(orTypes: OrType[]) => {
  const guard: Guard<T> = (input: unknown): input is T =>
    orTypes.some(orType => {
      return isTypeValid(orType, input)
    })
  guard.or = createOr<T>(orTypes)
  guard.orArray = createOrArray<T>(orTypes)
  return guard
}

const createOr = <TPrev extends unknown>(orTypes: OrType[]) => <
  TNew extends BasicType | GuardRecord | GuardTuple | Guard<any>
>(
  t: TNew
): Guard<TPrev | UnpackType<TNew>> => {
  orTypes.push(t)
  return createGuard<TPrev | UnpackType<TNew>>(orTypes)
}

const createOrArray = <TPrev extends unknown>(orTypes: OrType[]) => <
  TNew extends BasicType | GuardRecord | GuardTuple | Guard<any>
>(
  t: TNew
): Guard<TPrev | UnpackType<TNew>[]> => {
  orTypes.push([arrayMarker, t])
  return createGuard<TPrev | UnpackType<TNew>[]>(orTypes)
}

export const is = <T extends BasicType | GuardRecord | GuardTuple | Guard<any>>(
  t: T
): Guard<UnpackType<T>> => {
  const orTypes: OrType[] = [t]
  return createGuard<UnpackType<T>>(orTypes)
}

export const isArray = <T extends BasicType | GuardRecord | GuardTuple | Guard<any>>(
  t: T
): Guard<UnpackType<T>[]> => {
  const orTypes: OrType[] = [[arrayMarker, t]]
  return createGuard<UnpackType<T>[]>(orTypes)
}

export const isBoolean = is('boolean')
export const isBigint = is('bigint')
export const isNull = is('null')
export const isNumber = is('number')
export const isObject = is('object')
export const isString = is('string')
export const isSymbol = is('symbol')
export const isUndefined = is('undefined')

export const isBooleanOrUndefined = isBoolean.or('undefined')
export const isBigintOrUndefined = isBigint.or('undefined')
export const isNullOrUndefined = isNull.or('undefined')
export const isNumberOrUndefined = isNumber.or('undefined')
export const isObjectOrUndefined = isObject.or('undefined')
export const isStringOrUndefined = isString.or('undefined')
export const isSymbolOrUndefined = isSymbol.or('undefined')
