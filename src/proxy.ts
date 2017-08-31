export class ProxySchema {
    target: any

    proxyPrototype: any

    process: (proxy: any) => void

    getPropertySchema?: (name: string) => ProxySchema
}

export function createProxy(schema: ProxySchema) {
    var proxy = Object.create(schema.proxyPrototype)
    schema.process(proxy)
    if (schema.target) {
        for (var prop in schema.target) {
            let propCopy = prop
            if (schema.getPropertySchema) {
                let getPropertySchema = schema.getPropertySchema
                var getter = function() { return createProxy(getPropertySchema(propCopy)) }
                Object.defineProperty(proxy, prop, { get: getter })
            }
            else {
                proxy[prop] = schema.target[prop]
            }
        }
    }
    return proxy
}
