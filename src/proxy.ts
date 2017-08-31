export interface ProxySchema {
    properties: string[]

    proxyPrototype: object

    process(proxy: any): void

    getPropertySchema(name: string): ProxySchema
}

export function getTrivialProxySchema(proxyPrototype: object): ProxySchema {
    return {
        properties: [],
        proxyPrototype: proxyPrototype,
        process(proxy: any): void { },
        getPropertySchema(name: string): ProxySchema { throw "Internal error: Trivial schema has no properties." }
    }
}

export function createProxy(schema: ProxySchema) {
    var proxy = Object.create(schema.proxyPrototype)
    schema.process(proxy)
    for (var prop of schema.properties) {
        let propCopy = prop
        var getter = function() { return createProxy(schema.getPropertySchema(propCopy)) }
        Object.defineProperty(proxy, prop, { get: getter })
    }
    return proxy
}
