export interface ProxySchema {
    properties: string[]

    proxyPrototype: object

    getPropertySchema(name: string): ProxySchema
}

export function getTrivialProxySchema(proxyPrototype: object): ProxySchema {
    return {
        properties: [],
        proxyPrototype: proxyPrototype,
        getPropertySchema(name: string): ProxySchema { throw "Internal error: Trivial schema has no properties." }
    }
}

export function createProxy(schema: ProxySchema) {
    var x: PropertyDescriptorMap
    var proxy = Object.create(schema.proxyPrototype)
    for (var prop of schema.properties) {
        var getter = function() { return createProxy(schema.getPropertySchema(prop)) }
        Object.defineProperty(proxy, prop, { get: getter })
    }
    return proxy
}
