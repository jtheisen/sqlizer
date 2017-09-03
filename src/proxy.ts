export class ProxySchema {
    target: any

    proxyPrototype: any

    process: (proxy: any) => void

    shouldIgnoreProperty: (name: string) => boolean = () => false

    getPropertySchema?: (name: string) => ProxySchema
}

export function createProxy(schema: ProxySchema) {
    var proxy = Object.create(schema.proxyPrototype)
    if (schema.target) {
        for (var prop in schema.target) {
            if (!schema.shouldIgnoreProperty(prop))
            {
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
    }
    schema.process(proxy)
    return proxy
}
