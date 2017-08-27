
export interface PropertyDescriptor {
    name: string,
    type: PropertyType
}

export interface EntityDescriptor {
    constructor: Constructor
    properties: PropertyDescriptor[],
    schemaPrototype: any
}

export type Constructor = { new (): {} }
export type PropertyType = EntityDescriptor | 'string' | 'number'

class ProbeMock {
    constructor(public count: number, public type: PropertyType) { }
}

var entities: { [n: string]: EntityDescriptor } = { }


export function Table(constructor: { new(): any }) {
    scanEntity(constructor)
}

var areProbing = false

var stack: {
    entity: EntityDescriptor,
    currentPropertyIndex: 0
}[] = []

function getStackTop() { return stack[stack.length - 1] }


export function defString(): string {
    if (!areProbing) return ''
    var top = getStackTop()
    return new ProbeMock(top.currentPropertyIndex++, 'string') as any as string
}

export function defReference<T>(constructor: { new(): T }): T {
    if (!areProbing) return new constructor()
    var top = getStackTop()
    return new ProbeMock(top.currentPropertyIndex++, entities[constructor.name]) as any as T
}

function getSchemaPrototypeForEntity(name: string) {
    return entities[name].schemaPrototype
}

function scanEntity(constructor: { new(): any }) {
    var schemaPrototype = Object.create(null)
    var entity = { constructor, properties: [], schemaPrototype }
    stack.push({ entity, currentPropertyIndex: 0 })
    areProbing = true
    try {
        var mock = new constructor()

        var properties = []

        for (var prop in mock) {
            var value = mock[prop] as PropertyType
            if (value instanceof ProbeMock) {
                properties[value.count] = { name: prop, type: value.type }

                if (value.type === 'string' || value.type === 'number') {
                    schemaPrototype[prop] = null
                } else {
                    var name = value.type.constructor.name
                    Object.defineProperty(schemaPrototype, prop, { get: function () { return getSchemaPrototypeForEntity(name) } })
                }
            }
        }

        entities[constructor.name] = entity
    }
    finally {
        areProbing = false
        stack.pop()
    }
}
