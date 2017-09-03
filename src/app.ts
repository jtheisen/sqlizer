import { MemberExpression, ElementExpression, sqlify } from './expression';
import {
    asSet,
    ConcreteSqlElement,
    ConcreteSqlSet,
    constant,
    count,
    crossJoin,
    defineTable,
    fetchOnly,
    from,
    groupBy,
    having,
    join,
    leftJoin,
    not,
    orderBy,
    orderByDesc,
    outerApply,
    query,
    SqlElement,
    SqlSet,
    trim,
    where,
} from './fluent';
import * as tape from 'tape';
import 'reflect-metadata';

// Schema definitions.

function toMany<T>(ctor: { new (): T }): T[] {
    var result: any = []
    result.elementConstructor = ctor
    return result
}

class Order {
    orderNo = ''
    isCancelled = false
    
    invoices = toMany(Invoice)
}

class Invoice {
    invoiceNo = ''
    orderNo = ''
    createdAt = ''
    isCancelled = false

    order = new Order()
}

class SomeEntity {
    untrimmed = ''
}

var invoices = defineTable("invoices", new Invoice())
var orders = defineTable("orders", new Order())
var someTable = defineTable("someTable", new SomeEntity())


// Now let's do some "queries"!

function processQuery<T>(set: ConcreteSqlSet<T>)
{
    console.info(sqlify(set.expression))
}

processQuery(query(() => {
    var o = from(orders);
    var i = join(invoices).on(i => o.orderNo.eq(i.orderNo));

    return { ono: o.orderNo, ino: i.invoiceNo, extra: i.order.orderNo };
}))

processQuery(query(() => {
    var o = from(orders);
    var i = from(o.invoices)
    
    return { ono: o.orderNo, ino: i.invoiceNo };
}))

processQuery(query(() => {
    const o = from(orders);
    const i = from(o.invoices)

    where(not(o.isCancelled.eq(0)))

    return { o, i };
}))

processQuery(query(() => {
    const i = from(invoices)

    where(not(i.isCancelled.eq(0)))

    groupBy(i.orderNo)

    having(count().gt(0))

    orderBy(i.orderNo)

    return { orderNo: i.orderNo, count: count() }
}))

processQuery(query(() => {
    const r = from(someTable);
    const trimmed = trim(r.untrimmed);

    orderBy(trimmed)

    return { trimmed };
}))

processQuery(query(() => {
    const o = from(orders);

    const i = outerApply(query(() => {
        const i2 = from(invoices);
        where(i2.orderNo.eq(o.orderNo))
        fetchOnly(1)
        return i2
    }))

    return { o, i };
}))

processQuery(query(() => {
    const orderNoWithInvoiceCount = query(() => {
        const i = from(invoices);
        groupBy(i.orderNo);
        return { orderNo: i.orderNo, numberOfInvoices: count() }
    })
    const { orderNo, numberOfInvoices } = from(orderNoWithInvoiceCount)
    const latestInvoice = outerApply(query(() => {
        const i2 = from(invoices)
        where(i2.orderNo.eq(orderNo))
        orderByDesc(i2.createdAt)
        fetchOnly(1)
        return i2
    }))

    return { orderNo, numberOfInvoices, latestInvoice };
}))
